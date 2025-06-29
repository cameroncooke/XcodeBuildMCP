/**
 * Test for get_mac_app_path_ws plugin
 */

import { describe, it, expect, vi } from 'vitest';
import getMacAppPathWs from './get_mac_app_path_ws.js';

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock executeCommand to prevent actual command execution
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

describe('get_mac_app_path_ws Plugin', () => {
  it('should have the correct plugin structure', () => {
    expect(getMacAppPathWs).toBeDefined();
    expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
    expect(getMacAppPathWs.description).toContain('macOS application');
    expect(getMacAppPathWs.description).toContain('workspace');
    expect(getMacAppPathWs.schema).toBeDefined();
    expect(getMacAppPathWs.handler).toBeDefined();
    expect(typeof getMacAppPathWs.handler).toBe('function');
  });

  it('should have the correct tool name', () => {
    expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
  });

  it('should include required schema properties', () => {
    const schema = getMacAppPathWs.schema;
    expect(schema.workspacePath).toBeDefined();
    expect(schema.scheme).toBeDefined();
    expect(schema.configuration).toBeDefined();
    expect(schema.arch).toBeDefined();
  });

  it('should be exported as default export', () => {
    expect(getMacAppPathWs).toHaveProperty('name');
    expect(getMacAppPathWs).toHaveProperty('description');
    expect(getMacAppPathWs).toHaveProperty('schema');
    expect(getMacAppPathWs).toHaveProperty('handler');
  });
});