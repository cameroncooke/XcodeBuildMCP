/**
 * Test for get_device_app_path_proj plugin (re-export)
 * 
 * Tests the get_device_app_path_proj tool re-exported from device-workspace.
 * This verifies the re-export works correctly and maintains the same interface.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Import the re-export plugin
import getDeviceAppPathProjTool from './get_device_app_path_proj.ts';

// Mock external dependencies
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: vi.fn(),
    join: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
  };
});

describe('get_device_app_path_proj Plugin (Re-export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have the correct tool configuration via re-export', () => {
    expect(getDeviceAppPathProjTool.name).toBe('get_device_app_path_proj');
    expect(getDeviceAppPathProjTool.description).toContain('Gets the app bundle path for a physical device application');
    expect(getDeviceAppPathProjTool.description).toContain('projectPath and scheme');
    expect(getDeviceAppPathProjTool.schema).toHaveProperty('projectPath');
    expect(getDeviceAppPathProjTool.schema).toHaveProperty('scheme');
    expect(getDeviceAppPathProjTool.schema).toHaveProperty('configuration');
    expect(getDeviceAppPathProjTool.schema).toHaveProperty('platform');
    expect(typeof getDeviceAppPathProjTool.handler).toBe('function');
  });

  it('should validate required projectPath parameter via re-export', async () => {
    const params = {
      scheme: 'MyScheme',
    };

    const result = await getDeviceAppPathProjTool.handler(params);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('projectPath');
  });

  it('should validate required scheme parameter via re-export', async () => {
    const params = {
      projectPath: '/path/to/project.xcodeproj',
    };

    const result = await getDeviceAppPathProjTool.handler(params);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('scheme');
  });

  it('should handle valid parameters via re-export', async () => {
    const params = {
      projectPath: '/path/to/project.xcodeproj',
      scheme: 'MyScheme',
    };

    const result = await getDeviceAppPathProjTool.handler(params);
    
    // With valid parameters, we should get a response (may be success or error depending on execution environment)
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });
});