import { log } from './logger.ts';

export type SessionDefaults = {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
  configuration?: string;
  simulatorName?: string;
  simulatorId?: string;
  simulatorPlatform?:
    | 'iOS Simulator'
    | 'watchOS Simulator'
    | 'tvOS Simulator'
    | 'visionOS Simulator';
  deviceId?: string;
  useLatestOS?: boolean;
  arch?: 'arm64' | 'x86_64';
  suppressWarnings?: boolean;
  derivedDataPath?: string;
  preferXcodebuild?: boolean;
  platform?: string;
  bundleId?: string;
};

class SessionStore {
  private defaults: SessionDefaults = {};
  private revision = 0;

  setDefaults(partial: Partial<SessionDefaults>): void {
    this.defaults = { ...this.defaults, ...partial };
    this.revision += 1;
    log('info', `[Session] Defaults updated: ${Object.keys(partial).join(', ')}`);
  }

  clear(keys?: (keyof SessionDefaults)[]): void {
    if (keys == null) {
      this.defaults = {};
      this.revision += 1;
      log('info', '[Session] All defaults cleared');
      return;
    }
    if (keys.length === 0) {
      // No-op when an empty array is provided (e.g., empty UI selection)
      log('info', '[Session] No keys provided to clear; no changes made');
      return;
    }
    for (const k of keys) delete this.defaults[k];
    this.revision += 1;
    log('info', `[Session] Defaults cleared: ${keys.join(', ')}`);
  }

  get<K extends keyof SessionDefaults>(key: K): SessionDefaults[K] {
    return this.defaults[key];
  }

  getAll(): SessionDefaults {
    return { ...this.defaults };
  }

  getRevision(): number {
    return this.revision;
  }

  setDefaultsIfRevision(partial: Partial<SessionDefaults>, expectedRevision: number): boolean {
    if (this.revision !== expectedRevision) {
      return false;
    }
    this.setDefaults(partial);
    return true;
  }
}

export const sessionStore = new SessionStore();
