/**
 * Test for build_run_sim_id_proj re-export plugin
 * This is a re-export from simulator-project, so we test that the re-export works correctly.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';
import buildRunSimIdProj from './build_run_sim_id_proj.ts';

// ✅ Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdtemp: vi.fn(() => Promise.resolve('/tmp/test-dir')),
  rm: vi.fn(() => Promise.resolve()),
}));

// ✅ Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

// ✅ Mock build utilities
vi.mock('../../src/utils/build-utils.ts', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

// ✅ Mock command execution utility
vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

describe('build_run_sim_id_proj re-export plugin', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockExecSync: MockedFunction<any>;

  beforeEach(async () => {
    // ✅ Mock external dependencies
    const buildUtils = await import('../../src/utils/build-utils.ts');
    mockExecuteXcodeBuildCommand = buildUtils.executeXcodeBuildCommand as MockedFunction<any>;

    const commandUtils = await import('../../src/utils/command.ts');
    mockExecuteCommand = commandUtils.executeCommand as MockedFunction<any>;

    mockExecSync = vi.mocked(execSync);

    // ✅ Default success behavior
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded.' }],
      isError: false,
    });

    // ✅ Mock successful command responses for build and run tools
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'CODESIGNING_FOLDER_PATH = /path/to/app.app',
      error: '',
    });

    mockExecSync.mockReturnValue('com.example.MyApp');

    vi.clearAllMocks();
  });

  describe('re-export structure', () => {
    it('should re-export correct plugin structure', () => {
      expect(buildRunSimIdProj).toHaveProperty('name', 'build_run_sim_id_proj');
      expect(buildRunSimIdProj).toHaveProperty('description');
      expect(buildRunSimIdProj).toHaveProperty('schema');
      expect(buildRunSimIdProj).toHaveProperty('handler');
      expect(typeof buildRunSimIdProj.handler).toBe('function');
    });
  });

  describe('re-export functionality', () => {
    it('should work correctly via re-export', async () => {
      // ✅ Mock the build phase
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded.' }],
        isError: false,
      });

      // ✅ Mock getting app path from build settings
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
        error: '',
      });

      // ✅ Mock all execSync calls in the correct order for UUID-based simulator
      mockExecSync
        // 1. Check simulator state (UUID provided directly)
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)')
        // 2. Open Simulator app
        .mockReturnValueOnce('')
        // 3. Install app on simulator
        .mockReturnValueOnce('')
        // 4. Extract bundle ID with PlistBuddy
        .mockReturnValueOnce('com.example.MyApp')
        // 5. Launch app on simulator
        .mockReturnValueOnce('');

      const params = {
        projectPath: '/path/to/Project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      };

      const result = await buildRunSimIdProj.handler(params);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(
        '✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator UUID test-uuid',
      );
      expect(result.content[0].text).toContain(
        'The app (com.example.MyApp) is now running in the iOS Simulator',
      );
    });
  });
});