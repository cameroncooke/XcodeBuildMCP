/**
 * Test for get_mac_app_path_ws plugin (re-export from macos-workspace)
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

describe('get_mac_app_path_ws Plugin (Re-export)', () => {
  it('should have the correct plugin structure from re-export', () => {
    expect(getMacAppPathWs).toBeDefined();
    expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
    expect(getMacAppPathWs.description).toContain('macOS application');
    expect(getMacAppPathWs.description).toContain('workspace');
    expect(getMacAppPathWs.schema).toBeDefined();
    expect(getMacAppPathWs.handler).toBeDefined();
    expect(typeof getMacAppPathWs.handler).toBe('function');
  });

  it('should maintain the same interface as the primary plugin', () => {
    expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
    expect(getMacAppPathWs).toHaveProperty('name');
    expect(getMacAppPathWs).toHaveProperty('description');
    expect(getMacAppPathWs).toHaveProperty('schema');
    expect(getMacAppPathWs).toHaveProperty('handler');
  });
});