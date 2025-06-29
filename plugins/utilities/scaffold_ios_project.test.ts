/**
 * Vitest test for scaffold_ios_project plugin
 *
 * Tests the plugin structure and iOS scaffold tool functionality
 * including parameter validation, file operations, template processing, and response formatting.
 *
 * Plugin location: plugins/utilities/scaffold_ios_project.js
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';
import scaffoldIosProject from './scaffold_ios_project.js';

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

// Mock common tool registration
vi.mock('../../src/tools/common/index.js', () => ({
  registerTool: vi.fn(),
}));

// Import mocked functions and types
import { TemplateManager } from '../../src/utils/template-manager.js';

const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;
const mockMkdir = mkdir as MockedFunction<typeof mkdir>;
const mockCp = cp as MockedFunction<typeof cp>;
const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as MockedFunction<typeof writeFile>;
const mockReaddir = readdir as MockedFunction<typeof readdir>;
const mockTemplateManager = TemplateManager as any;

describe('scaffold_ios_project plugin', () => {
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
    it('should have the correct plugin structure', () => {
      expect(scaffoldIosProject).toEqual({
        name: 'scaffold_ios_project',
        description: expect.stringContaining('Scaffold a new iOS project from templates'),
        schema: expect.any(Object),
        handler: expect.any(Function),
      });
    });

    it('should have the correct name', () => {
      expect(scaffoldIosProject.name).toBe('scaffold_ios_project');
    });

    it('should have the correct description', () => {
      expect(scaffoldIosProject.description).toBe('Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper iOS configuration.');
    });

    it('should have schema defined', () => {
      expect(scaffoldIosProject.schema).toBeDefined();
      expect(typeof scaffoldIosProject.schema).toBe('object');
    });

    it('should have handler defined', () => {
      expect(scaffoldIosProject.handler).toBeDefined();
      expect(typeof scaffoldIosProject.handler).toBe('function');
    });
  });

  describe('iOS scaffold tool handler', () => {
    it('should handle missing projectName gracefully', async () => {
      const params = {
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.app',
        // projectName is undefined - MCP validation would catch this, but handler processes it
      };

      const result = await scaffoldIosProject.handler(params);

      // Handler processes undefined projectName and returns success (validation is at MCP level)
      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": true'),
        },
      ]);
    });

    it('should return error for invalid projectName format', async () => {
      const params = {
        projectName: '123InvalidName', // Starts with number
        outputPath: '/tmp/test-projects',
      };

      const result = await scaffoldIosProject.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": false'),
        },
      ]);

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain(
        'Project name must start with a letter and contain only letters, numbers, and underscores',
      );
    });

    it('should accept valid iOS scaffolding parameters', async () => {
      const params = {
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.iosapp',
      };

      const result = await scaffoldIosProject.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": true'),
        },
      ]);
      expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('iOS');
    });

    it('should return error if project files already exist', async () => {
      mockExistsSync.mockReturnValue(true); // Project already exists

      const params = {
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
      };

      const result = await scaffoldIosProject.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": false'),
        },
      ]);

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain(
        'Xcode project files already exist in /tmp/test-projects',
      );
    });

    it('should return success response with project path', async () => {
      const params = {
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
      };

      const result = await scaffoldIosProject.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": true'),
        },
      ]);

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      expect(responseData.success).toBe(true);
      expect(responseData.projectPath).toBe('/tmp/test-projects');
      expect(responseData.platform).toBe('iOS');
    });

    it('should return error response when scaffolding fails', async () => {
      mockTemplateManager.getTemplatePath.mockRejectedValue(new Error('Template not found'));

      const params = {
        projectName: 'TestIOSApp',
        outputPath: '/tmp/test-projects',
      };

      const result = await scaffoldIosProject.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('"success": false'),
        },
      ]);

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Template not found');
    });
  });
});