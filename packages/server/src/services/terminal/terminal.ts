import { EventEmitter } from 'node:events';
import os from 'node:os';

import { spawn } from 'node-pty';
import type { IPty } from 'node-pty';

import type { Services } from '../../container/container.js';
import { destroy } from '../../container/container.js';
import type { SessionRef } from '../session/session.js';
import { sessionKey } from '../session/session.js';
import { worktreePath } from '../session/session.runner.js';

import { TerminalAlreadyExistsError, TerminalNotFoundError } from './terminal.errors.js';

type TerminalInfo = {
  id: string;
  cols: number;
  rows: number;
  shell: string;
  cwd: string;
  createdAt: string;
};

type TerminalInstance = {
  info: TerminalInfo;
  pty: IPty;
  emitter: EventEmitter;
};

const terminalMapKey = (ref: SessionRef, terminalId: string): string =>
  `${sessionKey(ref)}/term/${terminalId}`;

const defaultShell = (): string => {
  if (os.platform() === 'win32') return 'powershell.exe';
  return process.env['SHELL'] || '/bin/sh';
};

class TerminalService {
  #services: Services;
  #terminals = new Map<string, TerminalInstance>();

  constructor(services: Services) {
    this.#services = services;
  }

  create = async (ref: SessionRef, terminalId: string, cols = 80, rows = 24): Promise<TerminalInfo> => {
    const key = terminalMapKey(ref, terminalId);

    if (this.#terminals.has(key)) {
      throw new TerminalAlreadyExistsError();
    }

    const cwd = await worktreePath(this.#services, ref);
    const shell = defaultShell();
    const emitter = new EventEmitter();

    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: process.env as Record<string, string>,
    });

    const info: TerminalInfo = {
      id: terminalId,
      cols,
      rows,
      shell,
      cwd,
      createdAt: new Date().toISOString(),
    };

    pty.onData((data) => {
      emitter.emit('data', data);
    });

    pty.onExit(({ exitCode }) => {
      emitter.emit('exit', exitCode);
      this.#terminals.delete(key);
    });

    this.#terminals.set(key, { info, pty, emitter });

    return info;
  };

  write = (ref: SessionRef, terminalId: string, data: string): void => {
    const instance = this.#resolve(ref, terminalId);
    instance.pty.write(data);
  };

  resize = (ref: SessionRef, terminalId: string, cols: number, rows: number): void => {
    const instance = this.#resolve(ref, terminalId);
    instance.pty.resize(cols, rows);
    instance.info.cols = cols;
    instance.info.rows = rows;
  };

  onData = (ref: SessionRef, terminalId: string, listener: (data: string) => void): (() => void) => {
    const instance = this.#resolve(ref, terminalId);
    instance.emitter.on('data', listener);
    return () => {
      instance.emitter.off('data', listener);
    };
  };

  onExit = (ref: SessionRef, terminalId: string, listener: (exitCode: number) => void): (() => void) => {
    const instance = this.#resolve(ref, terminalId);
    instance.emitter.on('exit', listener);
    return () => {
      instance.emitter.off('exit', listener);
    };
  };

  list = (ref: SessionRef): TerminalInfo[] => {
    const prefix = `${sessionKey(ref)}/term/`;
    const result: TerminalInfo[] = [];

    for (const [key, instance] of this.#terminals) {
      if (key.startsWith(prefix)) {
        result.push(instance.info);
      }
    }

    return result;
  };

  get = (ref: SessionRef, terminalId: string): TerminalInfo | undefined => {
    const key = terminalMapKey(ref, terminalId);
    return this.#terminals.get(key)?.info;
  };

  kill = (ref: SessionRef, terminalId: string): void => {
    const key = terminalMapKey(ref, terminalId);
    const instance = this.#terminals.get(key);
    if (!instance) return;

    instance.pty.kill();
    instance.emitter.removeAllListeners();
    this.#terminals.delete(key);
  };

  killAllForSession = (ref: SessionRef): void => {
    const prefix = `${sessionKey(ref)}/term/`;
    const toDelete: string[] = [];

    for (const [key, instance] of this.#terminals) {
      if (key.startsWith(prefix)) {
        instance.pty.kill();
        instance.emitter.removeAllListeners();
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.#terminals.delete(key);
    }
  };

  #resolve = (ref: SessionRef, terminalId: string): TerminalInstance => {
    const key = terminalMapKey(ref, terminalId);
    const instance = this.#terminals.get(key);
    if (!instance) {
      throw new TerminalNotFoundError();
    }
    return instance;
  };

  [destroy] = async (): Promise<void> => {
    for (const instance of this.#terminals.values()) {
      instance.pty.kill();
      instance.emitter.removeAllListeners();
    }
    this.#terminals.clear();
  };
}

export type { TerminalInfo, TerminalInstance };
export { TerminalService };
