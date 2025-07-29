/**
 * Utilities Plugin: Scaffold macOS Project
 *
 * Scaffold a new macOS project from templates.
 */

import { z } from 'zod';
import { join, dirname, basename } from 'path';
import { log } from '../../../utils/index.js';
import { ValidationError } from '../../../utils/index.js';
import { TemplateManager } from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';
import {
  CommandExecutor,
  FileSystemExecutor,
  getDefaultCommandExecutor,
  getDefaultFileSystemExecutor,
} from '../../../utils/command.js';

// Common base schema for both iOS and macOS
const BaseScaffoldSchema = z.object({
  projectName: z.string().min(1).describe('Name of the new project'),
  outputPath: z.string().describe('Path where the project should be created'),
  bundleIdentifier: z
    .string()
    .optional()
    .describe(
      'Bundle identifier (e.g., com.example.myapp). If not provided, will use com.example.projectname',
    ),
  displayName: z
    .string()
    .optional()
    .describe(
      'App display name (shown on home screen/dock). If not provided, will use projectName',
    ),
  marketingVersion: z
    .string()
    .optional()
    .describe('Marketing version (e.g., 1.0, 2.1.3). If not provided, will use 1.0'),
  currentProjectVersion: z
    .string()
    .optional()
    .describe('Build number (e.g., 1, 42, 100). If not provided, will use 1'),
  customizeNames: z
    .boolean()
    .default(true)
    .describe('Whether to customize project names and identifiers. Default is true.'),
});

// macOS-specific schema
const ScaffoldmacOSProjectSchema = BaseScaffoldSchema.extend({
  deploymentTarget: z
    .string()
    .optional()
    .describe('macOS deployment target (e.g., 15.4, 14.0). If not provided, will use 15.4'),
});

type ScaffoldMacOSProjectParams = {
  projectName: string;
  outputPath: string;
  bundleIdentifier?: string;
  displayName?: string;
  marketingVersion?: string;
  currentProjectVersion?: string;
  customizeNames?: boolean;
  deploymentTarget?: string;
};

/**
 * Update Package.swift file with deployment target
 */
function updatePackageSwiftFile(content: string, params: Record<string, unknown>): string {
  let result = content;

  // Update ALL target name references in Package.swift
  const featureName = `${params.projectName as string}Feature`;
  const testName = `${params.projectName as string}FeatureTests`;

  // Replace ALL occurrences of MyProjectFeatureTests first (more specific)
  result = result.replace(/MyProjectFeatureTests/g, testName);
  // Then replace ALL occurrences of MyProjectFeature (less specific, so comes after)
  result = result.replace(/MyProjectFeature/g, featureName);

  // Update deployment targets based on platform
  if (params.platform === 'macOS') {
    if (params.deploymentTarget) {
      // Extract major version (e.g., "14.0" -> "14")
      const majorVersion = (params.deploymentTarget as string).split('.')[0];
      result = result.replace(/\.macOS\(\.v\d+\)/, `.macOS(.v${majorVersion})`);
    }
  }

  return result;
}

/**
 * Update XCConfig file with scaffold parameters
 */
function updateXCConfigFile(content: string, params: Record<string, unknown>): string {
  let result = content;

  // Update project identity settings
  result = result.replace(/PRODUCT_NAME = .+/g, `PRODUCT_NAME = ${params.projectName as string}`);
  result = result.replace(
    /PRODUCT_DISPLAY_NAME = .+/g,
    `PRODUCT_DISPLAY_NAME = ${(params.displayName as string) || (params.projectName as string)}`,
  );
  result = result.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = .+/g,
    `PRODUCT_BUNDLE_IDENTIFIER = ${(params.bundleIdentifier as string) || `com.example.${(params.projectName as string).toLowerCase().replace(/[^a-z0-9]/g, '')}`}`,
  );
  result = result.replace(
    /MARKETING_VERSION = .+/g,
    `MARKETING_VERSION = ${(params.marketingVersion as string) || '1.0'}`,
  );
  result = result.replace(
    /CURRENT_PROJECT_VERSION = .+/g,
    `CURRENT_PROJECT_VERSION = ${(params.currentProjectVersion as string) || '1'}`,
  );

  // Platform-specific updates
  if (params.platform === 'macOS') {
    // macOS deployment target
    if (params.deploymentTarget) {
      result = result.replace(
        /MACOSX_DEPLOYMENT_TARGET = .+/g,
        `MACOSX_DEPLOYMENT_TARGET = ${params.deploymentTarget as string}`,
      );
    }

    // Update entitlements path for macOS
    result = result.replace(
      /CODE_SIGN_ENTITLEMENTS = .+/g,
      `CODE_SIGN_ENTITLEMENTS = Config/${params.projectName as string}.entitlements`,
    );
  }

  // Update test bundle identifier and target name
  result = result.replace(
    /TEST_TARGET_NAME = .+/g,
    `TEST_TARGET_NAME = ${params.projectName as string}`,
  );

  // Update comments that reference MyProject in entitlements paths
  result = result.replace(
    /Config\/MyProject\.entitlements/g,
    `Config/${params.projectName as string}.entitlements`,
  );

  return result;
}

/**
 * Replace placeholders in a string (for non-XCConfig files)
 */
function replacePlaceholders(
  content: string,
  projectName: string,
  bundleIdentifier: string,
): string {
  let result = content;

  // Replace project name
  result = result.replace(/MyProject/g, projectName);

  // Replace bundle identifier - check for both patterns used in templates
  if (bundleIdentifier) {
    result = result.replace(/com\.example\.MyProject/g, bundleIdentifier);
    result = result.replace(/com\.mycompany\.MyProject/g, bundleIdentifier);
  }

  return result;
}

/**
 * Process a single file, replacing placeholders if it's a text file
 */
async function processFile(
  sourcePath: string,
  destPath: string,
  params: Record<string, unknown>,
  fileSystemExecutor: FileSystemExecutor,
): Promise<void> {
  // Determine the destination file path
  let finalDestPath = destPath;
  if (params.customizeNames) {
    // Replace MyProject in file/directory names
    const fileName = basename(destPath);
    const dirName = dirname(destPath);
    const newFileName = fileName.replace(/MyProject/g, params.projectName as string);
    finalDestPath = join(dirName, newFileName);
  }

  // Text file extensions that should be processed
  const textExtensions = [
    '.swift',
    '.h',
    '.m',
    '.mm',
    '.cpp',
    '.c',
    '.pbxproj',
    '.plist',
    '.xcscheme',
    '.xctestplan',
    '.xcworkspacedata',
    '.xcconfig',
    '.json',
    '.xml',
    '.entitlements',
    '.storyboard',
    '.xib',
    '.md',
  ];

  const ext = sourcePath.toLowerCase();
  const isTextFile = textExtensions.some((textExt) => ext.endsWith(textExt));
  const isXCConfig = sourcePath.endsWith('.xcconfig');
  const isPackageSwift = sourcePath.endsWith('Package.swift');

  if (isTextFile && params.customizeNames) {
    // Read the file content
    const content = await fileSystemExecutor.readFile(sourcePath, 'utf-8');

    let processedContent;

    if (isXCConfig) {
      // Use special XCConfig processing
      processedContent = updateXCConfigFile(content, params);
    } else if (isPackageSwift) {
      // Use special Package.swift processing
      processedContent = updatePackageSwiftFile(content, params);
    } else {
      // Use standard placeholder replacement
      const bundleIdentifier =
        (params.bundleIdentifier as string) ||
        `com.example.${(params.projectName as string).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      processedContent = replacePlaceholders(
        content,
        params.projectName as string,
        bundleIdentifier,
      );
    }

    await fileSystemExecutor.mkdir(dirname(finalDestPath), { recursive: true });
    await fileSystemExecutor.writeFile(finalDestPath, processedContent, 'utf-8');
  } else {
    // Copy binary files as-is
    await fileSystemExecutor.mkdir(dirname(finalDestPath), { recursive: true });
    await fileSystemExecutor.cp(sourcePath, finalDestPath, { recursive: true });
  }
}

/**
 * Recursively process a directory
 */
async function processDirectory(
  sourceDir: string,
  destDir: string,
  params: Record<string, unknown>,
  fileSystemExecutor: FileSystemExecutor,
): Promise<void> {
  const entries = await fileSystemExecutor.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const dirent = entry as { isDirectory(): boolean; isFile(): boolean; name: string };
    const sourcePath = join(sourceDir, dirent.name);
    let destName = dirent.name;

    if (params.customizeNames) {
      // Replace MyProject in directory names
      destName = destName.replace(/MyProject/g, params.projectName as string);
    }

    const destPath = join(destDir, destName);

    if (dirent.isDirectory()) {
      // Skip certain directories
      if (dirent.name === '.git' || dirent.name === 'xcuserdata') {
        continue;
      }
      await fileSystemExecutor.mkdir(destPath, { recursive: true });
      await processDirectory(sourcePath, destPath, params, fileSystemExecutor);
    } else if (dirent.isFile()) {
      // Skip certain files
      if (dirent.name === '.DS_Store' || dirent.name.endsWith('.xcuserstate')) {
        continue;
      }
      await processFile(sourcePath, destPath, params, fileSystemExecutor);
    }
  }
}

/**
 * Scaffold a new iOS or macOS project
 */
async function scaffoldProject(
  params: Record<string, unknown>,
  commandExecutor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor,
): Promise<string> {
  const projectName = params.projectName as string;
  const outputPath = params.outputPath as string;
  const platform = params.platform as string;
  const customizeNames = (params.customizeNames as boolean) ?? true;

  log('info', `Scaffolding project: ${projectName} (${platform}) at ${outputPath}`);

  // Validate project name
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(projectName)) {
    throw new ValidationError(
      'Project name must start with a letter and contain only letters, numbers, and underscores',
    );
  }

  // Get template path from TemplateManager
  let templatePath;
  try {
    templatePath = await TemplateManager.getTemplatePath(
      platform as 'macOS' | 'iOS',
      commandExecutor,
      fileSystemExecutor,
    );
  } catch (error) {
    throw new ValidationError(
      `Failed to get template for ${platform}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Use outputPath directly as the destination
  const projectPath = outputPath;

  // Check if the output directory already has Xcode project files
  const xcworkspaceExists = fileSystemExecutor.existsSync(
    join(projectPath, `${customizeNames ? projectName : 'MyProject'}.xcworkspace`),
  );
  const xcodeprojExists = fileSystemExecutor.existsSync(
    join(projectPath, `${customizeNames ? projectName : 'MyProject'}.xcodeproj`),
  );

  if (xcworkspaceExists || xcodeprojExists) {
    throw new ValidationError(`Xcode project files already exist in ${projectPath}`);
  }

  try {
    // Process the template directly into the output path
    await processDirectory(templatePath, projectPath, params, fileSystemExecutor);

    return projectPath;
  } finally {
    // Clean up downloaded template if needed
    await TemplateManager.cleanup(templatePath, fileSystemExecutor);
  }
}

/**
 * Business logic for scaffolding macOS projects
 * Extracted for testability and Separation of Concerns
 */
export async function scaffold_macos_projectLogic(
  params: ScaffoldMacOSProjectParams,
  commandExecutor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<ToolResponse> {
  try {
    const paramsRecord = params as Record<string, unknown>;
    const projectParams = { ...paramsRecord, platform: 'macOS' };
    const projectPath = await scaffoldProject(projectParams, commandExecutor, fileSystemExecutor);

    const response = {
      success: true,
      projectPath,
      platform: 'macOS',
      message: `Successfully scaffolded macOS project "${params.projectName}" in ${projectPath}`,
      nextSteps: [
        `Important: Before working on the project make sure to read the README.md file in the workspace root directory.`,
        `Build for macOS: build_mac_ws --workspace-path "${projectPath}/${params.customizeNames ? params.projectName : 'MyProject'}.xcworkspace" --scheme "${params.customizeNames ? params.projectName : 'MyProject'}"`,
        `Run and run on macOS: build_run_mac_ws --workspace-path "${projectPath}/${params.customizeNames ? params.projectName : 'MyProject'}.xcworkspace" --scheme "${params.customizeNames ? params.projectName : 'MyProject'}"`,
      ],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    log(
      'error',
      `Failed to scaffold macOS project: ${error instanceof Error ? error.message : String(error)}`,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'scaffold_macos_project',
  description:
    'Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper macOS configuration.',
  schema: ScaffoldmacOSProjectSchema.shape,
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return scaffold_macos_projectLogic(
      args as ScaffoldMacOSProjectParams,
      getDefaultCommandExecutor(),
      getDefaultFileSystemExecutor(),
    );
  },
};
