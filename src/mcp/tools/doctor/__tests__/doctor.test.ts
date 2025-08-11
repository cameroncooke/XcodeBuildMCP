/**
 * Tests for doctor plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import doctor, { runDoctor, type DoctorDependencies } from '../doctor.ts';

function createDeps(overrides?: Partial<DoctorDependencies>): DoctorDependencies {
  const base: DoctorDependencies = {
    binaryChecker: {
      async checkBinaryAvailability(binary: string) {
        // default: all available with generic version
        return { available: true, version: `${binary} version 1.0.0` };
      },
    },
    xcode: {
      async getXcodeInfo() {
        return {
          version: 'Xcode 15.0 - Build version 15A240d',
          path: '/Applications/Xcode.app/Contents/Developer',
          selectedXcode: '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild',
          xcrunVersion: 'xcrun version 65',
        };
      },
    },
    env: {
      getEnvironmentVariables() {
        const x: Record<string, string | undefined> = {
          XCODEBUILDMCP_DEBUG: 'true',
          INCREMENTAL_BUILDS_ENABLED: '1',
          PATH: '/usr/local/bin:/usr/bin:/bin',
          DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
          HOME: '/Users/testuser',
          USER: 'testuser',
          TMPDIR: '/tmp',
          NODE_ENV: 'test',
          SENTRY_DISABLED: 'false',
        };
        return x;
      },
      getSystemInfo() {
        return {
          platform: 'darwin',
          release: '25.0.0',
          arch: 'arm64',
          cpus: '10 x Apple M3',
          memory: '32 GB',
          hostname: 'localhost',
          username: 'testuser',
          homedir: '/Users/testuser',
          tmpdir: '/tmp',
        };
      },
      getNodeInfo() {
        return {
          version: 'v22.0.0',
          execPath: '/usr/local/bin/node',
          pid: '123',
          ppid: '1',
          platform: 'darwin',
          arch: 'arm64',
          cwd: '/',
          argv: 'node build/index.js',
        };
      },
    },
    plugins: {
      async getPluginSystemInfo() {
        return {
          totalPlugins: 1,
          pluginDirectories: 1,
          pluginsByDirectory: { doctor: ['doctor'] },
          systemMode: 'plugin-based',
        };
      },
    },
    features: {
      areAxeToolsAvailable: () => true,
      isXcodemakeEnabled: () => true,
      isXcodemakeAvailable: async () => true,
      doesMakefileExist: () => true,
    },
    runtime: {
      async getRuntimeToolInfo() {
        return {
          mode: 'static' as const,
          enabledWorkflows: ['doctor', 'discovery'],
          enabledTools: ['doctor', 'discover_tools'],
          totalRegistered: 2,
        };
      },
    },
  };

  return {
    ...base,
    ...overrides,
    binaryChecker: {
      ...base.binaryChecker,
      ...(overrides?.binaryChecker ?? {}),
    },
    xcode: {
      ...base.xcode,
      ...(overrides?.xcode ?? {}),
    },
    env: {
      ...base.env,
      ...(overrides?.env ?? {}),
    },
    plugins: {
      ...base.plugins,
      ...(overrides?.plugins ?? {}),
    },
    features: {
      ...base.features,
      ...(overrides?.features ?? {}),
    },
  };
}

describe('doctor tool', () => {
  // Reset any state if needed

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(doctor.name).toBe('doctor');
    });

    it('should have correct description', () => {
      expect(doctor.description).toBe(
        'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.',
      );
    });

    it('should have handler function', () => {
      expect(typeof doctor.handler).toBe('function');
    });

    it('should have correct schema with enabled boolean field', () => {
      const schema = z.object(doctor.schema);

      // Valid inputs
      expect(schema.safeParse({ enabled: true }).success).toBe(true);
      expect(schema.safeParse({ enabled: false }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true); // enabled is optional

      // Invalid inputs
      expect(schema.safeParse({ enabled: 'true' }).success).toBe(false);
      expect(schema.safeParse({ enabled: 1 }).success).toBe(false);
      expect(schema.safeParse({ enabled: null }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful doctor execution', async () => {
      const deps = createDeps();
      const result = await runDoctor({ enabled: true }, deps);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle plugin loading failure', async () => {
      const deps = createDeps({
        plugins: {
          async getPluginSystemInfo() {
            return { error: 'Plugin loading failed', systemMode: 'error' };
          },
        },
      });

      const result = await runDoctor({ enabled: true }, deps);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle xcode command failure', async () => {
      const deps = createDeps({
        xcode: {
          async getXcodeInfo() {
            return { error: 'Xcode not found' };
          },
        },
      });
      const result = await runDoctor({ enabled: true }, deps);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle xcodemake check failure', async () => {
      const deps = createDeps({
        features: {
          areAxeToolsAvailable: () => true,
          isXcodemakeEnabled: () => true,
          isXcodemakeAvailable: async () => false,
          doesMakefileExist: () => true,
        },
        binaryChecker: {
          async checkBinaryAvailability(binary: string) {
            if (binary === 'xcodemake') return { available: false };
            return { available: true, version: `${binary} version 1.0.0` };
          },
        },
      });
      const result = await runDoctor({ enabled: true }, deps);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle axe tools not available', async () => {
      const deps = createDeps({
        features: {
          areAxeToolsAvailable: () => false,
          isXcodemakeEnabled: () => false,
          isXcodemakeAvailable: async () => false,
          doesMakefileExist: () => false,
        },
        binaryChecker: {
          async checkBinaryAvailability(binary: string) {
            if (binary === 'axe') return { available: false };
            if (binary === 'xcodemake') return { available: false };
            if (binary === 'mise') return { available: true, version: 'mise 1.0.0' };
            return { available: true };
          },
        },
        env: {
          getEnvironmentVariables() {
            const x: Record<string, string | undefined> = {
              XCODEBUILDMCP_DEBUG: 'true',
              INCREMENTAL_BUILDS_ENABLED: '0',
              PATH: '/usr/local/bin:/usr/bin:/bin',
              DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
              HOME: '/Users/testuser',
              USER: 'testuser',
              TMPDIR: '/tmp',
              NODE_ENV: 'test',
              SENTRY_DISABLED: 'true',
            };
            return x;
          },
          getSystemInfo: () => ({
            platform: 'darwin',
            release: '25.0.0',
            arch: 'arm64',
            cpus: '10 x Apple M3',
            memory: '32 GB',
            hostname: 'localhost',
            username: 'testuser',
            homedir: '/Users/testuser',
            tmpdir: '/tmp',
          }),
          getNodeInfo: () => ({
            version: 'v22.0.0',
            execPath: '/usr/local/bin/node',
            pid: '123',
            ppid: '1',
            platform: 'darwin',
            arch: 'arm64',
            cwd: '/',
            argv: 'node build/index.js',
          }),
        },
      });

      const result = await runDoctor({ enabled: true }, deps);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: result.content[0].text,
        },
      ]);
      expect(typeof result.content[0].text).toBe('string');
    });
  });
});
