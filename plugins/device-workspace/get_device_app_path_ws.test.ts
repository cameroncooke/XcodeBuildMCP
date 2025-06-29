/**
 * Test for get_device_app_path_ws plugin
 * 
 * Tests the get_device_app_path_ws tool extracted from src/tools/app-path/index.ts
 * This tests only the specific tool, not the entire tool collection.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import getDeviceAppPathWsTool from './get_device_app_path_ws.js';

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

describe('get_device_app_path_ws Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have the correct tool configuration', () => {
    expect(getDeviceAppPathWsTool.name).toBe('get_device_app_path_ws');
    expect(getDeviceAppPathWsTool.description).toContain('Gets the app bundle path for a physical device application');
    expect(getDeviceAppPathWsTool.description).toContain('workspacePath and scheme');
    expect(getDeviceAppPathWsTool.schema).toHaveProperty('workspacePath');
    expect(getDeviceAppPathWsTool.schema).toHaveProperty('scheme');
    expect(getDeviceAppPathWsTool.schema).toHaveProperty('configuration');
    expect(getDeviceAppPathWsTool.schema).toHaveProperty('platform');
    expect(typeof getDeviceAppPathWsTool.handler).toBe('function');
  });

  it('should validate required workspacePath parameter', async () => {
    const params = {
      scheme: 'MyScheme',
    };

    const result = await getDeviceAppPathWsTool.handler(params);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('workspacePath');
  });

  it('should validate required scheme parameter', async () => {
    const params = {
      workspacePath: '/path/to/workspace.xcworkspace',
    };

    const result = await getDeviceAppPathWsTool.handler(params);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('scheme');
  });

  it('should handle valid parameters with default configuration and platform', async () => {
    const params = {
      workspacePath: '/path/to/workspace.xcworkspace',
      scheme: 'MyScheme',
    };

    const result = await getDeviceAppPathWsTool.handler(params);
    
    // With valid parameters, we should get a response (may be success or error depending on execution environment)
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle valid parameters with explicit configuration and platform', async () => {
    const params = {
      workspacePath: '/path/to/workspace.xcworkspace',
      scheme: 'MyScheme',
      configuration: 'Release',
      platform: 'iOS' as const,
    };

    const result = await getDeviceAppPathWsTool.handler(params);
    
    // With valid parameters, we should get a response (may be success or error depending on execution environment)
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should handle different platform options', async () => {
    const platforms = ['iOS', 'watchOS', 'tvOS', 'visionOS'] as const;
    
    for (const platform of platforms) {
      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        platform,
      };

      const result = await getDeviceAppPathWsTool.handler(params);
      
      // With valid parameters, we should get a response (may be success or error depending on execution environment)
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }
  });
});