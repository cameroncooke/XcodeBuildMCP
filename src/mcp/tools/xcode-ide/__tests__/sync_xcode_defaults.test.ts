import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { sessionStore } from '../../../../utils/session-store.ts';
import { createCommandMatchingMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { schema, syncXcodeDefaultsLogic } from '../sync_xcode_defaults.ts';

// Path to the example project (used as test fixture)
const EXAMPLE_PROJECT_PATH = join(process.cwd(), 'example_projects/iOS/MCPTest.xcodeproj');
const EXAMPLE_XCUSERSTATE = join(
  EXAMPLE_PROJECT_PATH,
  'project.xcworkspace/xcuserdata/johndoe.xcuserdatad/UserInterfaceState.xcuserstate',
);

describe('sync_xcode_defaults tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation', () => {
    it('should have schema object', () => {
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });
  });

  describe('syncXcodeDefaultsLogic', () => {
    it('returns error when no project found', async () => {
      const executor = createCommandMatchingMockExecutor({
        whoami: { output: 'testuser\n' },
        find: { output: '' },
      });

      const result = await syncXcodeDefaultsLogic({}, { executor, cwd: '/test/project' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to read Xcode IDE state');
    });

    it('returns error when xcuserstate file not found', async () => {
      const executor = createCommandMatchingMockExecutor({
        whoami: { output: 'testuser\n' },
        find: { output: '/test/project/MyApp.xcworkspace\n' },
        stat: { success: false, error: 'No such file' },
      });

      const result = await syncXcodeDefaultsLogic({}, { executor, cwd: '/test/project' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to read Xcode IDE state');
    });
  });

  describe('syncXcodeDefaultsLogic integration', () => {
    // These tests use the actual example project fixture

    it.skipIf(!existsSync(EXAMPLE_XCUSERSTATE))(
      'syncs scheme and simulator from example project',
      async () => {
        const simctlOutput = JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.xrOS-2-0': [
              { udid: 'B38FE93D-578B-454B-BE9A-C6FA0CE5F096', name: 'Apple Vision Pro' },
            ],
          },
        });

        const executor = createCommandMatchingMockExecutor({
          whoami: { output: 'johndoe\n' },
          find: { output: `${EXAMPLE_PROJECT_PATH}\n` },
          stat: { output: '1704067200\n' },
          'xcrun simctl': { output: simctlOutput },
          xcodebuild: { output: '    PRODUCT_BUNDLE_IDENTIFIER = io.sentry.MCPTest\n' },
        });

        const result = await syncXcodeDefaultsLogic(
          {},
          { executor, cwd: join(process.cwd(), 'example_projects/iOS') },
        );

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain('Synced session defaults from Xcode IDE');
        expect(result.content[0].text).toContain('Scheme: MCPTest');
        expect(result.content[0].text).toContain(
          'Simulator ID: B38FE93D-578B-454B-BE9A-C6FA0CE5F096',
        );
        expect(result.content[0].text).toContain('Simulator Name: Apple Vision Pro');
        expect(result.content[0].text).toContain('Bundle ID: io.sentry.MCPTest');

        const defaults = sessionStore.getAll();
        expect(defaults.scheme).toBe('MCPTest');
        expect(defaults.simulatorId).toBe('B38FE93D-578B-454B-BE9A-C6FA0CE5F096');
        expect(defaults.simulatorName).toBe('Apple Vision Pro');
        expect(defaults.bundleId).toBe('io.sentry.MCPTest');
      },
    );

    it.skipIf(!existsSync(EXAMPLE_XCUSERSTATE))('syncs using configured projectPath', async () => {
      const simctlOutput = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.xrOS-2-0': [
            { udid: 'B38FE93D-578B-454B-BE9A-C6FA0CE5F096', name: 'Apple Vision Pro' },
          ],
        },
      });

      const executor = createCommandMatchingMockExecutor({
        whoami: { output: 'johndoe\n' },
        'test -f': { success: true },
        'xcrun simctl': { output: simctlOutput },
        xcodebuild: { output: '    PRODUCT_BUNDLE_IDENTIFIER = io.sentry.MCPTest\n' },
      });

      const result = await syncXcodeDefaultsLogic(
        {},
        {
          executor,
          cwd: '/some/other/path',
          projectPath: EXAMPLE_PROJECT_PATH,
        },
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Scheme: MCPTest');

      const defaults = sessionStore.getAll();
      expect(defaults.scheme).toBe('MCPTest');
      expect(defaults.simulatorId).toBe('B38FE93D-578B-454B-BE9A-C6FA0CE5F096');
      expect(defaults.bundleId).toBe('io.sentry.MCPTest');
    });

    it.skipIf(!existsSync(EXAMPLE_XCUSERSTATE))('updates existing session defaults', async () => {
      // Set some existing defaults
      sessionStore.setDefaults({
        scheme: 'OldScheme',
        simulatorId: 'OLD-SIM-UUID',
        projectPath: '/some/project.xcodeproj',
      });

      const simctlOutput = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.xrOS-2-0': [
            { udid: 'B38FE93D-578B-454B-BE9A-C6FA0CE5F096', name: 'Apple Vision Pro' },
          ],
        },
      });

      const executor = createCommandMatchingMockExecutor({
        whoami: { output: 'johndoe\n' },
        find: { output: `${EXAMPLE_PROJECT_PATH}\n` },
        stat: { output: '1704067200\n' },
        'xcrun simctl': { output: simctlOutput },
        xcodebuild: { output: '    PRODUCT_BUNDLE_IDENTIFIER = io.sentry.MCPTest\n' },
      });

      const result = await syncXcodeDefaultsLogic(
        {},
        { executor, cwd: join(process.cwd(), 'example_projects/iOS') },
      );

      expect(result.isError).toBe(false);

      const defaults = sessionStore.getAll();
      expect(defaults.scheme).toBe('MCPTest');
      expect(defaults.simulatorId).toBe('B38FE93D-578B-454B-BE9A-C6FA0CE5F096');
      expect(defaults.simulatorName).toBe('Apple Vision Pro');
      expect(defaults.bundleId).toBe('io.sentry.MCPTest');
      // Original projectPath should be preserved
      expect(defaults.projectPath).toBe('/some/project.xcodeproj');
    });
  });
});
