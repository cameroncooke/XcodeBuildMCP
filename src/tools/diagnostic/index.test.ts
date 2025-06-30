/**
 * Diagnostic Tool Tests - Comprehensive test coverage for diagnostic.ts
 *
 * This test file provides complete coverage for the diagnostic.ts tool:
 * - diagnostic: Provides comprehensive system information and status
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive mocking of all dependencies.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerDiagnosticTool } from './index.js';

// Mock modules to prevent real command execution
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock fs/promises to prevent file system access
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn(),
}));

// Mock os module with deterministic values
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

// Mock process object with deterministic values
const mockProcess = {
  version: 'v18.17.0',
  platform: 'darwin',
  arch: 'arm64',
  execPath: '/opt/homebrew/bin/node',
  pid: 12345,
  ppid: 12344,
  cwd: vi.fn(() => '/test/workspace'),
  argv: ['/opt/homebrew/bin/node', '/test/worker.js'],
  env: {
    XCODEBUILDMCP_DEBUG: 'true',
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: '/Users/testuser',
    USER: 'testuser',
    TMPDIR: '/tmp',
    NODE_ENV: 'test',
  },
};

// Mock global process
Object.defineProperty(global, 'process', {
  value: mockProcess,
  writable: true,
});

// Mock axe-helpers
vi.mock('../../utils/axe-helpers.js', () => ({
  areAxeToolsAvailable: vi.fn(() => true),
}));

// Mock xcodemake
vi.mock('../../utils/xcodemake.js', () => ({
  isXcodemakeEnabled: vi.fn(() => true),
  isXcodemakeAvailable: vi.fn(() => Promise.resolve(true)),
  doesMakefileExist: vi.fn(() => true),
}));

// Mock version
vi.mock('../../version.js', () => ({
  version: '1.10.4-test',
}));

// Mock tool-groups
vi.mock('../../utils/tool-groups.js', () => ({
  ToolGroup: {
    XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY: 'XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY',
    XCODEBUILDMCP_GROUP_BUILD_IOS_SIM: 'XCODEBUILDMCP_GROUP_BUILD_IOS_SIM',
    XCODEBUILDMCP_GROUP_UI_TESTING: 'XCODEBUILDMCP_GROUP_UI_TESTING',
  },
  isSelectiveToolsEnabled: vi.fn(() => false),
  listEnabledGroups: vi.fn(() => []),
}));

// Create mock server to capture tool registrations
const mockServer = {
  tool: vi.fn(),
} as any as Server;

// Store registered tools
let registeredTools: Map<string, any> = new Map();

describe('diagnostic tool tests', () => {
  let mockExecSync: MockedFunction<any>;
  let mockLog: MockedFunction<any>;

  beforeEach(async () => {
    // Clear registered tools
    registeredTools.clear();

    // Mock server.tool to capture registrations
    mockServer.tool.mockImplementation((name, description, schema, handler) => {
      registeredTools.set(name, { name, description, schema, handler });
    });

    // Register production tool
    registerDiagnosticTool(mockServer);

    // Mock Date to make timestamps deterministic
    vi.setSystemTime(new Date('2025-01-15T10:30:00.000Z'));

    // Import mocked modules
    const childProcess = await import('child_process');
    const logger = await import('../../utils/logger.js');

    mockExecSync = childProcess.execSync as MockedFunction<any>;
    mockLog = logger.log as MockedFunction<any>;

    // Mock execSync for various commands with deterministic responses
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('which axe')) {
        return '/usr/local/bin/axe';
      }
      if (command.includes('which xcodemake')) {
        return '/usr/local/bin/xcodemake';
      }
      if (command.includes('which mise')) {
        return '/usr/local/bin/mise';
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
      return '';
    });

    // Mock process.env
    Object.defineProperty(process, 'env', {
      value: {
        XCODEBUILDMCP_DEBUG: 'true',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        HOME: '/Users/testuser',
        USER: 'testuser',
        TMPDIR: '/tmp',
        NODE_ENV: 'test',
      },
      writable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parameter validation', () => {
    it('should accept optional enabled parameter', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({ enabled: true });
      expect(result.content).toEqual([
        { type: 'text', text: expect.stringMatching(/XcodeBuildMCP Diagnostic Report/) },
      ]);
      expect(result.isError || false).toBe(false);
    });

    it('should work without any parameters', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({});
      expect(result.content).toEqual([
        { type: 'text', text: expect.stringMatching(/XcodeBuildMCP Diagnostic Report/) },
      ]);
      expect(result.isError || false).toBe(false);
    });
  });

  describe('success scenarios', () => {
    it('should generate deterministic diagnostic report with all dependencies available', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({});

      // Expected deterministic response
      const expectedDiagnosticReport = `# XcodeBuildMCP Diagnostic Report

Generated: 2025-01-15T10:30:00.000Z
Server Version: 1.10.4-test

## System Information
- platform: darwin
- release: 23.0.0
- arch: arm64
- cpus: 8 x Apple M1
- memory: 16 GB
- hostname: test-machine
- username: testuser
- homedir: /Users/testuser
- tmpdir: /tmp

## Node.js Information
- version: v18.17.0
- execPath: /opt/homebrew/bin/node
- pid: 12345
- ppid: 12344
- platform: darwin
- arch: arm64
- cwd: /test/workspace
- argv: /opt/homebrew/bin/node /test/worker.js

## Xcode Information
- version: Xcode 15.0 - Build version 15A240d
- path: /Applications/Xcode.app/Contents/Developer
- selectedXcode: /Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild
- xcrunVersion: xcrun version 65

## Dependencies
- axe: ✅ axe version 1.0.0
- xcodemake: ✅ Available (version info not available)
- mise: ✅ mise 2024.1.0

## Environment Variables
- XCODEBUILDMCP_DEBUG: true
- INCREMENTAL_BUILDS_ENABLED: (not set)
- DEVELOPER_DIR: (not set)
- HOME: /Users/testuser
- USER: testuser
- TMPDIR: /tmp
- NODE_ENV: test
- SENTRY_DISABLED: (not set)

### PATH
\`\`\`
/usr/local/bin
/usr/bin
/bin
\`\`\`

## Feature Status

### UI Automation (axe)
- Available: ✅ Yes
- UI Automation Supported: ✅ Yes

### Incremental Builds
- Enabled: ✅ Yes
- Available: ✅ Yes
- Makefile exists: ✅ Yes

### Mise Integration
- Running under mise: ❌ No
- Mise available: ✅ Yes

### Available Tools
- Total Plugins: 0
- Plugin Directories: 0

## Tool Availability Summary
- Build Tools: ✅ Available
- UI Automation Tools: ✅ Available
- Incremental Build Support: ✅ Available & Enabled

## Sentry
- Sentry enabled: ✅ Yes

## Troubleshooting Tips
- If UI automation tools are not available, install axe: \`brew tap cameroncooke/axe && brew install axe\`
- If incremental build support is not available, you can download the tool from https://github.com/cameroncooke/xcodemake. Make sure it's executable and available in your PATH
- To enable xcodemake, set environment variable: \`export INCREMENTAL_BUILDS_ENABLED=1\`
- For mise integration, follow instructions in the README.md file
- Use the 'discover_tools' tool to find relevant tools for your task`;

      expect(result.content).toEqual([{ type: 'text', text: expectedDiagnosticReport }]);
      expect(result.isError || false).toBe(false);
    });

    it('should verify logger is properly mocked', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({});

      // Verify mocked logger was called with expected diagnostic log
      expect(mockLog).toHaveBeenCalledWith('info', '[Diagnostic]: Running diagnostic tool');
      expect(result.isError || false).toBe(false);
    });

    it('should verify command execution is mocked', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({});

      // Verify mocked commands were called as expected
      expect(mockExecSync).toHaveBeenCalled();
      expect(result.content[0].text).toMatch(/Xcode 15\.0/);
      expect(result.isError || false).toBe(false);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle Xcode command failures gracefully', async () => {
      // Mock execSync to throw for Xcode commands
      mockExecSync.mockImplementation((command: string) => {
        if (
          command.includes('xcodebuild') ||
          command.includes('xcode-select') ||
          command.includes('xcrun')
        ) {
          throw new Error('Xcode not found');
        }
        if (command.includes('which')) {
          if (
            command.includes('axe') ||
            command.includes('xcodemake') ||
            command.includes('mise')
          ) {
            return '/usr/local/bin/tool';
          }
        }
        return 'mock output';
      });

      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({});

      expect(result.content[0].text).toMatch(/Error.*Xcode not found/);
      expect(result.isError || false).toBe(false); // Diagnostic should not error on missing dependencies
    });

    it('should handle missing dependencies gracefully', async () => {
      // Mock execSync to simulate missing tools
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('which axe') || command.includes('which mise')) {
          throw new Error('Command not found');
        }
        if (command.includes('xcodebuild -version')) {
          return 'Xcode 15.0\nBuild version 15A240d';
        }
        if (command.includes('xcode-select -p')) {
          return '/Applications/Xcode.app/Contents/Developer';
        }
        return 'mock output';
      });

      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({});

      expect(result.content[0].text).toMatch(/axe: ❌/);
      expect(result.content[0].text).toMatch(/mise: ❌/);
      expect(result.isError || false).toBe(false); // Diagnostic should not error on missing dependencies
    });

    it('should handle parameter validation correctly', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      // The diagnostic tool doesn't validate the enabled parameter type strictly
      const result = await tool.handler({ enabled: 'not_boolean' });
      expect(result.content[0].text).toMatch(/XcodeBuildMCP Diagnostic Report/);
    });
  });

  describe('integration scenarios', () => {
    it('should generate complete diagnostic with all systems working', async () => {
      const tool = registeredTools.get('diagnostic');
      expect(tool).toBeDefined();

      const result = await tool.handler({ enabled: true });

      // Verify comprehensive output structure
      expect(result.content).toHaveLength(1);
      const reportText = result.content[0].text;

      // Check all major sections are present
      expect(reportText).toMatch(/# XcodeBuildMCP Diagnostic Report/);
      expect(reportText).toMatch(/## System Information/);
      expect(reportText).toMatch(/## Node\.js Information/);
      expect(reportText).toMatch(/## Xcode Information/);
      expect(reportText).toMatch(/## Dependencies/);
      expect(reportText).toMatch(/## Feature Status/);
      expect(reportText).toMatch(/## Troubleshooting Tips/);

      expect(result.isError || false).toBe(false);
    });
  });
});
