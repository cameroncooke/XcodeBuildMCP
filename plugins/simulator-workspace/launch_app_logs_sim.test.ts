/**
 * Vitest tests for launch_app_logs_sim tool
 *
 * Tests the launch_app_logs_sim tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import launchAppLogsSim from './launch_app_logs_sim.js';

// Import production registration function for compatibility
import { registerLaunchAppWithLogsInSimulatorTool } from '../../src/tools/simulator/index.js';

// ✅ CORRECT: Mock external dependencies only
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// ✅ CORRECT: Mock executeCommand utility
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ CORRECT: Mock validation utilities
vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

// ✅ CORRECT: Mock common tools utilities
vi.mock('../../src/tools/common/index.js', () => ({
  createTextContent: vi.fn(),
}));

// ✅ CORRECT: Mock log capture utilities
vi.mock('../../src/utils/log_capture.js', () => ({
  startLogCapture: vi.fn(),
}));

describe('launch_app_logs_sim tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(launchAppLogsSim).toBeDefined();
      expect(launchAppLogsSim.name).toBe('launch_app_logs_sim');
      expect(launchAppLogsSim.description).toBe('Launches an app in an iOS simulator and captures its logs.');
      expect(launchAppLogsSim.schema).toBeDefined();
      expect(launchAppLogsSim.handler).toBeDefined();
      expect(typeof launchAppLogsSim.handler).toBe('function');
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockStartLogCapture: MockedFunction<any>;
  let mockCreateTextContent: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.js');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Mock log capture utilities
    const logCaptureModule = await import('../../src/utils/log_capture.js');
    mockStartLogCapture = logCaptureModule.startLogCapture as MockedFunction<any>;

    // Mock common utilities
    const commonModule = await import('../../src/tools/common/index.js');
    mockCreateTextContent = commonModule.createTextContent as MockedFunction<any>;

    // Mock server object with tool method
    mockServer = {
      tool: vi.fn(),
    };

    // Default mock behaviors
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    mockCreateTextContent.mockImplementation((text) => ({
      type: 'text',
      text,
    }));

    vi.clearAllMocks();
  });

  describe('registerLaunchAppWithLogsInSimulatorTool', () => {
    it('should register the launch app with logs in simulator tool correctly', () => {
      // ✅ Test actual production function
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      // ✅ Verify production function called server.tool correctly
      expect(mockServer.tool).toHaveBeenCalledWith(
        'launch_app_logs_sim',
        'Launches an app in an iOS simulator and captures its logs.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful app launch with log capture', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock successful log capture
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'test-session-123',
        error: null,
      });

      // ✅ Test actual production handler with successful launch and log capture
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp' 
      });

      expect(mockStartLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
      });
      expect(mockCreateTextContent).toHaveBeenCalledWith(
        expect.stringContaining('App launched successfully in simulator test-uuid-123 with log capture enabled')
      );
      expect(mockCreateTextContent).toHaveBeenCalledWith(
        expect.stringContaining('Log capture session ID: test-session-123')
      );
      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();
    });

    it('should handle app launch with additional arguments', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock successful log capture
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'test-session-456',
        error: null,
      });

      // ✅ Test actual production handler with additional arguments
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp',
        args: ['--debug', '--verbose']
      });

      expect(mockStartLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
      });
      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();
    });

    it('should handle log capture failure', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock failed log capture
      mockStartLogCapture.mockResolvedValue({
        sessionId: null,
        error: 'Failed to start log capture',
      });

      // ✅ Test actual production handler with log capture failure
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp' 
      });

      expect(mockStartLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        captureConsole: true,
      });
      expect(mockCreateTextContent).toHaveBeenCalledWith(
        'App was launched but log capture failed: Failed to start log capture'
      );
      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);
    });

    it('should handle validation failures for simulatorUuid', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock validation failure for simulatorUuid
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      // ✅ Test actual production handler with validation failure
      const result = await handler({ 
        simulatorUuid: '', 
        bundleId: 'com.example.testapp' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'simulatorUuid is required' }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle validation failures for bundleId', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock validation success for simulatorUuid but failure for bundleId
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'bundleId is required' }],
            isError: true,
          },
        });

      // ✅ Test actual production handler with validation failure
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: '' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'bundleId is required' }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should pass all parameters to startLogCapture with console enabled', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock successful log capture
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'test-session-789',
        error: null,
      });

      // ✅ Test actual production handler to verify log capture parameters
      await handler({ 
        simulatorUuid: 'uuid-456', 
        bundleId: 'com.test.myapp' 
      });

      expect(mockStartLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'uuid-456',
        bundleId: 'com.test.myapp',
        captureConsole: true,
      });
    });

    it('should include session ID and next steps in success message', async () => {
      registerLaunchAppWithLogsInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'launch_app_logs_sim',
      );
      const handler = handlerCall[3];

      // Mock successful log capture
      mockStartLogCapture.mockResolvedValue({
        sessionId: 'session-abc-def',
        error: null,
      });

      // ✅ Test actual production handler to verify success message content
      const result = await handler({ 
        simulatorUuid: 'test-uuid-789', 
        bundleId: 'com.example.testapp' 
      });

      expect(mockCreateTextContent).toHaveBeenCalledWith(
        expect.stringContaining('session-abc-def')
      );
      expect(mockCreateTextContent).toHaveBeenCalledWith(
        expect.stringContaining('Next Steps:')
      );
      expect(mockCreateTextContent).toHaveBeenCalledWith(
        expect.stringContaining('stop_and_get_simulator_log')
      );
      expect(result.isError).toBeUndefined();
    });
  });

});