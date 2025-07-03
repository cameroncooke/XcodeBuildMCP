/**
 * Vitest test for scaffold_macos_project plugin
 *
 * Tests the plugin structure and exported components for scaffold_macos_project tool.
 *
 * Plugin location: plugins/utilities/scaffold_macos_project.js
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';
import scaffoldMacosProject from './scaffold_macos_project.js';

// Mock external dependencies only
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  cp: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock TemplateManager to prevent network calls
vi.mock('../../src/utils/template-manager.js', () => ({
  TemplateManager: {
    getTemplatePath: vi.fn(),
    cleanup: vi.fn(),
  },
}));

// Mock removed - no longer needed for plugin testing

// Import mocked functions and types
import { TemplateManager } from '../../src/utils/template-manager.js';

const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;
const mockMkdir = mkdir as MockedFunction<typeof mkdir>;
const mockCp = cp as MockedFunction<typeof cp>;
const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as MockedFunction<typeof writeFile>;
const mockReaddir = readdir as MockedFunction<typeof readdir>;
const mockTemplateManager = TemplateManager as any;

describe('scaffold_macos_project plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock TemplateManager to return mock template paths
    mockTemplateManager.getTemplatePath.mockImplementation((platform: string) => {
      return Promise.resolve(`/tmp/test-templates/${platform.toLowerCase()}`);
    });
    mockTemplateManager.cleanup.mockResolvedValue();

    // Setup default mock implementations for file operations
    mockExistsSync.mockReturnValue(false); // No existing projects
    mockMkdir.mockResolvedValue(undefined);
    mockCp.mockResolvedValue();
    mockReadFile.mockResolvedValue('template content with MyProject placeholder');
    mockWriteFile.mockResolvedValue();

    // Mock readdir to return template files
    mockReaddir.mockResolvedValue([
      { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
      { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
    ]);
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(scaffoldMacosProject).toBeDefined();
      expect(scaffoldMacosProject.name).toBe('scaffold_macos_project');
      expect(scaffoldMacosProject.description).toContain('Scaffold a new macOS project from templates');
      expect(scaffoldMacosProject.schema).toBeDefined();
      expect(scaffoldMacosProject.handler).toBeDefined();
      expect(typeof scaffoldMacosProject.handler).toBe('function');
    });

    it('should export the correct tool name', () => {
      expect(scaffoldMacosProject.name).toBe('scaffold_macos_project');
    });

    it('should export a function handler', () => {
      expect(typeof scaffoldMacosProject.handler).toBe('function');
    });
  });

  describe('macOS scaffold tool handler', () => {
    let macosToolHandler: (params: any) => Promise<any>;

    beforeEach(() => {
      // Use the handler from the plugin
      macosToolHandler = scaffoldMacosProject.handler;
    });

    it('should handle missing projectName gracefully', async () => {
      const params = {
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.app',
        // projectName is undefined - MCP validation would catch this, but handler processes it
      };

      const result = await macosToolHandler(params);

      // Handler processes undefined projectName and returns success (validation is at MCP level)
      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": true'),
        },
      ]);
    });

    it('should accept valid macOS scaffolding parameters', async () => {
      const params = {
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.macapp',
      };

      const result = await macosToolHandler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": true'),
        },
      ]);
      expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('macOS');
    });

    it('should return success response with project path', async () => {
      const params = {
        projectName: 'TestMacApp',
        outputPath: '/tmp/test-projects',
      };

      const result = await macosToolHandler(params);

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      expect(responseData.success).toBe(true);
      expect(responseData.projectPath).toBe('/tmp/test-projects');
      expect(responseData.platform).toBe('macOS');
    });
  });
});
