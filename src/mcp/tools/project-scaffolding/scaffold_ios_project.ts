/**
 * Utilities Plugin: Scaffold iOS Project
 *
 * Scaffold a new iOS project from templates.
 */

import { z } from 'zod';
import { join, dirname, basename } from 'path';
import { log } from '../../../utils/index.js';
import { ValidationError } from '../../../utils/index.js';
import { TemplateManager } from '../../../utils/index.js';
import {
  CommandExecutor,
  FileSystemExecutor,
  getDefaultCommandExecutor,
  getDefaultFileSystemExecutor,
} from '../../../utils/index.js';
import { ToolResponse } from '../../../types/common.js';

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

// iOS-specific schema
const ScaffoldiOSProjectSchema = BaseScaffoldSchema.extend({
  deploymentTarget: z
    .string()
    .optional()
    .describe('iOS deployment target (e.g., 18.4, 17.0). If not provided, will use 18.4'),
  targetedDeviceFamily: z
    .array(z.enum(['iphone', 'ipad', 'universal']))
    .optional()
    .describe('Targeted device families'),
  supportedOrientations: z
    .array(z.enum(['portrait', 'landscape-left', 'landscape-right', 'portrait-upside-down']))
    .optional()
    .describe('Supported orientations for iPhone'),
  supportedOrientationsIpad: z
    .array(z.enum(['portrait', 'landscape-left', 'landscape-right', 'portrait-upside-down']))
    .optional()
    .describe('Supported orientations for iPad'),
});

/**
 * Convert orientation enum to iOS constant
 */
function orientationToIOSConstant(orientation: string): string {
  switch (orientation) {
    case 'Portrait':
      return 'UIInterfaceOrientationPortrait';
    case 'PortraitUpsideDown':
      return 'UIInterfaceOrientationPortraitUpsideDown';
    case 'LandscapeLeft':
      return 'UIInterfaceOrientationLandscapeLeft';
    case 'LandscapeRight':
      return 'UIInterfaceOrientationLandscapeRight';
    default:
      return orientation;
  }
}

/**
 * Convert device family enum to numeric value
 */
function deviceFamilyToNumeric(family: string): string {
  switch (family) {
    case 'iPhone':
      return '1';
    case 'iPad':
      return '2';
    case 'iPhone+iPad':
      return '1,2';
    default:
      return '1,2';
  }
}

/**
 * Update Package.swift file with deployment target
 */
function updatePackageSwiftFile(content: string, params: Record<string, unknown>): string {
  let result = content;

  const projectName = params.projectName as string;
  const platform = params.platform as string;
  const deploymentTarget = params.deploymentTarget as string | undefined;

  // Update ALL target name references in Package.swift
  const featureName = `${projectName}Feature`;
  const testName = `${projectName}FeatureTests`;

  // Replace ALL occurrences of MyProjectFeatureTests first (more specific)
  result = result.replace(/MyProjectFeatureTests/g, testName);
  // Then replace ALL occurrences of MyProjectFeature (less specific, so comes after)
  result = result.replace(/MyProjectFeature/g, featureName);

  // Update deployment targets based on platform
  if (platform === 'iOS') {
    if (deploymentTarget) {
      // Extract major version (e.g., "17.0" -> "17")
      const majorVersion = deploymentTarget.split('.')[0];
      result = result.replace(/\.iOS\(\.v\d+\)/, `.iOS(.v${majorVersion})`);
    }
  }

  return result;
}

/**
 * Update XCConfig file with scaffold parameters
 */
function updateXCConfigFile(content: string, params: Record<string, unknown>): string {
  let result = content;

  const projectName = params.projectName as string;
  const displayName = params.displayName as string | undefined;
  const bundleIdentifier = params.bundleIdentifier as string | undefined;
  const marketingVersion = params.marketingVersion as string | undefined;
  const currentProjectVersion = params.currentProjectVersion as string | undefined;
  const platform = params.platform as string;
  const deploymentTarget = params.deploymentTarget as string | undefined;
  const targetedDeviceFamily = params.targetedDeviceFamily as string | undefined;
  const supportedOrientations = params.supportedOrientations as string[] | undefined;
  const supportedOrientationsIpad = params.supportedOrientationsIpad as string[] | undefined;

  // Update project identity settings
  result = result.replace(/PRODUCT_NAME = .+/g, `PRODUCT_NAME = ${projectName}`);
  result = result.replace(
    /PRODUCT_DISPLAY_NAME = .+/g,
    `PRODUCT_DISPLAY_NAME = ${displayName ?? projectName}`,
  );
  result = result.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = .+/g,
    `PRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier ?? `com.example.${projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}`}`,
  );
  result = result.replace(
    /MARKETING_VERSION = .+/g,
    `MARKETING_VERSION = ${marketingVersion ?? '1.0'}`,
  );
  result = result.replace(
    /CURRENT_PROJECT_VERSION = .+/g,
    `CURRENT_PROJECT_VERSION = ${currentProjectVersion ?? '1'}`,
  );

  // Platform-specific updates
  if (platform === 'iOS') {
    // iOS deployment target
    if (deploymentTarget) {
      result = result.replace(
        /IPHONEOS_DEPLOYMENT_TARGET = .+/g,
        `IPHONEOS_DEPLOYMENT_TARGET = ${deploymentTarget}`,
      );
    }

    // Device family
    if (targetedDeviceFamily) {
      const deviceFamilyValue = deviceFamilyToNumeric(targetedDeviceFamily);
      result = result.replace(
        /TARGETED_DEVICE_FAMILY = .+/g,
        `TARGETED_DEVICE_FAMILY = ${deviceFamilyValue}`,
      );
    }

    // iPhone orientations
    if (supportedOrientations && supportedOrientations.length > 0) {
      // Filter out any empty strings and validate
      const validOrientations = supportedOrientations.filter((o: string) => o && o.trim() !== '');
      if (validOrientations.length > 0) {
        const orientations = validOrientations.map(orientationToIOSConstant).join(' ');
        result = result.replace(
          /INFOPLIST_KEY_UISupportedInterfaceOrientations = .+/g,
          `INFOPLIST_KEY_UISupportedInterfaceOrientations = ${orientations}`,
        );
      }
    }

    // iPad orientations
    if (supportedOrientationsIpad && supportedOrientationsIpad.length > 0) {
      // Filter out any empty strings and validate
      const validOrientations = supportedOrientationsIpad.filter(
        (o: string) => o && o.trim() !== '',
      );
      if (validOrientations.length > 0) {
        const orientations = validOrientations.map(orientationToIOSConstant).join(' ');
        result = result.replace(
          /INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = .+/g,
          `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = ${orientations}`,
        );
      }
    }

    // Update entitlements path for iOS
    result = result.replace(
      /CODE_SIGN_ENTITLEMENTS = .+/g,
      `CODE_SIGN_ENTITLEMENTS = Config/${projectName}.entitlements`,
    );
  }

  // Update test bundle identifier and target name
  result = result.replace(/TEST_TARGET_NAME = .+/g, `TEST_TARGET_NAME = ${projectName}`);

  // Update comments that reference MyProject in entitlements paths
  result = result.replace(/Config\/MyProject\.entitlements/g, `Config/${projectName}.entitlements`);

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
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<void> {
  const projectName = params.projectName as string;
  const bundleIdentifierParam = params.bundleIdentifier as string | undefined;
  const customizeNames = params.customizeNames as boolean | undefined;

  // Determine the destination file path
  let finalDestPath = destPath;
  if (customizeNames) {
    // Replace MyProject in file/directory names
    const fileName = basename(destPath);
    const dirName = dirname(destPath);
    const newFileName = fileName.replace(/MyProject/g, projectName);
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

  if (isTextFile && customizeNames) {
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
        bundleIdentifierParam ??
        `com.example.${projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      processedContent = replacePlaceholders(content, projectName, bundleIdentifier);
    }

    await fileSystemExecutor.mkdir(dirname(finalDestPath), { recursive: true });
    await fileSystemExecutor.writeFile(finalDestPath, processedContent, 'utf-8');
  } else {
    // Copy binary files as-is
    await fileSystemExecutor.mkdir(dirname(finalDestPath), { recursive: true });
    await fileSystemExecutor.cp(sourcePath, finalDestPath);
  }
}

/**
 * Recursively process a directory
 */
async function processDirectory(
  sourceDir: string,
  destDir: string,
  params: Record<string, unknown>,
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<void> {
  const entries = await fileSystemExecutor.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryTyped = entry as { name: string; isDirectory: () => boolean; isFile: () => boolean };
    const sourcePath = join(sourceDir, entryTyped.name);
    let destName = entryTyped.name;

    if (params.customizeNames) {
      // Replace MyProject in directory names
      destName = destName.replace(/MyProject/g, params.projectName as string);
    }

    const destPath = join(destDir, destName);

    if (entryTyped.isDirectory()) {
      // Skip certain directories
      if (entryTyped.name === '.git' || entryTyped.name === 'xcuserdata') {
        continue;
      }
      await fileSystemExecutor.mkdir(destPath, { recursive: true });
      await processDirectory(sourcePath, destPath, params, fileSystemExecutor);
    } else if (entryTyped.isFile()) {
      // Skip certain files
      if (entryTyped.name === '.DS_Store' || entryTyped.name.endsWith('.xcuserstate')) {
        continue;
      }
      await processFile(sourcePath, destPath, params, fileSystemExecutor);
    }
  }
}

type ScaffoldIOSProjectParams = {
  projectName: string;
  outputPath: string;
  bundleIdentifier?: string;
  displayName?: string;
  marketingVersion?: string;
  currentProjectVersion?: string;
  customizeNames?: boolean;
  deploymentTarget?: string;
  targetedDeviceFamily?: ('iphone' | 'ipad' | 'universal')[];
  supportedOrientations?: (
    | 'portrait'
    | 'landscape-left'
    | 'landscape-right'
    | 'portrait-upside-down'
  )[];
  supportedOrientationsIpad?: (
    | 'portrait'
    | 'landscape-left'
    | 'landscape-right'
    | 'portrait-upside-down'
  )[];
};

/**
 * Logic function for scaffolding iOS projects
 */
export async function scaffold_ios_projectLogic(
  params: ScaffoldIOSProjectParams,
  commandExecutor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  const _paramsRecord = params as Record<string, unknown>;
  try {
    const projectParams = { ...params, platform: 'iOS' };
    const projectPath = await scaffoldProject(projectParams, commandExecutor, fileSystemExecutor);

    const response = {
      success: true,
      projectPath,
      platform: 'iOS',
      message: `Successfully scaffolded iOS project "${params.projectName}" in ${projectPath}`,
      nextSteps: [
        `Important: Before working on the project make sure to read the README.md file in the workspace root directory.`,
        `Build for simulator: build_ios_sim_name_ws --workspace-path "${projectPath}/${params.customizeNames ? params.projectName : 'MyProject'}.xcworkspace" --scheme "${params.customizeNames ? params.projectName : 'MyProject'}" --simulator-name "iPhone 16"`,
        `Build and run on simulator: build_run_ios_sim_name_ws --workspace-path "${projectPath}/${params.customizeNames ? params.projectName : 'MyProject'}.xcworkspace" --scheme "${params.customizeNames ? params.projectName : 'MyProject'}" --simulator-name "iPhone 16"`,
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
      `Failed to scaffold iOS project: ${error instanceof Error ? error.message : String(error)}`,
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

/**
 * Scaffold a new iOS or macOS project
 */
async function scaffoldProject(
  params: Record<string, unknown>,
  commandExecutor?: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<string> {
  const projectName = params.projectName as string;
  const outputPath = params.outputPath as string;
  const platform = params.platform as 'iOS' | 'macOS';
  const customizeNames = (params.customizeNames as boolean | undefined) ?? true;

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
    // Import the default command executor if not provided
    if (!commandExecutor) {
      const { getDefaultCommandExecutor } = await import('../../../utils/index.js');
      commandExecutor = getDefaultCommandExecutor();
    }

    templatePath = await TemplateManager.getTemplatePath(
      platform,
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

export default {
  name: 'scaffold_ios_project',
  description:
    'Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper iOS configuration.',
  schema: ScaffoldiOSProjectSchema.shape,
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return scaffold_ios_projectLogic(
      args as ScaffoldIOSProjectParams,
      getDefaultCommandExecutor(),
      getDefaultFileSystemExecutor(),
    );
  },
};
