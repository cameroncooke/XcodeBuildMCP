import { describe, it, expect, vi } from 'vitest';
import testDeviceWs from './test_device_ws.ts';

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

describe('test_device_ws plugin', () => {
  it('should export correct plugin structure', () => {
    expect(testDeviceWs).toBeDefined();
    expect(testDeviceWs.name).toBe('test_device_ws');
    expect(testDeviceWs.description).toContain('Runs tests for an Apple workspace on a physical device');
    expect(testDeviceWs.schema).toBeDefined();
    expect(testDeviceWs.handler).toBeDefined();
    expect(typeof testDeviceWs.handler).toBe('function');
  });

  it('should have correct schema properties', () => {
    const schema = testDeviceWs.schema;
    expect(schema.workspacePath).toBeDefined();
    expect(schema.scheme).toBeDefined();
    expect(schema.deviceId).toBeDefined();
    expect(schema.configuration).toBeDefined();
    expect(schema.derivedDataPath).toBeDefined();
    expect(schema.extraArgs).toBeDefined();
    expect(schema.preferXcodebuild).toBeDefined();
    expect(schema.platform).toBeDefined();
  });

  it('should match expected tool configuration', () => {
    // Verify this is a device workspace test tool
    expect(testDeviceWs.name).toContain('device');
    expect(testDeviceWs.name).toContain('ws');
    expect(testDeviceWs.description).toContain('physical device');
    expect(testDeviceWs.description).toContain('workspace');
  });
});