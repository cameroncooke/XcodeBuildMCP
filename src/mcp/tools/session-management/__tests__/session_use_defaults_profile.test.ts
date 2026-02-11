import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { __resetConfigStoreForTests, initConfigStore } from '../../../../utils/config-store.ts';
import { createMockFileSystemExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import {
  handler,
  schema,
  sessionUseDefaultsProfileLogic,
} from '../session_use_defaults_profile.ts';

describe('session-use-defaults-profile tool', () => {
  beforeEach(() => {
    __resetConfigStoreForTests();
    sessionStore.clear();
  });

  const cwd = '/repo';
  const configPath = path.join(cwd, '.xcodebuildmcp', 'config.yaml');

  it('exports handler and schema', () => {
    expect(typeof handler).toBe('function');
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('activates a named profile', async () => {
    const result = await sessionUseDefaultsProfileLogic({ profile: 'ios' });
    expect(result.isError).toBe(false);
    expect(sessionStore.getActiveProfile()).toBe('ios');
    expect(sessionStore.listProfiles()).toContain('ios');
  });

  it('switches back to global profile', async () => {
    sessionStore.setActiveProfile('watch');
    const result = await sessionUseDefaultsProfileLogic({ global: true });
    expect(result.isError).toBe(false);
    expect(sessionStore.getActiveProfile()).toBeNull();
  });

  it('returns error when both global and profile are provided', async () => {
    const result = await sessionUseDefaultsProfileLogic({ global: true, profile: 'ios' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('either global=true or profile');
  });

  it('returns error when profile is missing and create=false', async () => {
    const result = await sessionUseDefaultsProfileLogic({ profile: 'macos', create: false });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('does not exist');
  });

  it('returns status for empty args', async () => {
    const result = await sessionUseDefaultsProfileLogic({});
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Active defaults profile: global');
  });

  it('persists active profile when persist=true', async () => {
    const writes: { path: string; content: string }[] = [];
    const fs = createMockFileSystemExecutor({
      existsSync: (targetPath: string) => targetPath === configPath,
      readFile: async () => ['schemaVersion: 1', ''].join('\n'),
      writeFile: async (targetPath: string, content: string) => {
        writes.push({ path: targetPath, content });
      },
    });
    await initConfigStore({ cwd, fs });

    const result = await sessionUseDefaultsProfileLogic({ profile: 'ios', persist: true });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Persisted active profile selection');
    expect(writes).toHaveLength(1);
    const parsed = parseYaml(writes[0].content) as { activeSessionDefaultsProfile?: string };
    expect(parsed.activeSessionDefaultsProfile).toBe('ios');
  });

  it('removes active profile from config when persisting global selection', async () => {
    const writes: { path: string; content: string }[] = [];
    const yaml = ['schemaVersion: 1', 'activeSessionDefaultsProfile: "ios"', ''].join('\n');
    const fs = createMockFileSystemExecutor({
      existsSync: (targetPath: string) => targetPath === configPath,
      readFile: async () => yaml,
      writeFile: async (targetPath: string, content: string) => {
        writes.push({ path: targetPath, content });
      },
    });
    await initConfigStore({ cwd, fs });

    const result = await sessionUseDefaultsProfileLogic({ global: true, persist: true });
    expect(result.isError).toBe(false);
    expect(writes).toHaveLength(1);
    const parsed = parseYaml(writes[0].content) as { activeSessionDefaultsProfile?: string };
    expect(parsed.activeSessionDefaultsProfile).toBeUndefined();
  });
});
