import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMcpTestHarness, type McpTestHarness } from '../mcp-test-harness.ts';
import { extractText, isErrorResponse } from '../test-helpers.ts';

let harness: McpTestHarness;

beforeAll(async () => {
  harness = await createMcpTestHarness({
    commandResponses: {
      'simctl list devices': {
        success: false,
        output: 'simctl error: unable to enumerate devices',
      },
      xcodebuild: {
        success: false,
        output: 'xcodebuild: error: The workspace does not exist.',
      },
      'swift build': {
        success: false,
        output: 'error: build failed',
      },
    },
  });
}, 30_000);

afterAll(async () => {
  await harness.cleanup();
});

beforeEach(async () => {
  await harness.client.callTool({
    name: 'session_clear_defaults',
    arguments: { all: true },
  });
});

describe('MCP Error Paths (e2e)', () => {
  describe('missing session defaults', () => {
    it('build_sim errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'build_sim',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('build_device errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'build_device',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('build_macos errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'build_macos',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('clean errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'clean',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('test_sim errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'test_sim',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('tap errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'tap',
        arguments: { x: 100, y: 200 },
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('boot_sim errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'boot_sim',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });

    it('show_build_settings errors without session defaults', async () => {
      const result = await harness.client.callTool({
        name: 'show_build_settings',
        arguments: {},
      });
      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe('command failure propagation', () => {
    it('build_sim propagates xcodebuild failure', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          scheme: 'MyApp',
          projectPath: '/path/to/MyApp.xcodeproj',
          simulatorId: 'AAAAAAAA-1111-2222-3333-444444444444',
        },
      });

      const result = await harness.client.callTool({
        name: 'build_sim',
        arguments: {},
      });

      expect(isErrorResponse(result)).toBe(true);
      const text = extractText(result).toLowerCase();
      expect(text).toContain('fail');
    });

    it('swift_package_build propagates swift build failure', async () => {
      const result = await harness.client.callTool({
        name: 'swift_package_build',
        arguments: { packagePath: '/path/to/package' },
      });

      expect(isErrorResponse(result)).toBe(true);
      const text = extractText(result).toLowerCase();
      expect(text).toContain('fail');
    });

    it('list_sims propagates simctl failure', async () => {
      const result = await harness.client.callTool({
        name: 'list_sims',
        arguments: {},
      });

      expect(isErrorResponse(result)).toBe(true);
      const text = extractText(result).toLowerCase();
      expect(text).toContain('fail');
    });
  });

  describe('invalid parameter combinations', () => {
    it('session_set_defaults resolves both projectPath and workspacePath by keeping workspacePath', async () => {
      const result = await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: {
          projectPath: '/path/to/MyApp.xcodeproj',
          workspacePath: '/path/to/MyApp.xcworkspace',
        },
      });

      const text = extractText(result);
      expect(text).toContain('keeping workspacePath');
    });

    it('build_sim still errors when only scheme is set without project or simulator', async () => {
      await harness.client.callTool({
        name: 'session_set_defaults',
        arguments: { scheme: 'MyApp' },
      });

      const result = await harness.client.callTool({
        name: 'build_sim',
        arguments: {},
      });

      expect(isErrorResponse(result)).toBe(true);
    });
  });
});
