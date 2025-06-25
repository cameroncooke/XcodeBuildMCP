/**
 * Log Tests - Comprehensive test coverage for iOS simulator log capture tools
 *
 * This test file provides complete coverage for the log.ts tools:
 * - registerStartSimulatorLogCaptureTool: Start capturing logs from iOS simulators
 * - registerStopAndGetSimulatorLogTool: Stop log capture session and retrieve captured logs
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';

// ✅ CORRECT: Import actual production functions
import {
  registerStartSimulatorLogCaptureTool,
  registerStopAndGetSimulatorLogTool,
} from './index.js';

// ✅ CORRECT: Mock external dependencies only
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

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ CORRECT: Mock log capture utilities
vi.mock('../../utils/log_capture.js', () => ({
  startLogCapture: vi.fn(),
  stopLogCapture: vi.fn(),
}));

// ✅ CORRECT: Mock validation utilities
vi.mock('../../utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
}));

// ✅ CORRECT: Mock common tools utilities
vi.mock('../common/index.js', () => ({
  registerTool: vi.fn(),
  createTextContent: vi.fn(),
}));

describe('log tests', () => {
  let mockSpawn: MockedFunction<any>;
  let mockFsPromises: any;
  let mockFs: any;
  let mockOs: any;
  let mockUuid: any;
  let mockChildProcess: Partial<ChildProcess>;
  let mockWriteStream: any;
  let mockStartLogCapture: MockedFunction<any>;
  let mockStopLogCapture: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockRegisterTool: MockedFunction<any>;
  let mockCreateTextContent: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Import and setup the mocked functions
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

    // Import and setup mocked log capture
    const logCaptureModule = await import('../../utils/log_capture.js');
    mockStartLogCapture = logCaptureModule.startLogCapture as MockedFunction<any>;
    mockStopLogCapture = logCaptureModule.stopLogCapture as MockedFunction<any>;

    // Import and setup mocked validation
    const validationModule = await import('../../utils/validation.js');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Import and setup mocked common tools
    const commonModule = await import('../common/index.js');
    mockRegisterTool = commonModule.registerTool as MockedFunction<any>;
    mockCreateTextContent = commonModule.createTextContent as MockedFunction<any>;

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

    // Mock server object
    mockServer = {
      addTool: vi.fn(),
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
    mockCreateTextContent.mockImplementation((text: string) => ({ type: 'text', text }));

    // Setup default validation mock
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    // Setup default log capture mocks
    mockStartLogCapture.mockResolvedValue({
      sessionId: 'test-session-id',
      error: null,
    });

    mockStopLogCapture.mockResolvedValue({
      logContent: 'Log content here',
      error: null,
    });

    vi.clearAllMocks();
  });

  describe('registerStartSimulatorLogCaptureTool', () => {
    it('should register the start log capture tool correctly', () => {
      // ✅ Test actual production function
      registerStartSimulatorLogCaptureTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'start_sim_log_cap',
        'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful log capture start', async () => {
      registerStartSimulatorLogCaptureTool(mockServer);

      // Get the handler function from the registerTool call
      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'start_sim_log_cap',
      );
      const handler = handlerCall[4];

      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
        captureConsole: false,
      };

      // ✅ Test actual production handler
      const result = await handler(params);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('simulatorUuid', params.simulatorUuid);
      expect(mockStartLogCapture).toHaveBeenCalledWith(params);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining(
            'Log capture started successfully. Session ID: test-session-id',
          ),
        },
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      registerStartSimulatorLogCaptureTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'start_sim_log_cap',
      );
      const handler = handlerCall[4];

      // Mock validation failure
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: "Required parameter 'simulatorUuid' is missing." }],
          isError: true,
        },
      });

      const params = {
        simulatorUuid: '',
        bundleId: 'com.example.MyApp',
      };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'simulatorUuid' is missing." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle log capture start errors', async () => {
      registerStartSimulatorLogCaptureTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'start_sim_log_cap',
      );
      const handler = handlerCall[4];

      // Mock start log capture failure
      mockStartLogCapture.mockResolvedValue({
        sessionId: null,
        error: 'Failed to start log capture',
      });

      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
      };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Error starting log capture: Failed to start log capture' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle console capture mode correctly', async () => {
      registerStartSimulatorLogCaptureTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'start_sim_log_cap',
      );
      const handler = handlerCall[4];

      const params = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
        captureConsole: true,
      };

      // ✅ Test actual production function with console capture
      const result = await handler(params);

      expect(result.content[0].text).toContain('Your app was relaunched to capture console output');
    });
  });

  describe('registerStopAndGetSimulatorLogTool', () => {
    it('should register the stop log capture tool correctly', () => {
      // ✅ Test actual production function
      registerStopAndGetSimulatorLogTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'stop_sim_log_cap',
        'Stops an active simulator log capture session and returns the captured logs.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful log capture stop', async () => {
      registerStopAndGetSimulatorLogTool(mockServer);

      // Get the handler function from the registerTool call
      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'stop_sim_log_cap',
      );
      const handler = handlerCall[4];

      const params = { logSessionId: 'test-session-id' };

      // ✅ Test actual production handler
      const result = await handler(params);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('logSessionId', params.logSessionId);
      expect(mockStopLogCapture).toHaveBeenCalledWith(params.logSessionId);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('Log capture session test-session-id stopped successfully'),
        },
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      registerStopAndGetSimulatorLogTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'stop_sim_log_cap',
      );
      const handler = handlerCall[4];

      // Mock validation failure
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: "Required parameter 'logSessionId' is missing." }],
          isError: true,
        },
      });

      const params = { logSessionId: '' };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'logSessionId' is missing." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle log capture stop errors', async () => {
      registerStopAndGetSimulatorLogTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'stop_sim_log_cap',
      );
      const handler = handlerCall[4];

      // Mock stop log capture failure
      mockStopLogCapture.mockResolvedValue({
        logContent: null,
        error: 'Failed to stop log capture',
      });

      const params = { logSessionId: 'test-session-id' };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Error stopping log capture session test-session-id: Failed to stop log capture',
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('log capture workflow integration', () => {
    it('should support complete start-stop workflow', async () => {
      // ✅ Test actual production workflow
      registerStartSimulatorLogCaptureTool(mockServer);
      registerStopAndGetSimulatorLogTool(mockServer);

      const startHandler = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'start_sim_log_cap',
      )[4];
      const stopHandler = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'stop_sim_log_cap',
      )[4];

      // Start log capture
      const startParams = {
        simulatorUuid: 'ABCD1234-5678-9ABC-DEF0-123456789ABC',
        bundleId: 'com.example.MyApp',
      };
      const startResult = await startHandler(startParams);

      expect(startResult.content[0].text).toContain('Session ID: test-session-id');

      // Stop log capture using the session ID
      const stopParams = { logSessionId: 'test-session-id' };
      const stopResult = await stopHandler(stopParams);

      expect(stopResult.content[0].text).toContain(
        'Log capture session test-session-id stopped successfully',
      );
      expect(stopResult.content[0].text).toContain('Log content here');
    });
  });
});
