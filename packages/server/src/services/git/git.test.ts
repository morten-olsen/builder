import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { simpleGit } from 'simple-git';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';

import { GitService } from './git.js';

describe('GitService', () => {
  let services: Services;
  let gitService: GitService;
  let tmpDir: string;
  let originRepoPath: string;

  beforeEach(async () => {
    process.env.GIT_CONFIG_NOSYSTEM = '1';
    process.env.GIT_CONFIG_GLOBAL = '/dev/null';
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'git-test-'));
    const config = createTestConfig({ session: { dataDir: tmpDir } });
    services = new Services(config);
    gitService = services.get(GitService);

    // Create a real origin repo (non-bare) to clone from using file:// protocol
    originRepoPath = path.join(tmpDir, 'origin');
    await mkdir(originRepoPath, { recursive: true });
    const originGit = simpleGit(originRepoPath)
      .env('GIT_CONFIG_NOSYSTEM', '1')
      .env('GIT_CONFIG_GLOBAL', '/dev/null');
    await originGit.raw(['init', '-b', 'main']);
    await originGit.addConfig('user.email', 'test@test.com');
    await originGit.addConfig('user.name', 'Test');
    await originGit.addConfig('commit.gpgsign', 'false');
    await writeFile(path.join(originRepoPath, 'README.md'), '# Test');
    await originGit.add('.');
    await originGit.commit('initial commit');
  });

  afterEach(async () => {
    delete process.env.GIT_CONFIG_NOSYSTEM;
    delete process.env.GIT_CONFIG_GLOBAL;
    await services[destroy]();
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('ensureBareClone', () => {
    it('clones a repository as bare', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused-for-file-protocol',
      });

      expect(bareRepoPath).toContain('repos');
      const git = simpleGit(bareRepoPath);
      const isBare = await git.raw(['rev-parse', '--is-bare-repository']);
      expect(isBare.trim()).toBe('true');
    });

    it('reuses existing bare clone', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const first = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });
      const second = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      expect(first).toBe(second);
    });
  });

  describe('createWorktree + removeWorktree', () => {
    it('creates and removes a worktree', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'test-session-1');
      const worktreeResult = await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/test-session-1',
        ref: 'main',
      });

      expect(worktreeResult).toBe(wtPath);

      const worktreeGit = simpleGit(wtPath);
      const log = await worktreeGit.log();
      expect(log.total).toBeGreaterThan(0);

      await gitService.removeWorktree({
        bareRepoPath,
        worktreePath: wtPath,
      });
    });
  });

  describe('getChangedFiles', () => {
    it('lists changed files in a worktree', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'diff-test-1');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/diff-test-1',
        ref: 'main',
      });

      // Make changes in the worktree
      const worktreeGit = simpleGit(wtPath)
        .env('GIT_CONFIG_NOSYSTEM', '1')
        .env('GIT_CONFIG_GLOBAL', '/dev/null');
      await worktreeGit.addConfig('user.email', 'test@test.com');
      await worktreeGit.addConfig('user.name', 'Test');
      await worktreeGit.addConfig('commit.gpgsign', 'false');
      await writeFile(path.join(wtPath, 'new-file.ts'), 'console.log("hello");');
      await writeFile(path.join(wtPath, 'README.md'), '# Updated');
      await worktreeGit.add('.');
      await worktreeGit.commit('add changes');

      const files = await gitService.getChangedFiles({
        worktreePath: wtPath,
        baseRef: 'main',
      });

      expect(files.length).toBeGreaterThanOrEqual(1);
      const paths = files.map((f) => f.path);
      expect(paths).toContain('new-file.ts');

      const newFile = files.find((f) => f.path === 'new-file.ts');
      expect(newFile?.status).toBe('added');
      expect(newFile?.additions).toBeGreaterThan(0);

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });

    it('includes untracked files', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'diff-test-untracked');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/diff-test-untracked',
        ref: 'main',
      });

      // Create untracked files (not git-added)
      await writeFile(path.join(wtPath, 'untracked.ts'), 'const x = 1;\n');
      await writeFile(path.join(wtPath, 'another.ts'), 'const y = 2;\nconst z = 3;\n');

      const files = await gitService.getChangedFiles({
        worktreePath: wtPath,
        baseRef: 'main',
      });

      const filePaths = files.map((f) => f.path);
      expect(filePaths).toContain('untracked.ts');
      expect(filePaths).toContain('another.ts');

      const untracked = files.find((f) => f.path === 'untracked.ts');
      expect(untracked?.status).toBe('added');

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });
  });

  describe('getDiff', () => {
    it('returns unified diff for all changes', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'diff-test-2');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/diff-test-2',
        ref: 'main',
      });

      const worktreeGit = simpleGit(wtPath)
        .env('GIT_CONFIG_NOSYSTEM', '1')
        .env('GIT_CONFIG_GLOBAL', '/dev/null');
      await worktreeGit.addConfig('user.email', 'test@test.com');
      await worktreeGit.addConfig('user.name', 'Test');
      await worktreeGit.addConfig('commit.gpgsign', 'false');
      await writeFile(path.join(wtPath, 'README.md'), '# Changed');
      await worktreeGit.add('.');
      await worktreeGit.commit('update readme');

      const diff = await gitService.getDiff({
        worktreePath: wtPath,
        baseRef: 'main',
      });

      expect(diff).toContain('README.md');
      expect(diff).toContain('-# Test');
      expect(diff).toContain('+# Changed');

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });

    it('returns diff for a single file', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'diff-test-3');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/diff-test-3',
        ref: 'main',
      });

      const worktreeGit = simpleGit(wtPath)
        .env('GIT_CONFIG_NOSYSTEM', '1')
        .env('GIT_CONFIG_GLOBAL', '/dev/null');
      await worktreeGit.addConfig('user.email', 'test@test.com');
      await worktreeGit.addConfig('user.name', 'Test');
      await worktreeGit.addConfig('commit.gpgsign', 'false');
      await writeFile(path.join(wtPath, 'README.md'), '# New');
      await writeFile(path.join(wtPath, 'other.txt'), 'other');
      await worktreeGit.add('.');
      await worktreeGit.commit('multi file change');

      const diff = await gitService.getDiff({
        worktreePath: wtPath,
        baseRef: 'main',
        filePath: 'README.md',
      });

      expect(diff).toContain('README.md');
      expect(diff).not.toContain('other.txt');

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });
  });

  describe('getFileHash', () => {
    it('returns hash for an existing file', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'hash-test-1');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/hash-test-1',
        ref: 'main',
      });

      const hash = await gitService.getFileHash({
        worktreePath: wtPath,
        filePath: 'README.md',
      });

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });

    it('returns null for a non-existent file', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const wtPath = path.join(tmpDir, 'worktrees', 'hash-test-2');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/hash-test-2',
        ref: 'main',
      });

      const hash = await gitService.getFileHash({
        worktreePath: wtPath,
        filePath: 'nonexistent.ts',
      });

      expect(hash).toBeNull();

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });
  });

  describe('listBranches', () => {
    it('lists branches in the bare repo', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      const branches = await gitService.listBranches({ bareRepoPath });

      expect(branches).toContain('main');
    });
  });

  describe('fetch', () => {
    it('fetches new commits from origin', async () => {
      const repoUrl = `file://${originRepoPath}`;
      const bareRepoPath = await gitService.ensureBareClone({
        repoUrl,
        identityId: 'test-identity',
        sshPrivateKey: 'unused',
      });

      // Add a new commit to origin
      const originGit = simpleGit(originRepoPath)
        .env('GIT_CONFIG_NOSYSTEM', '1')
        .env('GIT_CONFIG_GLOBAL', '/dev/null');
      await writeFile(path.join(originRepoPath, 'new.txt'), 'new');
      await originGit.add('.');
      await originGit.commit('second commit');

      await gitService.fetch({
        bareRepoPath,
        sshPrivateKey: 'unused',
      });

      // After fetch, create a worktree to verify the new commit is available
      const wtPath = path.join(tmpDir, 'worktrees', 'fetch-test');
      await gitService.createWorktree({
        bareRepoPath,
        worktreePath: wtPath,
        branchName: 'session/fetch-test',
        ref: 'main',
      });

      const worktreeGit = simpleGit(wtPath);
      const log = await worktreeGit.log();
      expect(log.total).toBe(2);

      await gitService.removeWorktree({ bareRepoPath, worktreePath: wtPath });
    });
  });
});
