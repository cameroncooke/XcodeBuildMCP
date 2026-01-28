import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createMockFileSystemExecutor } from '../../test-utils/mock-executors.ts';
import { loadProjectConfig, persistSessionDefaultsToProjectConfig } from '../project-config.ts';

const cwd = '/repo';
const configPath = path.join(cwd, '.xcodebuildmcp', 'config.yaml');
const configDir = path.join(cwd, '.xcodebuildmcp');

type MockWrite = { path: string; content: string };

type MockFsFixture = {
  fs: ReturnType<typeof createMockFileSystemExecutor>;
  writes: MockWrite[];
  mkdirs: string[];
};

function createFsFixture(options?: { exists?: boolean; readFile?: string }): MockFsFixture {
  const writes: MockWrite[] = [];
  const mkdirs: string[] = [];
  const exists = options?.exists ?? false;
  const readFileContent = options?.readFile;

  const fs = createMockFileSystemExecutor({
    existsSync: (targetPath) => (targetPath === configPath ? exists : false),
    readFile: async (targetPath) => {
      if (targetPath !== configPath) {
        throw new Error(`Unexpected readFile path: ${targetPath}`);
      }
      if (readFileContent == null) {
        throw new Error('readFile called but no readFile content was provided');
      }
      return readFileContent;
    },
    writeFile: async (targetPath, content) => {
      writes.push({ path: targetPath, content });
    },
    mkdir: async (targetPath) => {
      mkdirs.push(targetPath);
    },
  });

  return { fs, writes, mkdirs };
}

describe('project-config', () => {
  describe('loadProjectConfig', () => {
    it('should return found=false when config does not exist', async () => {
      const { fs } = createFsFixture({ exists: false });
      const result = await loadProjectConfig({ fs, cwd });
      expect(result).toEqual({ found: false });
    });

    it('should normalize mutual exclusivity and resolve relative paths', async () => {
      const yaml = [
        'schemaVersion: 1',
        'sessionDefaults:',
        '  projectPath: "./App.xcodeproj"',
        '  workspacePath: "./App.xcworkspace"',
        '  simulatorName: "iPhone 16"',
        '  simulatorId: "SIM-1"',
        '  derivedDataPath: "./.derivedData"',
        '',
      ].join('\n');

      const { fs } = createFsFixture({ exists: true, readFile: yaml });
      const result = await loadProjectConfig({ fs, cwd });

      if (!result.found) throw new Error('expected config to be found');

      const defaults = result.config.sessionDefaults ?? {};
      expect(defaults.workspacePath).toBe(path.join(cwd, 'App.xcworkspace'));
      expect(defaults.projectPath).toBeUndefined();
      expect(defaults.simulatorId).toBe('SIM-1');
      expect(defaults.simulatorName).toBeUndefined();
      expect(defaults.derivedDataPath).toBe(path.join(cwd, '.derivedData'));
      expect(result.notices.length).toBeGreaterThan(0);
    });

    it('should return an error result when schemaVersion is unsupported', async () => {
      const yaml = ['schemaVersion: 2', 'sessionDefaults:', '  scheme: "App"', ''].join('\n');
      const { fs } = createFsFixture({ exists: true, readFile: yaml });

      const result = await loadProjectConfig({ fs, cwd });
      expect(result.found).toBe(false);
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should return an error result when YAML does not parse to an object', async () => {
      const { fs } = createFsFixture({ exists: true, readFile: '- item' });

      const result = await loadProjectConfig({ fs, cwd });
      expect(result.found).toBe(false);
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.message).toBe('Project config must be an object');
      }
    });
  });

  describe('persistSessionDefaultsToProjectConfig', () => {
    it('should merge patches, delete exclusive keys, and preserve unknown sections', async () => {
      const yaml = [
        'schemaVersion: 1',
        'sessionDefaults:',
        '  scheme: "Old"',
        '  simulatorName: "OldSim"',
        'server:',
        '  enabledWorkflows:',
        '    - simulator',
        '',
      ].join('\n');

      const { fs, writes, mkdirs } = createFsFixture({ exists: true, readFile: yaml });

      await persistSessionDefaultsToProjectConfig({
        fs,
        cwd,
        patch: { scheme: 'New', simulatorId: 'SIM-1' },
        deleteKeys: ['simulatorName'],
      });

      expect(mkdirs).toContain(configDir);
      expect(writes.length).toBe(1);
      expect(writes[0].path).toBe(configPath);

      const parsed = parseYaml(writes[0].content) as {
        schemaVersion: number;
        sessionDefaults?: Record<string, unknown>;
        server?: { enabledWorkflows?: string[] };
      };

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.sessionDefaults?.scheme).toBe('New');
      expect(parsed.sessionDefaults?.simulatorId).toBe('SIM-1');
      expect(parsed.sessionDefaults?.simulatorName).toBeUndefined();
      expect(parsed.server?.enabledWorkflows).toEqual(['simulator']);
    });

    it('should overwrite invalid existing config with a minimal valid config', async () => {
      const { fs, writes } = createFsFixture({ exists: true, readFile: '- not-an-object' });

      await persistSessionDefaultsToProjectConfig({
        fs,
        cwd,
        patch: { scheme: 'App' },
      });

      expect(writes.length).toBe(1);
      const parsed = parseYaml(writes[0].content) as {
        schemaVersion: number;
        sessionDefaults?: Record<string, unknown>;
      };

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.sessionDefaults?.scheme).toBe('App');
    });
  });
});
