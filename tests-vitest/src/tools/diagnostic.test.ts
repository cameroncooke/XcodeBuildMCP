/**
 * Tests for diagnostic tool
 * 
 * CANONICAL MIGRATION COMPLETE ✅
 * 
 * Covers the diagnostic tool from src/tools/diagnostic.ts:
 * - diagnostic (provides comprehensive system information)
 * 
 * Total: 1 diagnostic tool
 */

import { vi, describe, it, expect, beforeEach, afterEach, type MockedFunction } from 'vitest';

// Mock child_process.execSync - must be at top level
vi.mock('child_process');

import { runDiagnosticTool } from '../../../src/tools/diagnostic.js';
import { execSync } from 'child_process';

// Get the mocked execSync function
const mockExecSync = vi.mocked(execSync);

// Mock os module
vi.mock('os', () => ({
  platform: vi.fn(() => 'darwin'),
  release: vi.fn(() => '23.0.0'),
  arch: vi.fn(() => 'arm64'),
  cpus: vi.fn(() => Array(8).fill({ model: 'Apple M1' })),
  totalmem: vi.fn(() => 17179869184), // 16GB in bytes
  hostname: vi.fn(() => 'test-machine'),
  userInfo: vi.fn(() => ({ username: 'testuser' })),
  homedir: vi.fn(() => '/Users/testuser'),
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock axe-helpers
vi.mock('../../../src/utils/axe-helpers.js', () => ({
  areAxeToolsAvailable: vi.fn(() => true)
}));

// Mock xcodemake
vi.mock('../../../src/utils/xcodemake.js', () => ({
  isXcodemakeEnabled: vi.fn(() => true),
  isXcodemakeAvailable: vi.fn(() => Promise.resolve(true)),
  doesMakefileExist: vi.fn(() => true)
}));

// Mock version
vi.mock('../../../src/version.js', () => ({
  version: '1.10.4-test'
}));

// Mock tool-groups
vi.mock('../../../src/utils/tool-groups.js', () => ({
  ToolGroup: {
    XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY: 'XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY',
    XCODEBUILDMCP_GROUP_BUILD_IOS_SIM: 'XCODEBUILDMCP_GROUP_BUILD_IOS_SIM',
    XCODEBUILDMCP_GROUP_UI_TESTING: 'XCODEBUILDMCP_GROUP_UI_TESTING'
  },
  isSelectiveToolsEnabled: vi.fn(() => false),
  listEnabledGroups: vi.fn(() => [])
}));

describe('diagnostic tool', () => {
  beforeEach(() => {
    // Mock execSync for various commands
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('which')) {
        if (command.includes('axe') || command.includes('xcodemake') || command.includes('mise')) {
          return '/usr/local/bin/tool'; // Tool found
        }
        throw new Error('Command not found');
      }
      
      if (command.includes('xcodebuild -version')) {
        return 'Xcode 15.0\nBuild version 15A240d';
      }
      
      if (command.includes('xcode-select -p')) {
        return '/Applications/Xcode.app/Contents/Developer';
      }
      
      if (command.includes('xcrun --find xcodebuild')) {
        return '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
      }
      
      if (command.includes('xcrun --version')) {
        return 'xcrun version 65';
      }
      
      if (command.includes('axe --version')) {
        return 'axe version 1.0.0';
      }
      
      if (command.includes('mise --version')) {
        return 'mise 2024.1.0';
      }
      
      return 'mock output';
    });

    // Mock process.env
    Object.defineProperty(process, 'env', {
      value: {
        XCODEBUILDMCP_DEBUG: 'true',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test'
      },
      writable: true
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('diagnostic output', () => {
    it('should generate comprehensive diagnostic report', async () => {
      const result = await runDiagnosticTool();

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('XcodeBuildMCP Diagnostic Report')
        }
      ]);
      expect(result.isError).toBeFalsy();
    });

    it('should include server version', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('Server Version: 1.10.4-test');
    });

    it('should include system information', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## System Information');
      expect(result.content[0].text).toContain('platform: darwin');
      expect(result.content[0].text).toContain('arch: arm64');
      expect(result.content[0].text).toContain('hostname: test-machine');
      expect(result.content[0].text).toContain('username: testuser');
    });

    it('should include Node.js information', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## Node.js Information');
      expect(result.content[0].text).toContain('version:');
      expect(result.content[0].text).toContain('platform:');
      expect(result.content[0].text).toContain('arch:');
    });

    it('should include Xcode information', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## Xcode Information');
      expect(result.content[0].text).toContain('Xcode 15.0');
      expect(result.content[0].text).toContain('/Applications/Xcode.app/Contents/Developer');
    });

    it('should include dependencies status', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## Dependencies');
      expect(result.content[0].text).toContain('axe: ✅');
      expect(result.content[0].text).toContain('xcodemake: ✅');
      expect(result.content[0].text).toContain('mise: ✅');
    });

    it('should include environment variables', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## Environment Variables');
      expect(result.content[0].text).toContain('XCODEBUILDMCP_DEBUG: true');
      expect(result.content[0].text).toContain('HOME: /Users/testuser');
    });

    it('should include feature status', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## Feature Status');
      expect(result.content[0].text).toContain('UI Automation (axe)');
      expect(result.content[0].text).toContain('Incremental Builds');
      expect(result.content[0].text).toContain('Mise Integration');
    });

    it('should include tool groups status', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('Tool Groups Status');
      expect(result.content[0].text).toContain('All tool groups are enabled');
    });

    it('should include troubleshooting tips', async () => {
      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('## Troubleshooting Tips');
      expect(result.content[0].text).toContain('brew tap cameroncooke/axe');
      expect(result.content[0].text).toContain('xcodemake');
      expect(result.content[0].text).toContain('INCREMENTAL_BUILDS_ENABLED=1');
    });
  });

  describe('error handling', () => {
    it('should handle Xcode command failures gracefully', async () => {
      // Mock execSync to throw for Xcode commands
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('xcodebuild') || command.includes('xcode-select') || command.includes('xcrun')) {
          throw new Error('Xcode not found');
        }
        return 'mock output';
      });

      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('Error: Xcode not found');
      expect(result.isError).toBeFalsy(); // Diagnostic should not error on missing dependencies
    });

    it('should handle missing dependencies gracefully', async () => {
      // Mock execSync to simulate missing tools
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('which axe') || command.includes('which mise')) {
          throw new Error('Command not found');
        }
        return 'mock output';
      });

      const result = await runDiagnosticTool();

      expect(result.content[0].text).toContain('axe: ❌ Not found');
      expect(result.content[0].text).toContain('mise: ❌ Not found');
      expect(result.isError).toBeFalsy(); // Diagnostic should not error on missing dependencies
    });
  });
});