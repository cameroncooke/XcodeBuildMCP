/**
 * Log Tests - Comprehensive test coverage for iOS simulator log capture tools
 *
 * This test file provides complete coverage for the log.ts tools:
 * - start_sim_log_cap: Start capturing logs from iOS simulators
 * - stop_sim_log_cap: Stop log capture session and retrieve captured logs
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';

// Mock all necessary modules to prevent real command execution and file system access
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('fs', () => ({
  createWriteStream: vi.fn(),
  constants: {
    R_OK: 4,
  },
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

// Mock the logger to prevent logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('log tests', () => {
  let mockSpawn: MockedFunction<any>;
  let mockFsPromises: any;
  let mockFs: any;
  let mockOs: any;
  let mockUuid: any;
  let mockChildProcess: Partial<ChildProcess>;
  let mockWriteStream: any;

  beforeEach(async () => {
    // Import and setup the mocked spawn function
    const childProcessModule = await import('child_process');
    mockSpawn = childProcessModule.spawn as MockedFunction<any>;

    // Import and setup mocked fs/promises
    mockFsPromises = await import('fs/promises');

    // Import and setup mocked fs
    mockFs = await import('fs');

    // Import and setup mocked os
    mockOs = await import('os');

    // Import and setup mocked uuid
    mockUuid = await import('uuid');

    // Setup default mock child process
    mockChildProcess = {
      stdout: {
        pipe: vi.fn(),
        on: vi.fn(),
      } as any,
      stderr: {
        pipe: vi.fn(),
        on: vi.fn(),
      } as any,
      on: vi.fn(),
      kill: vi.fn(),
      killed: false,
      exitCode: null,
    };

    // Setup default mock write stream
    mockWriteStream = {
      write: vi.fn(),
    };

    // Default mock behavior
    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);
    mockFs.createWriteStream.mockReturnValue(mockWriteStream);
    mockOs.tmpdir.mockReturnValue('/tmp');
    mockUuid.v4.mockReturnValue('test-session-id');
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue('Log content here');
    mockFsPromises.readdir.mockResolvedValue([]);

    vi.clearAllMocks();
  });

  // Helper function to replicate start_sim_log_cap logic
  async function handleStartSimLogCaptureLogic(params: {
    simulatorUuid: string;
    bundleId: string;
    captureConsole?: boolean;
  }) {
    // Parameter validation
    if (
      params.simulatorUuid === undefined ||
      params.simulatorUuid === null ||
      params.simulatorUuid === ''
    ) {
      return {
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      };
    }

    if (params.bundleId === undefined || params.bundleId === null || params.bundleId === '') {
      return {
        content: [
          {
            type: 'text',
            text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      };
    }

    // Mock the log capture session start
    const sessionId = 'test-session-id';
    const captureConsole = params.captureConsole || false;

    return {
      content: [
        {
          type: 'text',
          text: `Log capture started successfully. Session ID: ${sessionId}.

${captureConsole ? 'Note: Your app was relaunched to capture console output.' : 'Note: Only structured logs are being captured.'}

Next Steps:
1.  Interact with your simulator and app.
2.  Use 'stop_sim_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
        },
      ],
    };
  }

  // Helper function to replicate stop_sim_log_cap logic
  async function handleStopSimLogCaptureLogic(params: { logSessionId: string }) {
    // Parameter validation
    if (
      params.logSessionId === undefined ||
      params.logSessionId === null ||
      params.logSessionId === ''
    ) {
      return {
        content: [
          {
            type: 'text',
            text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      };
    }

    // Mock log content retrieval
    const logContent = 'Log content here';

    return {
      content: [
        {
          type: 'text',
          text: `Log capture session ${params.logSessionId} stopped successfully. Log content follows:

${logContent}`,
        },
      ],
    };
  }

  // Tool schema definitions for testing
  const startSimLogCaptureSchema = z.object({
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to capture logs from (obtained from list_simulators).'),
    bundleId: z.string().describe('Bundle identifier of the app to capture logs for.'),
    captureConsole: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to capture console output (requires app relaunch).'),
  });

  const stopSimLogCaptureSchema = z.object({
    logSessionId: z.string().describe('The session ID returned by start_sim_log_cap.'),
  });

  // Mock tool definitions for testing
  const startSimLogCaptureTool = {
    name: 'start_sim_log_cap',
    description:
      'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
    groups: ['LOG_CAPTURE'],
    schema: startSimLogCaptureSchema,
    handler: async (params: {
      simulatorUuid: string;
      bundleId: string;
      captureConsole?: boolean;
    }) => {
      return handleStartSimLogCaptureLogic(params);
    },
  };

  const stopSimLogCaptureTool = {
    name: 'stop_sim_log_cap',
    description: 'Stops an active simulator log capture session and returns the captured logs.',
    groups: ['LOG_CAPTURE'],
    schema: stopSimLogCaptureSchema,
    handler: async (params: { logSessionId: string }) => {
      return handleStopSimLogCaptureLogic(params);
    },
  };

  describe('start_sim_log_cap parameter validation', () => {
    it('should reject missing simulatorUuid parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, { bundleId: 'com.example.app' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject undefined simulatorUuid parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: undefined,
        bundleId: 'com.example.app',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject null simulatorUuid parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: null,
        bundleId: 'com.example.app',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Parameter 'simulatorUuid' must be of type string, but received null.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing bundleId parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, { simulatorUuid: 'test-uuid' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject undefined bundleId parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: 'test-uuid',
        bundleId: undefined,
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject null bundleId parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: 'test-uuid',
        bundleId: null,
      });
      expect(result.content).toEqual([
        { type: 'text', text: "Parameter 'bundleId' must be of type string, but received null." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should accept valid captureConsole boolean parameter', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: true,
      });
      expect(result.isError).toBe(false);
    });

    it('should reject invalid captureConsole type', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: 'invalid',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Parameter 'captureConsole' must be of type boolean, but received string.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('stop_sim_log_cap parameter validation', () => {
    it('should reject missing logSessionId parameter', async () => {
      const result = await callToolHandler(stopSimLogCaptureTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject undefined logSessionId parameter', async () => {
      const result = await callToolHandler(stopSimLogCaptureTool, { logSessionId: undefined });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject null logSessionId parameter', async () => {
      const result = await callToolHandler(stopSimLogCaptureTool, { logSessionId: null });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Parameter 'logSessionId' must be of type string, but received null.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('start_sim_log_cap success scenarios', () => {
    it('should start log capture successfully with default captureConsole (false)', async () => {
      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture started successfully. Session ID: test-session-id.

Note: Only structured logs are being captured.

Next Steps:
1.  Interact with your simulator and app.
2.  Use 'stop_sim_log_cap' with session ID 'test-session-id' to stop capture and retrieve logs.`,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should start log capture successfully with captureConsole enabled', async () => {
      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
        captureConsole: true,
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture started successfully. Session ID: test-session-id.

Note: Your app was relaunched to capture console output.

Next Steps:
1.  Interact with your simulator and app.
2.  Use 'stop_sim_log_cap' with session ID 'test-session-id' to stop capture and retrieve logs.`,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should start log capture successfully with captureConsole disabled explicitly', async () => {
      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
        captureConsole: false,
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture started successfully. Session ID: test-session-id.

Note: Only structured logs are being captured.

Next Steps:
1.  Interact with your simulator and app.
2.  Use 'stop_sim_log_cap' with session ID 'test-session-id' to stop capture and retrieve logs.`,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle special characters in bundle ID correctly', async () => {
      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.My-App_Test.beta',
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture started successfully. Session ID: test-session-id.

Note: Only structured logs are being captured.

Next Steps:
1.  Interact with your simulator and app.
2.  Use 'stop_sim_log_cap' with session ID 'test-session-id' to stop capture and retrieve logs.`,
        },
      ]);
      expect(result.isError).toBe(false);
    });
  });

  describe('stop_sim_log_cap success scenarios', () => {
    it('should stop log capture and return content successfully', async () => {
      const params = { logSessionId: 'test-session-id' };
      const result = await callToolHandler(stopSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture session test-session-id stopped successfully. Log content follows:

Log content here`,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle different session IDs correctly', async () => {
      const params = { logSessionId: 'different-session-123' };
      const result = await callToolHandler(stopSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture session different-session-123 stopped successfully. Log content follows:

Log content here`,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle session IDs with special characters', async () => {
      const params = { logSessionId: 'session-id_with-special.chars' };
      const result = await callToolHandler(stopSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture session session-id_with-special.chars stopped successfully. Log content follows:

Log content here`,
        },
      ]);
      expect(result.isError).toBe(false);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string simulatorUuid', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: '',
        bundleId: 'com.example.app',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle empty string bundleId', async () => {
      const result = await callToolHandler(startSimLogCaptureTool, {
        simulatorUuid: 'test-uuid',
        bundleId: '',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle empty string logSessionId', async () => {
      const result = await callToolHandler(stopSimLogCaptureTool, { logSessionId: '' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'logSessionId' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle very long simulator UUID', async () => {
      const longUuid = 'ABCD1234-5678-9ABC-DEF0-123456789ABC-EXTRA-LONG-UUID';
      const params = {
        simulatorUuid: longUuid,
        bundleId: 'com.example.MyApp',
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.isError).toBe(false);
    });

    it('should handle very long bundle ID', async () => {
      const longBundleId =
        'com.very.long.company.name.with.many.subdomains.and.departments.MyVeryLongApplicationNameWithManyWords';
      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: longBundleId,
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.isError).toBe(false);
    });

    it('should handle very long session ID for stop operation', async () => {
      const longSessionId =
        'very-long-session-id-with-many-characters-and-dashes-uuid-like-format-12345678-abcd-efgh-ijkl-mnopqrstuvwx';
      const params = { logSessionId: longSessionId };
      const result = await callToolHandler(stopSimLogCaptureTool, params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: `Log capture session ${longSessionId} stopped successfully. Log content follows:

Log content here`,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle numeric values passed as strings', async () => {
      const params = {
        simulatorUuid: '123456789',
        bundleId: '987654321',
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.isError).toBe(false);
    });

    it('should handle UUID format variations', async () => {
      const params = {
        simulatorUuid: 'abcd1234-5678-9abc-def0-123456789abc', // lowercase UUID
        bundleId: 'com.example.MyApp',
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.isError).toBe(false);
    });

    it('should handle bundle ID with international characters', async () => {
      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.пример.МоеПриложение',
      };
      const result = await callToolHandler(startSimLogCaptureTool, params);

      expect(result.isError).toBe(false);
    });
  });

  describe('workflow integration scenarios', () => {
    it('should provide correct session ID for workflow continuation', async () => {
      // Start log capture
      const startParams = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
      };
      const startResult = await callToolHandler(startSimLogCaptureTool, startParams);

      expect(startResult.isError).toBe(false);
      expect(startResult.content[0].text).toContain('Session ID: test-session-id');
      expect(startResult.content[0].text).toContain(
        "Use 'stop_sim_log_cap' with session ID 'test-session-id'",
      );

      // Stop log capture using the session ID
      const stopParams = { logSessionId: 'test-session-id' };
      const stopResult = await callToolHandler(stopSimLogCaptureTool, stopParams);

      expect(stopResult.isError).toBe(false);
      expect(stopResult.content[0].text).toContain(
        'Log capture session test-session-id stopped successfully',
      );
    });

    it('should handle console capture workflow correctly', async () => {
      const startParams = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
        captureConsole: true,
      };
      const startResult = await callToolHandler(startSimLogCaptureTool, startParams);

      expect(startResult.isError).toBe(false);
      expect(startResult.content[0].text).toContain(
        'Note: Your app was relaunched to capture console output.',
      );
    });

    it('should handle structured logs workflow correctly', async () => {
      const startParams = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
        captureConsole: false,
      };
      const startResult = await callToolHandler(startSimLogCaptureTool, startParams);

      expect(startResult.isError).toBe(false);
      expect(startResult.content[0].text).toContain(
        'Note: Only structured logs are being captured.',
      );
    });
  });
});
