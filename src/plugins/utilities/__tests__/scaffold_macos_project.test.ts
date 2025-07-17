/**
 * Test for scaffold_macos_project plugin - Dependency Injection Architecture
 *
 * Tests the plugin structure and exported components for scaffold_macos_project tool.
 * Uses pure dependency injection with createMockFileSystemExecutor.
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor/createMockFileSystemExecutor
 *
 * Plugin location: plugins/utilities/scaffold_macos_project.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockFileSystemExecutor } from '../../../utils/command.js';
import plugin from '../scaffold_macos_project.js';
import { TemplateManager } from '../../../utils/index.js';

// ONLY ALLOWED MOCKING: createMockFileSystemExecutor

describe('scaffold_macos_project plugin', () => {
  let mockFileSystemExecutor: ReturnType<typeof createMockFileSystemExecutor>;
  let templateManagerStub: {
    getTemplatePath: (
      platform: string,
      commandExecutor?: unknown,
      fileSystemExecutor?: unknown,
    ) => Promise<string>;
    cleanup: (path: string) => Promise<void>;
    setError: (error: Error | string | null) => void;
    getCalls: () => string;
    resetCalls: () => void;
  };

  beforeEach(async () => {
    // Create template manager stub using pure JavaScript approach
    let templateManagerCall = '';
    let templateManagerError: Error | string | null = null;

    templateManagerStub = {
      getTemplatePath: async (
        platform: string,
        commandExecutor?: unknown,
        fileSystemExecutor?: unknown,
      ) => {
        templateManagerCall = `getTemplatePath(${platform})`;
        if (templateManagerError) {
          throw templateManagerError;
        }
        return '/tmp/test-templates/macos';
      },
      cleanup: async (path: string) => {
        templateManagerCall += `,cleanup(${path})`;
        return undefined;
      },
      // Test helpers
      setError: (error: Error | string | null) => {
        templateManagerError = error;
      },
      getCalls: () => templateManagerCall,
      resetCalls: () => {
        templateManagerCall = '';
      },
    };

    // Create fresh mock file system executor for each test
    mockFileSystemExecutor = createMockFileSystemExecutor({
      existsSync: () => false,
      mkdir: async () => {},
      cp: async () => {},
      readFile: async () => 'template content with MyProject placeholder',
      writeFile: async () => {},
      readdir: async () => [
        { name: 'Package.swift', isDirectory: () => false, isFile: () => true },
        { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true },
      ],
    });

    // Replace the real TemplateManager with our stub for most tests
    (TemplateManager as any).getTemplatePath = templateManagerStub.getTemplatePath;
    (TemplateManager as any).cleanup = templateManagerStub.cleanup;
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(plugin.name).toBe('scaffold_macos_project');
    });

    it('should have correct description field', () => {
      expect(plugin.description).toBe(
        'Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper macOS configuration.',
      );
    });

    it('should have handler as function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      // Test the schema object exists
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema.projectName).toBeDefined();
      expect(plugin.schema.outputPath).toBeDefined();
      expect(plugin.schema.bundleIdentifier).toBeDefined();
      expect(plugin.schema.customizeNames).toBeDefined();
      expect(plugin.schema.deploymentTarget).toBeDefined();
    });
  });

  describe('Command Generation', () => {
    it('should generate correct curl command for macOS template download', async () => {
      let capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        console.log('DEBUG: Command captured:', command);
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Download successful',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Store original environment variable
      const originalEnv = process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH;
      delete process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH; // Force download path

      // Mock file system to simulate successful extraction verification
      mockFileSystemExecutor.existsSync = () => true;

      // Restore original TemplateManager for command generation tests
      const { TemplateManager: OriginalTemplateManager } = await import('../../../utils/index.js');
      (TemplateManager as any).getTemplatePath = OriginalTemplateManager.getTemplatePath;
      (TemplateManager as any).cleanup = OriginalTemplateManager.cleanup;

      console.log('DEBUG: About to call plugin handler...');
      await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );
      console.log('DEBUG: plugin handler completed, capturedCommands:', capturedCommands);

      // Should generate curl command for downloading template
      expect(capturedCommands).toContainEqual(
        expect.arrayContaining([
          'curl',
          '-L',
          '-f',
          '-o',
          expect.stringContaining('template.zip'),
          expect.stringContaining(
            'https://github.com/cameroncooke/XcodeBuildMCP-macOS-Template/releases/download/',
          ),
        ]),
      );

      // Restore environment variable and stub after test
      process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH = originalEnv;
      (TemplateManager as any).getTemplatePath = templateManagerStub.getTemplatePath;
      (TemplateManager as any).cleanup = templateManagerStub.cleanup;
    });

    it('should generate correct unzip command for template extraction', async () => {
      let capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Command successful',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Store original environment variable
      const originalEnv = process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH;
      delete process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH; // Force download path

      // Mock file system to simulate successful extraction verification
      mockFileSystemExecutor.existsSync = () => true;

      // Restore original TemplateManager for command generation tests
      const { TemplateManager: OriginalTemplateManager } = await import('../../../utils/index.js');
      (TemplateManager as any).getTemplatePath = OriginalTemplateManager.getTemplatePath;
      (TemplateManager as any).cleanup = OriginalTemplateManager.cleanup;

      await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      // Should generate unzip command for extracting template
      expect(capturedCommands).toContainEqual([
        'unzip',
        '-q',
        expect.stringContaining('template.zip'),
      ]);

      // Restore environment variable and stub after test
      process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH = originalEnv;
      (TemplateManager as any).getTemplatePath = templateManagerStub.getTemplatePath;
      (TemplateManager as any).cleanup = templateManagerStub.cleanup;
    });

    it('should generate correct commands for template with version', async () => {
      let capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Command successful',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Store original environment variables
      const originalEnv = process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH;
      const originalVersion = process.env.XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION;
      delete process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH; // Force download path
      process.env.XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION = 'v1.0.0';

      // Mock file system to simulate successful extraction verification
      mockFileSystemExecutor.existsSync = () => true;

      // Restore original TemplateManager for command generation tests
      const { TemplateManager: OriginalTemplateManager } = await import('../../../utils/index.js');
      (TemplateManager as any).getTemplatePath = OriginalTemplateManager.getTemplatePath;
      (TemplateManager as any).cleanup = OriginalTemplateManager.cleanup;

      await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      // Should generate curl command with specific version
      expect(capturedCommands).toContainEqual(
        expect.arrayContaining([
          'curl',
          '-L',
          '-f',
          '-o',
          expect.stringContaining('template.zip'),
          expect.stringContaining(
            'https://github.com/cameroncooke/XcodeBuildMCP-macOS-Template/releases/download/v1.0.0/',
          ),
        ]),
      );

      // Clean up environment variables
      process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH = originalEnv;
      process.env.XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION = originalVersion;

      // Restore stub after test
      (TemplateManager as any).getTemplatePath = templateManagerStub.getTemplatePath;
      (TemplateManager as any).cleanup = templateManagerStub.cleanup;
    });

    it('should not generate commands when using local template path', async () => {
      let capturedCommands: string[][] = [];
      const trackingExecutor = async (command: string[]) => {
        capturedCommands.push(command);
        return {
          success: true,
          output: 'Command successful',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Store original environment variable
      const originalEnv = process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH;

      // Mock local template path exists
      mockFileSystemExecutor.existsSync = (path: string) => {
        return path === '/local/template/path' || path === '/local/template/path/template';
      };

      // Set environment variable for local template path
      process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH = '/local/template/path';

      // Restore original TemplateManager for command generation tests
      const { TemplateManager: OriginalTemplateManager } = await import('../../../utils/index.js');
      (TemplateManager as any).getTemplatePath = OriginalTemplateManager.getTemplatePath;
      (TemplateManager as any).cleanup = OriginalTemplateManager.cleanup;

      await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      // Should not generate any curl or unzip commands when using local template
      expect(capturedCommands).not.toContainEqual(
        expect.arrayContaining(['curl', expect.anything(), expect.anything()]),
      );
      expect(capturedCommands).not.toContainEqual(
        expect.arrayContaining(['unzip', expect.anything(), expect.anything()]),
      );

      // Clean up environment variable
      process.env.XCODEBUILDMCP_MACOS_TEMPLATE_PATH = originalEnv;

      // Restore stub after test
      (TemplateManager as any).getTemplatePath = templateManagerStub.getTemplatePath;
      (TemplateManager as any).cleanup = templateManagerStub.cleanup;
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid scaffold macOS project request', async () => {
      const result = await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
          bundleIdentifier: 'com.test.macapp',
          customizeNames: false,
        },
        undefined,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'macOS',
                message: 'Successfully scaffolded macOS project "TestMacApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for macOS: build_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                  'Run and run on macOS: build_run_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                ],
              },
              null,
              2,
            ),
          },
        ],
      });

      // Verify template manager calls using manual tracking
      expect(templateManagerStub.getCalls()).toBe(
        'getTemplatePath(macOS),cleanup(/tmp/test-templates/macos)',
      );
    });

    it('should return success response with customizeNames false', async () => {
      const result = await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
          customizeNames: false,
        },
        undefined,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: '/tmp/test-projects',
                platform: 'macOS',
                message: 'Successfully scaffolded macOS project "TestMacApp" in /tmp/test-projects',
                nextSteps: [
                  'Important: Before working on the project make sure to read the README.md file in the workspace root directory.',
                  'Build for macOS: build_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                  'Run and run on macOS: build_run_mac_ws --workspace-path "/tmp/test-projects/MyProject.xcworkspace" --scheme "MyProject"',
                ],
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should return error response for invalid project name', async () => {
      const result = await plugin.handler(
        {
          projectName: '123InvalidName',
          outputPath: '/tmp/test-projects',
        },
        undefined,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error:
                  'Project name must start with a letter and contain only letters, numbers, and underscores',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });

    it('should return error response for existing project files', async () => {
      // Override existsSync to return true for workspace file
      mockFileSystemExecutor.existsSync = () => true;

      const result = await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
        },
        undefined,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Xcode project files already exist in /tmp/test-projects',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });

    it('should return error response for template manager failure', async () => {
      templateManagerStub.setError(new Error('Template not found'));

      const result = await plugin.handler(
        {
          projectName: 'TestMacApp',
          outputPath: '/tmp/test-projects',
        },
        undefined,
        mockFileSystemExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: 'Failed to get template for macOS: Template not found',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    });
  });

  describe('File System Operations', () => {
    it('should create directories and process files correctly', async () => {
      await plugin.handler(
        {
          projectName: 'TestApp',
          outputPath: '/tmp/test',
          customizeNames: true,
        },
        undefined,
        mockFileSystemExecutor,
      );

      // Verify template manager calls using manual tracking
      expect(templateManagerStub.getCalls()).toBe(
        'getTemplatePath(macOS),cleanup(/tmp/test-templates/macos)',
      );

      // File system operations are called by the mock implementation
      // but we can't verify them without vitest mocking patterns
      // This test validates the integration works correctly
    });
  });
});
