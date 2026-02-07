import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';

let harness: McpTestHarness;

beforeAll(async () => {
  harness = await createMcpTestHarness({
    commandResponses: {
      xcodebuild: { success: true, output: 'Build Succeeded' },
      devicectl: { success: true, output: '{}' },
      'xctrace list devices': { success: true, output: 'No devices found.' },
      open: { success: true, output: '' },
      kill: { success: true, output: '' },
      pkill: { success: true, output: '' },
      'defaults read': { success: true, output: 'com.example.MyApp' },
      PlistBuddy: { success: true, output: 'com.example.MyApp' },
      xcresulttool: { success: true, output: '{}' },
    },
  });
}, 30_000);

afterAll(async () => {
  await harness.cleanup();
});

describe('MCP Device and macOS Tool Invocation (e2e)', () => {
  describe('device tools', () => {
    it('build_device captures xcodebuild command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyApp',
          projectPath: '/path/to/MyApp.xcodeproj',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'build_device',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('xcodebuild') && c.includes('MyApp'))).toBe(true);
    });

    it('test_device captures xcodebuild test command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyApp',
          projectPath: '/path/to/MyApp.xcodeproj',
          deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'test_device',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('xcodebuild') && c.includes('test'))).toBe(true);
    });

    it('launch_app_device captures devicectl launch command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
          bundleId: 'com.example.MyApp',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'launch_app_device',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('devicectl') && c.includes('launch'))).toBe(true);
    });

    it('stop_app_device captures devicectl terminate command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'stop_app_device',
        arguments: { processId: 12345 },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('devicectl') && c.includes('terminate'))).toBe(
        true,
      );
    });

    it('install_app_device captures devicectl install command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'install_app_device',
        arguments: { appPath: '/path/to/MyApp.app' },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('devicectl') && c.includes('install'))).toBe(true);
    });

    it('get_device_app_path captures xcodebuild showBuildSettings command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyApp',
          projectPath: '/path/to/MyApp.xcodeproj',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'get_device_app_path',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(
        commandStrs.some((c) => c.includes('xcodebuild') && c.includes('-showBuildSettings')),
      ).toBe(true);
    });

    it('list_devices captures devicectl or xctrace command', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'list_devices',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      expect(harness.capturedCommands.length).toBeGreaterThan(0);
    });
  });

  describe('project discovery tools', () => {
    it('discover_projs responds with content', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'discover_projs',
        arguments: { workspaceRoot: '/path/to/workspace' },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it('get_app_bundle_id responds with content', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'get_app_bundle_id',
        arguments: { appPath: '/path/to/MyApp.app' },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it('get_mac_bundle_id responds with content', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'get_mac_bundle_id',
        arguments: { appPath: '/path/to/MyApp.app' },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('macOS tools', () => {
    it('build_macos captures xcodebuild command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyMacApp',
          projectPath: '/path/to/MyMacApp.xcodeproj',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'build_macos',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('xcodebuild') && c.includes('MyMacApp'))).toBe(
        true,
      );
    });

    it('build_run_macos captures xcodebuild and open commands', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyMacApp',
          projectPath: '/path/to/MyMacApp.xcodeproj',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'build_run_macos',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('xcodebuild'))).toBe(true);
    });

    it('test_macos captures xcodebuild test command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyMacApp',
          projectPath: '/path/to/MyMacApp.xcodeproj',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'test_macos',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('xcodebuild') && c.includes('test'))).toBe(true);
    });

    it('launch_mac_app responds with content', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'launch_mac_app',
        arguments: { appPath: '/path/to/MyMacApp.app' },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it('stop_mac_app captures kill command with processId', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'stop_mac_app',
        arguments: { processId: 54321 },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('kill') && c.includes('54321'))).toBe(true);
    });

    it('stop_mac_app captures pkill command with appName', async () => {
      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'stop_mac_app',
        arguments: { appName: 'MyMacApp' },
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(commandStrs.some((c) => c.includes('MyMacApp'))).toBe(true);
    });

    it('get_mac_app_path captures xcodebuild showBuildSettings command', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyMacApp',
          projectPath: '/path/to/MyMacApp.xcodeproj',
        },
      });

      harness.capturedCommands.length = 0;
      const result = await harness.client.callTool({
        name: 'get_mac_app_path',
        arguments: {},
      });

      expect(result).toBeDefined();
      const content = 'content' in result ? result.content : [];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);

      const commandStrs = harness.capturedCommands.map((c) => c.command.join(' '));
      expect(
        commandStrs.some((c) => c.includes('xcodebuild') && c.includes('-showBuildSettings')),
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    it('build_device returns error when session defaults missing', async () => {
      await harness.client.callTool({
        name: 'session_clear_defaults',
        arguments: { all: true },
      });

      const result = await harness.client.callTool({
        name: 'build_device',
        arguments: {},
      });

      const content = 'content' in result ? result.content : [];
      const isError = 'isError' in result ? result.isError : false;
      const hasErrorText =
        Array.isArray(content) &&
        content.some(
          (c) =>
            'text' in c &&
            typeof c.text === 'string' &&
            (c.text.toLowerCase().includes('error') ||
              c.text.toLowerCase().includes('required') ||
              c.text.toLowerCase().includes('must provide') ||
              c.text.toLowerCase().includes('provide')),
        );
      expect(isError || hasErrorText).toBe(true);
    });

    it('build_macos returns error when session defaults missing', async () => {
      await harness.client.callTool({
        name: 'session_clear_defaults',
        arguments: { all: true },
      });

      const result = await harness.client.callTool({
        name: 'build_macos',
        arguments: {},
      });

      const content = 'content' in result ? result.content : [];
      const isError = 'isError' in result ? result.isError : false;
      const hasErrorText =
        Array.isArray(content) &&
        content.some(
          (c) =>
            'text' in c &&
            typeof c.text === 'string' &&
            (c.text.toLowerCase().includes('error') ||
              c.text.toLowerCase().includes('required') ||
              c.text.toLowerCase().includes('must provide') ||
              c.text.toLowerCase().includes('provide')),
        );
      expect(isError || hasErrorText).toBe(true);
    });

    it('stop_mac_app returns error when no appName or processId provided', async () => {
      const result = await harness.client.callTool({
        name: 'stop_mac_app',
        arguments: {},
      });

      const content = 'content' in result ? result.content : [];
      const isError = 'isError' in result ? result.isError : false;
      const hasErrorText =
        Array.isArray(content) &&
        content.some(
          (c) =>
            'text' in c &&
            typeof c.text === 'string' &&
            (c.text.toLowerCase().includes('either') ||
              c.text.toLowerCase().includes('error') ||
              c.text.toLowerCase().includes('must be provided')),
        );
      expect(isError || hasErrorText).toBe(true);
    });
  });
});
