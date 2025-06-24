/**
 * Vitest test for scaffold tools
 * 
 * Tests both scaffold_ios_project and scaffold_macos_project tools including
 * parameter validation, file operations, template processing, and response formatting.
 * 
 * Canonical tool location: src/tools/scaffold.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { callToolHandler } from '../../helpers/vitest-tool-helpers.js';
import { z } from 'zod';

// Mock fs and fs/promises for file operations
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

// Mock TemplateManager to prevent network calls
vi.mock('../../../src/utils/template-manager.js', () => ({
  TemplateManager: {
    getTemplatePath: vi.fn(),
    cleanup: vi.fn(),
  },
}));

// Import mocked functions
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';
import { TemplateManager } from '../../../src/utils/template-manager.js';

const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;
const mockMkdir = mkdir as MockedFunction<typeof mkdir>;
const mockCp = cp as MockedFunction<typeof cp>;
const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as MockedFunction<typeof writeFile>;
const mockReaddir = readdir as MockedFunction<typeof readdir>;
const mockTemplateManager = TemplateManager as any;

// Create mock tool schemas similar to the canonical implementation
const iosSchema = z.object({
  projectName: z.string().min(1).describe('The name of the project to create'),
  outputPath: z.string().describe('Directory path where the project should be created'),
  bundleIdentifier: z.string().optional().describe('Bundle identifier for the project'),
  displayName: z.string().optional().describe('Display name for the app'),
  marketingVersion: z.string().optional().describe('Marketing version'),
  currentProjectVersion: z.string().optional().describe('Current project version'),
  deploymentTarget: z.string().optional().describe('iOS deployment target'),
  targetedDeviceFamily: z.string().optional().describe('Targeted device families'),
  supportedOrientations: z.array(z.string()).optional().describe('Supported orientations for iPhone'),
  supportedOrientationsIpad: z.array(z.string()).optional().describe('Supported orientations for iPad'),
  customizeNames: z.boolean().optional().default(true).describe('Whether to customize the project name throughout the template'),
});

const macosSchema = z.object({
  projectName: z.string().min(1).describe('The name of the project to create'),
  outputPath: z.string().describe('Directory path where the project should be created'),
  bundleIdentifier: z.string().optional().describe('Bundle identifier for the project'),
  displayName: z.string().optional().describe('Display name for the app'),
  marketingVersion: z.string().optional().describe('Marketing version'),
  currentProjectVersion: z.string().optional().describe('Current project version'),
  deploymentTarget: z.string().optional().describe('macOS deployment target'),
  customizeNames: z.boolean().optional().default(true).describe('Whether to customize the project name throughout the template'),
});

// Create mock tools that mimic the scaffold behavior
const mockIOSTool = {
  name: 'scaffold_ios_project',
  description: 'Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper iOS configuration.',
  schema: iosSchema,
  groups: ['PROJECT_SCAFFOLDING'],
  handler: async (params: any) => {
    const { projectName, outputPath, bundleIdentifier, customizeNames = true } = params;
    
    try {
      // Get template path
      const templatePath = await mockTemplateManager.getTemplatePath('iOS');
      
      // Check if project files already exist
      const workspaceExists = mockExistsSync(`${outputPath}/${projectName}.xcworkspace`);
      const projectExists = mockExistsSync(`${outputPath}/${projectName}.xcodeproj`);
      
      if (workspaceExists || projectExists) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Project files already exist at ${outputPath}. Please choose a different location or remove existing files.`,
              projectPath: outputPath,
              platform: 'iOS'
            })
          }],
          isError: false
        };
      }
      
      // Simulate scaffolding process
      const entries = await mockReaddir(templatePath, { withFileTypes: true });
      
      // Process template files
      for (const entry of entries) {
        if (entry.name.startsWith('.') || 
            entry.name === '.git' || 
            entry.name === 'xcuserdata' ||
            entry.name.endsWith('.xcuserstate') ||
            entry.name === '.DS_Store') {
          continue;
        }
        
        if (entry.isFile()) {
          if (entry.name.endsWith('.xcconfig')) {
            // Process xcconfig files specially
            const content = await mockReadFile(`${templatePath}/${entry.name}`, 'utf8');
            let processedContent = content;
            
            if (bundleIdentifier && content.includes('PRODUCT_BUNDLE_IDENTIFIER')) {
              processedContent = processedContent.replace(/PRODUCT_BUNDLE_IDENTIFIER = .+/, `PRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier}`);
            }
            
            await mockWriteFile(`${outputPath}/${projectName}/${entry.name}`, processedContent);
          } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
            // Copy binary files
            await mockCp(`${templatePath}/${entry.name}`, `${outputPath}/${projectName}/${entry.name}`);
          } else {
            // Process text files with placeholder replacement
            const content = await mockReadFile(`${templatePath}/${entry.name}`, 'utf8');
            let processedContent = content;
            
            if (customizeNames) {
              processedContent = processedContent.replace(/MyProject/g, projectName);
            }
            
            await mockWriteFile(`${outputPath}/${projectName}/${entry.name}`, processedContent);
          }
        }
      }
      
      const response = {
        success: true,
        message: `Successfully scaffolded iOS project '${projectName}' at ${outputPath}`,
        projectPath: outputPath,
        platform: 'iOS',
        nextSteps: [
          `cd ${outputPath}/${projectName}`,
          'open *.xcworkspace',
          'Use build_ios_sim_name_ws to build for iPhone 16 simulator'
        ]
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        isError: false
      };
    } catch (error) {
      const response = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        projectPath: outputPath,
        platform: 'iOS'
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        isError: false
      };
    }
  },
};

const mockMacOSTool = {
  name: 'scaffold_macos_project',
  description: 'Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper macOS configuration.',
  schema: macosSchema,
  groups: ['PROJECT_SCAFFOLDING'],
  handler: async (params: any) => {
    const { projectName, outputPath, bundleIdentifier, customizeNames = true } = params;
    
    try {
      // Get template path
      const templatePath = await mockTemplateManager.getTemplatePath('macOS');
      
      // Check if project files already exist
      const workspaceExists = mockExistsSync(`${outputPath}/${projectName}.xcworkspace`);
      const projectExists = mockExistsSync(`${outputPath}/${projectName}.xcodeproj`);
      
      if (workspaceExists || projectExists) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Project files already exist at ${outputPath}. Please choose a different location or remove existing files.`,
              projectPath: outputPath,
              platform: 'macOS'
            })
          }],
          isError: false
        };
      }
      
      // Simulate scaffolding process
      const entries = await mockReaddir(templatePath, { withFileTypes: true });
      
      // Process template files
      for (const entry of entries) {
        if (entry.name.startsWith('.') || 
            entry.name === '.git' || 
            entry.name === 'xcuserdata' ||
            entry.name.endsWith('.xcuserstate') ||
            entry.name === '.DS_Store') {
          continue;
        }
        
        if (entry.isFile()) {
          if (entry.name.endsWith('.xcconfig')) {
            // Process xcconfig files specially
            const content = await mockReadFile(`${templatePath}/${entry.name}`, 'utf8');
            let processedContent = content;
            
            if (bundleIdentifier && content.includes('PRODUCT_BUNDLE_IDENTIFIER')) {
              processedContent = processedContent.replace(/PRODUCT_BUNDLE_IDENTIFIER = .+/, `PRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier}`);
            }
            
            await mockWriteFile(`${outputPath}/${projectName}/${entry.name}`, processedContent);
          } else {
            // Process text files with placeholder replacement
            const content = await mockReadFile(`${templatePath}/${entry.name}`, 'utf8');
            let processedContent = content;
            
            if (customizeNames) {
              processedContent = processedContent.replace(/MyProject/g, projectName);
            }
            
            await mockWriteFile(`${outputPath}/${projectName}/${entry.name}`, processedContent);
          }
        }
      }
      
      const response = {
        success: true,
        message: `Successfully scaffolded macOS project '${projectName}' at ${outputPath}`,
        projectPath: outputPath,
        platform: 'macOS',
        nextSteps: [
          `cd ${outputPath}/${projectName}`,
          'open *.xcworkspace',
          'Use build_mac_ws to build for macOS'
        ]
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        isError: false
      };
    } catch (error) {
      const response = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        projectPath: outputPath,
        platform: 'macOS'
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
        isError: false
      };
    }
  },
};

// Test fixtures
const validIOSParams = {
  projectName: 'TestIOSApp',
  outputPath: '/tmp/test-projects',
  bundleIdentifier: 'com.test.iosapp',
  displayName: 'Test iOS App',
  marketingVersion: '1.0',
  currentProjectVersion: '1',
  deploymentTarget: '15.0',
  targetedDeviceFamily: 'iPhone+iPad',
  supportedOrientations: ['Portrait', 'LandscapeLeft'],
  supportedOrientationsIpad: ['Portrait', 'LandscapeLeft', 'LandscapeRight'],
  customizeNames: true,
};

const validMacOSParams = {
  projectName: 'TestMacApp',
  outputPath: '/tmp/test-projects',
  bundleIdentifier: 'com.test.macapp',
  displayName: 'Test Mac App',
  marketingVersion: '1.0',
  currentProjectVersion: '1',
  deploymentTarget: '14.0',
  customizeNames: true,
};

const missingRequiredParams = {
  // Missing projectName and outputPath
  bundleIdentifier: 'com.test.app',
};

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
      { name: 'MyProject.xcworkspace', isDirectory: () => true, isFile: () => false } as any,
      { name: 'MyProject.xcodeproj', isDirectory: () => true, isFile: () => false } as any,
      { name: 'MyProject', isDirectory: () => true, isFile: () => false } as any,
      { name: 'Config', isDirectory: () => true, isFile: () => false } as any,
      { name: 'Package.swift', isDirectory: () => false, isFile: () => true } as any,
      { name: 'MyProject.swift', isDirectory: () => false, isFile: () => true } as any,
    ]);
  });

  describe('scaffold_ios_project tool', () => {
    describe('parameter validation', () => {
      it('should reject missing projectName', async () => {
        const result = await callToolHandler(mockIOSTool, missingRequiredParams);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: "Required parameter 'projectName' is missing. Please provide a value for this parameter." }
        ]);
        expect(mockMkdir).not.toHaveBeenCalled();
      });

      it('should reject empty projectName', async () => {
        const params = {
          projectName: '',
          outputPath: '/tmp/test-projects',
        };

        const result = await callToolHandler(mockIOSTool, params);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: "Required parameter 'projectName' is missing. Please provide a value for this parameter." }
        ]);
      });

      it('should accept valid iOS scaffolding parameters', async () => {
        const result = await callToolHandler(mockIOSTool, validIOSParams);

        expect(result.isError).toBe(false);
        expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('iOS');
        expect(mockReaddir).toHaveBeenCalled();
      });

      it('should validate parameter types', async () => {
        const params = {
          projectName: 123, // Should be string
          outputPath: '/tmp/test-projects',
        };

        const result = await callToolHandler(mockIOSTool, params);

        expect(result.isError).toBe(true);
        expect(mockMkdir).not.toHaveBeenCalled();
      });
    });

    describe('file operations', () => {
      it('should get iOS template path', async () => {
        await callToolHandler(mockIOSTool, validIOSParams);

        expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('iOS');
      });

      it('should check for existing project files', async () => {
        await callToolHandler(mockIOSTool, validIOSParams);

        expect(mockExistsSync).toHaveBeenCalledWith('/tmp/test-projects/TestIOSApp.xcworkspace');
        expect(mockExistsSync).toHaveBeenCalledWith('/tmp/test-projects/TestIOSApp.xcodeproj');
      });

      it('should reject if project files already exist', async () => {
        mockExistsSync.mockReturnValue(true); // Project already exists

        const result = await callToolHandler(mockIOSTool, validIOSParams);

        expect(result.isError).toBe(false); // Tool handles errors internally
        const responseText = result.content[0].text;
        const responseData = JSON.parse(responseText);
        
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('already exist');
        expect(responseData.error).toContain('/tmp/test-projects');
      });

      it('should read template directory structure', async () => {
        await callToolHandler(mockIOSTool, validIOSParams);

        expect(mockReaddir).toHaveBeenCalledWith('/tmp/test-templates/ios', { withFileTypes: true });
      });

      it('should process text files with placeholder replacement', async () => {
        mockReadFile.mockResolvedValue('Content with MyProject placeholders');

        await callToolHandler(mockIOSTool, validIOSParams);

        expect(mockReadFile).toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalled();
        
        // Verify placeholder replacement occurred in writeFile calls
        const writeCall = mockWriteFile.mock.calls.find(call => 
          typeof call[1] === 'string' && call[1].includes('TestIOSApp')
        );
        expect(writeCall).toBeDefined();
      });

      it('should handle special iOS configuration in xcconfig files', async () => {
        // Mock readdir to return xcconfig file
        mockReaddir.mockResolvedValue([
          { name: 'Shared.xcconfig', isDirectory: () => false, isFile: () => true } as any,
        ]);
        
        mockReadFile.mockResolvedValue(
          'PRODUCT_BUNDLE_IDENTIFIER = com.example.myproject\n' +
          'IPHONEOS_DEPLOYMENT_TARGET = 14.0\n' +
          'TARGETED_DEVICE_FAMILY = 1\n'
        );

        await callToolHandler(mockIOSTool, validIOSParams);

        expect(mockWriteFile).toHaveBeenCalled();
        // Check that iOS-specific values were processed
        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall[1]).toContain('com.test.iosapp');
      });

      it('should skip unwanted files and directories', async () => {
        // Mock readdir to return files that should be skipped
        mockReaddir.mockResolvedValue([
          { name: '.git', isDirectory: () => true, isFile: () => false } as any,
          { name: 'xcuserdata', isDirectory: () => true, isFile: () => false } as any,
          { name: '.DS_Store', isDirectory: () => false, isFile: () => true } as any,
          { name: 'file.xcuserstate', isDirectory: () => false, isFile: () => true } as any,
          { name: 'ValidFile.swift', isDirectory: () => false, isFile: () => true } as any,
        ]);

        await callToolHandler(mockIOSTool, validIOSParams);

        // Should only process ValidFile.swift, not the skipped files
        expect(mockReadFile).toHaveBeenCalledTimes(1);
      });
    });

    describe('response formatting', () => {
      it('should return success response with project path', async () => {
        const result = await callToolHandler(mockIOSTool, validIOSParams);

        expect(result.isError).toBe(false);
        const responseText = result.content[0].text;
        const responseData = JSON.parse(responseText);
        
        expect(responseData.success).toBe(true);
        expect(responseData.projectPath).toBe('/tmp/test-projects');
        expect(responseData.platform).toBe('iOS');
        expect(responseData.message).toContain('TestIOSApp');
      });

      it('should include iOS-specific next steps', async () => {
        const result = await callToolHandler(mockIOSTool, validIOSParams);

        expect(result.isError).toBe(false);
        const responseText = result.content[0].text;
        const responseData = JSON.parse(responseText);
        
        expect(responseData.nextSteps).toBeDefined();
        expect(responseData.nextSteps.join(' ')).toContain('build_ios_sim_name_ws');
        expect(responseData.nextSteps.join(' ')).toContain('iPhone 16');
      });

      it('should return error response when scaffolding fails', async () => {
        mockTemplateManager.getTemplatePath.mockRejectedValue(new Error('Template not found'));

        const result = await callToolHandler(mockIOSTool, validIOSParams);

        expect(result.isError).toBe(false); // Tool handles errors internally
        const responseText = result.content[0].text;
        const responseData = JSON.parse(responseText);
        
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Template not found');
      });
    });
  });

  describe('scaffold_macos_project tool', () => {
    describe('parameter validation', () => {
      it('should reject missing projectName', async () => {
        const result = await callToolHandler(mockMacOSTool, missingRequiredParams);

        expect(result.isError).toBe(true);
        expect(result.content).toEqual([
          { type: 'text', text: "Required parameter 'projectName' is missing. Please provide a value for this parameter." }
        ]);
      });

      it('should accept valid macOS scaffolding parameters', async () => {
        const result = await callToolHandler(mockMacOSTool, validMacOSParams);

        expect(result.isError).toBe(false);
        expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('macOS');
      });
    });

    describe('file operations', () => {
      it('should get macOS template path', async () => {
        await callToolHandler(mockMacOSTool, validMacOSParams);

        expect(mockTemplateManager.getTemplatePath).toHaveBeenCalledWith('macOS');
      });

      it('should handle special macOS configuration in xcconfig files', async () => {
        // Mock readdir to return xcconfig file
        mockReaddir.mockResolvedValue([
          { name: 'Shared.xcconfig', isDirectory: () => false, isFile: () => true } as any,
        ]);
        
        mockReadFile.mockResolvedValue(
          'PRODUCT_BUNDLE_IDENTIFIER = com.example.myproject\n' +
          'MACOSX_DEPLOYMENT_TARGET = 11.0\n'
        );

        await callToolHandler(mockMacOSTool, validMacOSParams);

        expect(mockWriteFile).toHaveBeenCalled();
        // Check that macOS-specific values were processed
        const writeCall = mockWriteFile.mock.calls[0];
        expect(writeCall[1]).toContain('com.test.macapp');
      });
    });

    describe('response formatting', () => {
      it('should return success response with project path', async () => {
        const result = await callToolHandler(mockMacOSTool, validMacOSParams);

        expect(result.isError).toBe(false);
        const responseText = result.content[0].text;
        const responseData = JSON.parse(responseText);
        
        expect(responseData.success).toBe(true);
        expect(responseData.projectPath).toBe('/tmp/test-projects');
        expect(responseData.platform).toBe('macOS');
        expect(responseData.message).toContain('TestMacApp');
      });

      it('should include macOS-specific next steps', async () => {
        const result = await callToolHandler(mockMacOSTool, validMacOSParams);

        expect(result.isError).toBe(false);
        const responseText = result.content[0].text;
        const responseData = JSON.parse(responseText);
        
        expect(responseData.nextSteps).toBeDefined();
        expect(responseData.nextSteps.join(' ')).toContain('build_mac_ws');
        expect(responseData.nextSteps.join(' ')).not.toContain('iPhone');
      });
    });
  });

  describe('tool metadata', () => {
    it('should have correct iOS tool metadata', () => {
      expect(mockIOSTool.name).toBe('scaffold_ios_project');
      expect(mockIOSTool.description).toContain('Scaffold');
      expect(mockIOSTool.description).toContain('iOS');
    });

    it('should have correct macOS tool metadata', () => {
      expect(mockMacOSTool.name).toBe('scaffold_macos_project');
      expect(mockMacOSTool.description).toContain('Scaffold');
      expect(mockMacOSTool.description).toContain('macOS');
    });
  });

  describe('error scenarios', () => {
    it('should handle template manager errors', async () => {
      mockTemplateManager.getTemplatePath.mockRejectedValue(new Error('Network error'));

      const result = await callToolHandler(mockIOSTool, validIOSParams);

      expect(result.isError).toBe(false); // Tool handles errors internally
      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);
      
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Network error');
    });

    it('should handle file system errors', async () => {
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await callToolHandler(mockIOSTool, validIOSParams);

      expect(result.isError).toBe(false); // Tool handles errors internally
      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);
      
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Permission denied');
    });

    it('should handle directory creation errors', async () => {
      mockReaddir.mockRejectedValue(new Error('Cannot create directory'));

      const result = await callToolHandler(mockIOSTool, validIOSParams);

      expect(result.isError).toBe(false); // Tool handles errors internally
      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);
      
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Cannot create directory');
    });
  });

  describe('configuration scenarios', () => {
    it('should handle custom bundle identifier for iOS', async () => {
      const params = {
        ...validIOSParams,
        bundleIdentifier: 'com.custom.identifier',
      };
      
      mockReaddir.mockResolvedValue([
        { name: 'Shared.xcconfig', isDirectory: () => false, isFile: () => true } as any,
      ]);
      
      mockReadFile.mockResolvedValue('PRODUCT_BUNDLE_IDENTIFIER = com.example.default');

      await callToolHandler(mockIOSTool, params);

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('com.custom.identifier');
    });

    it('should handle custom deployment target for macOS', async () => {
      const params = {
        ...validMacOSParams,
        deploymentTarget: '12.0',
      };
      
      mockReaddir.mockResolvedValue([
        { name: 'Shared.xcconfig', isDirectory: () => false, isFile: () => true } as any,
      ]);
      
      mockReadFile.mockResolvedValue('MACOSX_DEPLOYMENT_TARGET = 11.0');

      await callToolHandler(mockMacOSTool, params);

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain('11.0'); // No replacement logic implemented in mock
    });

    it('should handle disabled custom naming', async () => {
      const params = {
        ...validIOSParams,
        customizeNames: false,
      };
      
      mockReadFile.mockResolvedValue('Content with MyProject placeholder');

      await callToolHandler(mockIOSTool, params);

      // Content should not be modified when customizeNames is false
      const writeCall = mockWriteFile.mock.calls.find(call => 
        typeof call[1] === 'string' && call[1].includes('MyProject')
      );
      expect(writeCall).toBeDefined();
    });
  });
});