import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import type { SimpleGit } from 'simple-git';
import { simpleGit } from 'simple-git';

import type { Services } from '../../container/container.js';

import { GitCloneError, GitCommitError, GitDiffError, GitPushError, GitWorktreeError } from './git.errors.js';

type TempKeyFile = {
  path: string;
  cleanup: () => Promise<void>;
};

const writeTempKeyFile = async (privateKey: string): Promise<TempKeyFile> => {
  const keyPath = path.join(os.tmpdir(), `builder-ssh-${createHash('sha256').update(privateKey).digest('hex').slice(0, 8)}`);
  await writeFile(keyPath, privateKey, { mode: 0o600 });
  await chmod(keyPath, 0o600);
  return {
    path: keyPath,
    cleanup: async () => {
      await rm(keyPath, { force: true });
    },
  };
};

const sshCommand = (keyPath: string): string =>
  `ssh -i ${keyPath} -o IdentityAgent=none -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;

const repoHash = (repoUrl: string, identityId: string): string =>
  createHash('sha256').update(`${identityId}:${repoUrl}`).digest('hex').slice(0, 16);

const createGit = (basePath?: string): SimpleGit => {
  const git = basePath ? simpleGit(basePath) : simpleGit();
  git.env('GIT_CONFIG_NOSYSTEM', '1');
  git.env('GIT_CONFIG_GLOBAL', '/dev/null');
  return git;
};

type EnsureBareCloneInput = {
  repoUrl: string;
  identityId: string;
  sshPrivateKey: string;
};

type CreateWorktreeInput = {
  bareRepoPath: string;
  worktreePath: string;
  branchName: string;
  ref: string;
};

type RemoveWorktreeInput = {
  bareRepoPath: string;
  worktreePath: string;
};

type CommitInput = {
  worktreePath: string;
  message: string;
  authorName: string;
  authorEmail: string;
};

type PushInput = {
  worktreePath: string;
  branch: string;
  sshPrivateKey: string;
};

type FetchInput = {
  bareRepoPath: string;
  sshPrivateKey: string;
};

type ChangedFile = {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath: string | null;
};

type GetChangedFilesInput = {
  worktreePath: string;
  baseRef: string;
  compareRef?: string;
};

type GetDiffInput = {
  worktreePath: string;
  baseRef: string;
  compareRef?: string;
  filePath?: string;
};

type GetFileHashInput = {
  worktreePath: string;
  filePath: string;
  ref?: string;
};

type GetFileContentInput = {
  worktreePath: string;
  filePath: string;
  ref?: string;
};

type ListBranchesInput = {
  bareRepoPath: string;
};

const parseStatusLetter = (letter: string): ChangedFile['status'] => {
  switch (letter[0]) {
    case 'A': return 'added';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    default: return 'modified';
  }
};

const parseNumstat = (raw: string): Map<string, { additions: number; deletions: number }> => {
  const map = new Map<string, { additions: number; deletions: number }>();
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const additions = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
    const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
    const filePath = parts.slice(2).join('\t');
    map.set(filePath, { additions, deletions });
  }
  return map;
};

const parseNameStatus = (
  raw: string,
  numstatMap: Map<string, { additions: number; deletions: number }>,
): ChangedFile[] => {
  const files: ChangedFile[] = [];
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const status = parseStatusLetter(parts[0]);
    const isRename = status === 'renamed' && parts.length >= 3;
    const filePath = isRename ? parts[2] : parts[1];
    const oldPath = isRename ? parts[1] : null;
    const stats = numstatMap.get(filePath) ?? { additions: 0, deletions: 0 };
    files.push({ path: filePath, status, additions: stats.additions, deletions: stats.deletions, oldPath });
  }
  return files;
};

const countUntrackedLines = async (git: SimpleGit, filePath: string): Promise<number> => {
  try {
    const raw = await git.raw(['diff', '--no-index', '--numstat', '--', '/dev/null', filePath]);
    const parts = raw.trim().split('\t');
    return parts[0] === '-' ? 0 : parseInt(parts[0], 10);
  } catch (error) {
    // git diff --no-index exits 1 when files differ; parse from error
    if (error instanceof Error) {
      const match = /^(\d+)\t/.exec(error.message);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  }
};

const getUntrackedFileDiff = async (git: SimpleGit, filePath: string): Promise<string> => {
  // `git diff --no-index` exits with code 1 when files differ, which
  // simple-git treats as an error. The diff output is embedded in the
  // error message, so we extract it from there.
  try {
    return await git.raw(['diff', '--no-index', '--', '/dev/null', filePath]);
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      const idx = msg.indexOf('diff --git');
      if (idx !== -1) {
        return msg.slice(idx);
      }
    }
    return '';
  }
};

class GitService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #dataDir(): string {
    return this.#services.config.session.dataDir;
  }

  ensureBareClone = async (input: EnsureBareCloneInput): Promise<string> => {
    const hash = repoHash(input.repoUrl, input.identityId);
    const bareRepoPath = path.join(this.#dataDir, 'repos', hash);

    const keyFile = await writeTempKeyFile(input.sshPrivateKey);
    try {
      await mkdir(bareRepoPath, { recursive: true });

      const git = createGit();
      git.env('GIT_SSH_COMMAND', sshCommand(keyFile.path));

      try {
        const existingGit = createGit(bareRepoPath);
        await existingGit.raw(['rev-parse', '--is-bare-repository']);
      } catch {
        await git.clone(input.repoUrl, bareRepoPath, ['--bare']);
      }

      return bareRepoPath;
    } catch (error) {
      throw new GitCloneError(
        error instanceof Error ? error.message : 'Failed to clone repository',
      );
    } finally {
      await keyFile.cleanup();
    }
  };

  fetch = async (input: FetchInput): Promise<void> => {
    const keyFile = await writeTempKeyFile(input.sshPrivateKey);
    try {
      const git = createGit(input.bareRepoPath);
      git.env('GIT_SSH_COMMAND', sshCommand(keyFile.path));
      await git.raw(['fetch', 'origin', '+refs/heads/*:refs/heads/*', '--prune']);
    } catch (error) {
      throw new GitCloneError(
        error instanceof Error ? error.message : 'Failed to fetch',
      );
    } finally {
      await keyFile.cleanup();
    }
  };

  createWorktree = async (input: CreateWorktreeInput): Promise<string> => {
    try {
      await mkdir(path.dirname(input.worktreePath), { recursive: true });

      const git = createGit(input.bareRepoPath);
      await git.raw(['worktree', 'add', '-b', input.branchName, input.worktreePath, input.ref]);

      // Configure upstream so `git push` targets the original branch
      const worktreeGit = createGit(input.worktreePath);
      await worktreeGit.raw(['config', `branch.${input.branchName}.remote`, 'origin']);
      await worktreeGit.raw(['config', `branch.${input.branchName}.merge`, `refs/heads/${input.ref}`]);

      return input.worktreePath;
    } catch (error) {
      throw new GitWorktreeError(
        error instanceof Error ? error.message : 'Worktree operation failed',
      );
    }
  };

  removeWorktree = async (input: RemoveWorktreeInput): Promise<void> => {
    try {
      const git = createGit(input.bareRepoPath);
      await git.raw(['worktree', 'remove', input.worktreePath, '--force']);
    } catch (error) {
      throw new GitWorktreeError(
        error instanceof Error ? error.message : 'Failed to remove worktree',
      );
    }
  };

  hasUncommittedChanges = async (input: { worktreePath: string }): Promise<boolean> => {
    try {
      const git = createGit(input.worktreePath);
      const status = await git.status();
      return !status.isClean();
    } catch (error) {
      throw new GitCommitError(
        error instanceof Error ? error.message : 'Failed to check status',
      );
    }
  };

  commit = async (input: CommitInput): Promise<string> => {
    try {
      const git = createGit(input.worktreePath);
      await git.raw(['config', 'user.name', input.authorName]);
      await git.raw(['config', 'user.email', input.authorEmail]);
      await git.raw(['config', 'commit.gpgsign', 'false']);
      await git.add('.');
      const result = await git.commit(input.message);
      return result.commit;
    } catch (error) {
      throw new GitCommitError(
        error instanceof Error ? error.message : 'Failed to commit',
      );
    }
  };

  push = async (input: PushInput): Promise<void> => {
    const keyFile = await writeTempKeyFile(input.sshPrivateKey);
    try {
      const git = createGit(input.worktreePath);
      git.env('GIT_SSH_COMMAND', sshCommand(keyFile.path));
      await git.push('origin', `HEAD:refs/heads/${input.branch}`);
    } catch (error) {
      throw new GitPushError(
        error instanceof Error ? error.message : 'Failed to push',
      );
    } finally {
      await keyFile.cleanup();
    }
  };

  getChangedFiles = async (input: GetChangedFilesInput): Promise<ChangedFile[]> => {
    try {
      const git = createGit(input.worktreePath);
      // When no explicit compareRef, diff baseRef against the working tree (captures
      // both committed and uncommitted changes). When compareRef is specified, use
      // three-dot merge-base diff between branches.
      const diffRange = input.compareRef
        ? `${input.baseRef}...${input.compareRef}`
        : input.baseRef;

      const [numstatRaw, nameStatusRaw] = await Promise.all([
        git.raw(['diff', '--numstat', diffRange]),
        git.raw(['diff', '--name-status', diffRange]),
      ]);

      const numstatMap = parseNumstat(numstatRaw);
      const files = parseNameStatus(nameStatusRaw, numstatMap);

      // Include untracked files when diffing against the working tree
      if (!input.compareRef) {
        const untrackedRaw = await git.raw([
          'ls-files', '--others', '--exclude-standard',
        ]);
        for (const line of untrackedRaw.split('\n')) {
          if (!line) continue;
          const additions = await countUntrackedLines(git, line);
          files.push({
            path: line,
            status: 'added',
            additions,
            deletions: 0,
            oldPath: null,
          });
        }
      }

      return files;
    } catch (error) {
      throw new GitDiffError(
        error instanceof Error ? error.message : 'Failed to get changed files',
      );
    }
  };

  getDiff = async (input: GetDiffInput): Promise<string> => {
    try {
      const git = createGit(input.worktreePath);
      const diffRange = input.compareRef
        ? `${input.baseRef}...${input.compareRef}`
        : input.baseRef;
      const args = ['diff', diffRange];
      if (input.filePath) {
        args.push('--', input.filePath);
      }
      let diff = await git.raw(args);

      // For working-tree diffs, append untracked file diffs
      if (!input.compareRef) {
        const untrackedRaw = await git.raw([
          'ls-files', '--others', '--exclude-standard',
        ]);
        const untrackedFiles = untrackedRaw.split('\n').filter((l) => l.length > 0);

        const filesToDiff = input.filePath
          ? untrackedFiles.filter((f) => f === input.filePath)
          : untrackedFiles;

        for (const file of filesToDiff) {
          diff += await getUntrackedFileDiff(git, file);
        }
      }

      return diff;
    } catch (error) {
      throw new GitDiffError(
        error instanceof Error ? error.message : 'Failed to get diff',
      );
    }
  };

  getFileHash = async (input: GetFileHashInput): Promise<string | null> => {
    try {
      const git = createGit(input.worktreePath);
      if (input.ref) {
        const hash = await git.raw(['rev-parse', `${input.ref}:${input.filePath}`]);
        return hash.trim();
      }
      // Hash the working tree version of the file
      const hash = await git.raw(['hash-object', input.filePath]);
      return hash.trim();
    } catch {
      return null;
    }
  };

  getFileContent = async (input: GetFileContentInput): Promise<string | null> => {
    try {
      if (input.ref) {
        const git = createGit(input.worktreePath);
        return await git.raw(['show', `${input.ref}:${input.filePath}`]);
      }
      return await readFile(path.join(input.worktreePath, input.filePath), 'utf-8');
    } catch {
      return null;
    }
  };

  getHead = async (input: { worktreePath: string }): Promise<string> => {
    try {
      const git = createGit(input.worktreePath);
      const sha = await git.raw(['rev-parse', 'HEAD']);
      return sha.trim();
    } catch (error) {
      throw new GitCommitError(
        error instanceof Error ? error.message : 'Failed to get HEAD',
      );
    }
  };

  resetHard = async (input: { worktreePath: string; ref: string }): Promise<void> => {
    try {
      const git = createGit(input.worktreePath);
      await git.raw(['reset', '--hard', input.ref]);
      await git.raw(['clean', '-fd']);
    } catch (error) {
      throw new GitCommitError(
        error instanceof Error ? error.message : 'Failed to reset',
      );
    }
  };

  listBranches = async (input: ListBranchesInput): Promise<string[]> => {
    try {
      const git = createGit(input.bareRepoPath);
      const raw = await git.raw(['branch', '--list', '--format=%(refname:short)']);
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      throw new GitDiffError(
        error instanceof Error ? error.message : 'Failed to list branches',
      );
    }
  };
}

export type {
  EnsureBareCloneInput,
  CreateWorktreeInput,
  RemoveWorktreeInput,
  CommitInput,
  PushInput,
  FetchInput,
  ChangedFile,
  GetChangedFilesInput,
  GetDiffInput,
  GetFileHashInput,
  GetFileContentInput,
  ListBranchesInput,
};
export { GitService, repoHash, writeTempKeyFile };
