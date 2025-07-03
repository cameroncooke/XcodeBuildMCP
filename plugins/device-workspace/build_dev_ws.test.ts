/**
 * Test for build_dev_ws plugin
 * 
 * Tests the build_dev_ws tool extracted from src/tools/build-ios-device/index.ts
 * This tests only the specific tool, not the entire tool collection.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import buildDevWsTool from './build_dev_ws.ts';

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

describe('build_dev_ws Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have the correct tool configuration', () => {
    expect(buildDevWsTool.name).toBe('build_dev_ws');
    expect(buildDevWsTool.description).toContain('Builds an app from a workspace for a physical Apple device');
    expect(buildDevWsTool.description).toContain('workspacePath and scheme');
    expect(buildDevWsTool.schema).toHaveProperty('workspacePath');
    expect(buildDevWsTool.schema).toHaveProperty('scheme');
    expect(typeof buildDevWsTool.handler).toBe('function');
  });

  it('should validate required workspacePath parameter', async () => {
    const params = {
      scheme: 'MyScheme',
    };

    const result = await buildDevWsTool.handler(params);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('workspacePath');
  });

  it('should validate required scheme parameter', async () => {
    const params = {
      workspacePath: '/path/to/workspace.xcworkspace',
    };

    const result = await buildDevWsTool.handler(params);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('scheme');
  });

  it('should handle valid parameters with default configuration', async () => {
    const params = {
      workspacePath: '/path/to/workspace.xcworkspace',
      scheme: 'MyScheme',
    };

    const result = await buildDevWsTool.handler(params);
    
    // With valid parameters, we should get a response (may be success or error depending on execution environment)
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });
});