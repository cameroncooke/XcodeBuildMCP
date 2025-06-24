/**
 * Vitest test for scaffold tools
 *
 * Tests the actual production functions scaffoldProject and registerScaffoldTools
 * including parameter validation, file operations, template processing, and response formatting.
 *
 * Canonical tool location: src/tools/scaffold.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';
import { registerScaffoldTools } from './scaffold.js';

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
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock TemplateManager to prevent network calls
vi.mock('../utils/template-manager.js', () => ({
  TemplateManager: {
    getTemplatePath: vi.fn(),
    cleanup: vi.fn(),
  },
}));

// Mock common tool registration
vi.mock('./common.js', () => ({
  registerTool: vi.fn(),
}));

// Import mocked functions and types
import { TemplateManager } from '../utils/template-manager.js';
import { registerTool } from './common.js';

const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;
const mockMkdir = mkdir as MockedFunction<typeof mkdir>;
const mockCp = cp as MockedFunction<typeof cp>;
const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as MockedFunction<typeof writeFile>;
const mockReaddir = readdir as MockedFunction<typeof readdir>;
const mockTemplateManager = TemplateManager as any;
const mockRegisterTool = registerTool as MockedFunction<typeof registerTool>;

describe('scaffold tools', () => {
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

  describe('registerScaffoldTools function', () => {
    it('should register iOS scaffold tool with correct parameters', () => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScaffoldTools(mockServer);

      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'scaffold_ios_project',
        expect.stringContaining('Scaffold a new iOS project from templates'),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should register macOS scaffold tool with correct parameters', () => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScaffoldTools(mockServer);

      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'scaffold_macos_project',
        expect.stringContaining('Scaffold a new macOS project from templates'),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should register both iOS and macOS tools', () => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScaffoldTools(mockServer);

      expect(mockRegisterTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('iOS scaffold tool handler', () => {
    let iosToolHandler: (params: any) => Promise<any>;

    beforeEach(() => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScaffoldTools(mockServer);

      // Extract the iOS tool handler from the first registerTool call
      const iosRegistration = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'scaffold_ios_project',
      );
      iosToolHandler = iosRegistration![4]; // Handler is the 5th argument
    });

    it('should handle missing projectName gracefully', async () => {
      const params = {
        outputPath: '/tmp/test-projects',
        bundleIdentifier: 'com.test.app',
        // projectName is undefined - MCP validation would catch this, but handler processes it
      };

      const result = await iosToolHandler(params);

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

      const result = await iosToolHandler(params);

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

      const result = await iosToolHandler(params);

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

      const result = await iosToolHandler(params);

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

      const result = await iosToolHandler(params);

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

      const result = await iosToolHandler(params);

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

  describe('macOS scaffold tool handler', () => {
    let macosToolHandler: (params: any) => Promise<any>;

    beforeEach(() => {
      const mockServer = {
        tool: vi.fn(),
      } as any;

      registerScaffoldTools(mockServer);

      // Extract the macOS tool handler from the second registerTool call
      const macosRegistration = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'scaffold_macos_project',
      );
      macosToolHandler = macosRegistration![4]; // Handler is the 5th argument
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
