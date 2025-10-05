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
    this.defaults = { ...this.defaults, ...partial };
    log('info', `[Session] Defaults updated: ${Object.keys(partial).join(', ')}`);
  }

  clear(keys?: (keyof SessionDefaults)[]): void {
    if (!keys || keys.length === 0) {
      this.defaults = {};
      log('info', '[Session] All defaults cleared');
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
