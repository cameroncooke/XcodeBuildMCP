import { existsSync } from 'node:fs';
import { log } from './logger.ts';

export type SessionDefaults = {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
  configuration?: string;
  simulatorName?: string;
  simulatorId?: string;
  deviceId?: string;
  useLatestOS?: boolean;
  arch?: 'arm64' | 'x86_64';
};

class SessionStore {
  private defaults: SessionDefaults = {};

  setDefaults(partial: Partial<SessionDefaults>): void {
    // Validate file paths exist before storing (skip empty strings as they're valid placeholders)
    if (
      partial.projectPath &&
      partial.projectPath.trim() !== '' &&
      !existsSync(partial.projectPath)
    ) {
      throw new Error(
        `Invalid projectPath: ${partial.projectPath} does not exist. ` +
          `Provide a valid path to an existing .xcodeproj file.`,
      );
    }

    if (
      partial.workspacePath &&
      partial.workspacePath.trim() !== '' &&
      !existsSync(partial.workspacePath)
    ) {
      throw new Error(
        `Invalid workspacePath: ${partial.workspacePath} does not exist. ` +
          `Provide a valid path to an existing .xcworkspace file.`,
      );
    }

    // Validate mutual exclusivity if both provided in same call (skip empty strings)
    if (
      partial.projectPath &&
      partial.projectPath.trim() !== '' &&
      partial.workspacePath &&
      partial.workspacePath.trim() !== ''
    ) {
      throw new Error(
        'Cannot set both projectPath and workspacePath in session defaults. ' +
          'They are mutually exclusive. Set only one.',
      );
    }

    // Validate new value doesn't conflict with existing session state (skip empty strings)
    if (partial.projectPath && partial.projectPath.trim() !== '' && this.defaults.workspacePath) {
      throw new Error(
        'Session already has workspacePath set. Clear it first with: ' +
          'session-clear-defaults({ keys: ["workspacePath"] })',
      );
    }

    if (partial.workspacePath && partial.workspacePath.trim() !== '' && this.defaults.projectPath) {
      throw new Error(
        'Session already has projectPath set. Clear it first with: ' +
          'session-clear-defaults({ keys: ["projectPath"] })',
      );
    }

    this.defaults = { ...this.defaults, ...partial };
    log('info', `[Session] Defaults updated: ${Object.keys(partial).join(', ')}`);
  }

  clear(keys?: (keyof SessionDefaults)[]): void {
    if (keys == null) {
      this.defaults = {};
      log('info', '[Session] All defaults cleared');
      return;
    }
    if (keys.length === 0) {
      // No-op when an empty array is provided (e.g., empty UI selection)
      log('info', '[Session] No keys provided to clear; no changes made');
      return;
    }
    for (const k of keys) delete this.defaults[k];
    log('info', `[Session] Defaults cleared: ${keys.join(', ')}`);
  }

  get<K extends keyof SessionDefaults>(key: K): SessionDefaults[K] {
    return this.defaults[key];
  }

  getAll(): SessionDefaults {
    return { ...this.defaults };
  }
}

export const sessionStore = new SessionStore();
