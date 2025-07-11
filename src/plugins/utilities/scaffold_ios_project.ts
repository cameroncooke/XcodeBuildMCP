/**
 * Utilities Plugin: Scaffold iOS Project
 *
 * Scaffold a new iOS project from templates.
 */

import { z } from 'zod';
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { log } from '../../utils/index.js';
import { ValidationError } from '../../utils/index.js';
import { TemplateManager } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

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
function updatePackageSwiftFile(content: string, params: any): string {
  let result = content;

  // Update ALL target name references in Package.swift
  const featureName = `${params.projectName}Feature`;
  const testName = `${params.projectName}FeatureTests`;

  // Replace ALL occurrences of MyProjectFeatureTests first (more specific)
  result = result.replace(/MyProjectFeatureTests/g, testName);
  // Then replace ALL occurrences of MyProjectFeature (less specific, so comes after)
  result = result.replace(/MyProjectFeature/g, featureName);

  // Update deployment targets based on platform
  if (params.platform === 'iOS') {
    if (params.deploymentTarget) {
      // Extract major version (e.g., "17.0" -> "17")
      const majorVersion = params.deploymentTarget.split('.')[0];
      result = result.replace(/\.iOS\(\.v\d+\)/, `.iOS(.v${majorVersion})`);
    }
  }

  return result;
}

/**
 * Update XCConfig file with scaffold parameters
 */
function updateXCConfigFile(content: string, params: any): string {
  let result = content;

  // Update project identity settings
  result = result.replace(/PRODUCT_NAME = .+/g, `PRODUCT_NAME = ${params.projectName}`);
  result = result.replace(
    /PRODUCT_DISPLAY_NAME = .+/g,
    `PRODUCT_DISPLAY_NAME = ${params.displayName || params.projectName}`,
  );
  result = result.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = .+/g,
    `PRODUCT_BUNDLE_IDENTIFIER = ${params.bundleIdentifier || `com.example.${params.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}`}`,
  );
  result = result.replace(
    /MARKETING_VERSION = .+/g,
    `MARKETING_VERSION = ${params.marketingVersion || '1.0'}`,
  );
  result = result.replace(
    /CURRENT_PROJECT_VERSION = .+/g,
    `CURRENT_PROJECT_VERSION = ${params.currentProjectVersion || '1'}`,
  );

  // Platform-specific updates
  if (params.platform === 'iOS') {
    // iOS deployment target
    if (params.deploymentTarget) {
      result = result.replace(
        /IPHONEOS_DEPLOYMENT_TARGET = .+/g,
        `IPHONEOS_DEPLOYMENT_TARGET = ${params.deploymentTarget}`,
      );
    }

    // Device family
    if (params.targetedDeviceFamily) {
      const deviceFamilyValue = deviceFamilyToNumeric(params.targetedDeviceFamily);
      result = result.replace(
        /TARGETED_DEVICE_FAMILY = .+/g,
        `TARGETED_DEVICE_FAMILY = ${deviceFamilyValue}`,
      );
    }

    // iPhone orientations
    if (params.supportedOrientations && params.supportedOrientations.length > 0) {
      // Filter out any empty strings and validate
      const validOrientations = params.supportedOrientations.filter((o) => o && o.trim() !== '');
      if (validOrientations.length > 0) {
        const orientations = validOrientations.map(orientationToIOSConstant).join(' ');
        result = result.replace(
          /INFOPLIST_KEY_UISupportedInterfaceOrientations = .+/g,
          `INFOPLIST_KEY_UISupportedInterfaceOrientations = ${orientations}`,
        );
      }
    }

    // iPad orientations
    if (params.supportedOrientationsIpad && params.supportedOrientationsIpad.length > 0) {
      // Filter out any empty strings and validate
      const validOrientations = params.supportedOrientationsIpad.filter(
        (o) => o && o.trim() !== '',
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
      `CODE_SIGN_ENTITLEMENTS = Config/${params.projectName}.entitlements`,
    );
  }

  // Update test bundle identifier and target name
  result = result.replace(/TEST_TARGET_NAME = .+/g, `TEST_TARGET_NAME = ${params.projectName}`);

  // Update comments that reference MyProject in entitlements paths
  result = result.replace(
    /Config\/MyProject\.entitlements/g,
    `Config/${params.projectName}.entitlements`,
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
async function processFile(sourcePath: string, destPath: string, params: any): Promise<void> {
  // Determine the destination file path
  let finalDestPath = destPath;
  if (params.customizeNames) {
    // Replace MyProject in file/directory names
    const fileName = basename(destPath);
    const dirName = dirname(destPath);
    const newFileName = fileName.replace(/MyProject/g, params.projectName);
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
    const content = await readFile(sourcePath, 'utf-8');

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
        params.bundleIdentifier ||
        `com.example.${params.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      processedContent = replacePlaceholders(content, params.projectName, bundleIdentifier);
    }

    await mkdir(dirname(finalDestPath), { recursive: true });
    await writeFile(finalDestPath, processedContent, 'utf-8');
  } else {
    // Copy binary files as-is
    await mkdir(dirname(finalDestPath), { recursive: true });
    await cp(sourcePath, finalDestPath, { preserveTimestamps: true });
  }
}

/**
 * Recursively process a directory
 */
async function processDirectory(sourceDir: string, destDir: string, params: any): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    let destName = entry.name;

    if (params.customizeNames) {
      // Replace MyProject in directory names
      destName = destName.replace(/MyProject/g, params.projectName);
    }

    const destPath = join(destDir, destName);

    if (entry.isDirectory()) {
      // Skip certain directories
      if (entry.name === '.git' || entry.name === 'xcuserdata') {
        continue;
      }
      await mkdir(destPath, { recursive: true });
      await processDirectory(sourcePath, destPath, params);
    } else if (entry.isFile()) {
      // Skip certain files
      if (entry.name === '.DS_Store' || entry.name.endsWith('.xcuserstate')) {
        continue;
      }
      await processFile(sourcePath, destPath, params);
    }
  }
}

/**
 * Scaffold a new iOS or macOS project
 */
async function scaffoldProject(params: any): Promise<string> {
  const { projectName, outputPath, platform, customizeNames = true } = params;

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
    templatePath = await TemplateManager.getTemplatePath(platform);
  } catch (error) {
    throw new ValidationError(
      `Failed to get template for ${platform}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Use outputPath directly as the destination
  const projectPath = outputPath;

  // Check if the output directory already has Xcode project files
  const xcworkspaceExists = existsSync(
    join(projectPath, `${customizeNames ? projectName : 'MyProject'}.xcworkspace`),
  );
  const xcodeprojExists = existsSync(
    join(projectPath, `${customizeNames ? projectName : 'MyProject'}.xcodeproj`),
  );

  if (xcworkspaceExists || xcodeprojExists) {
    throw new ValidationError(`Xcode project files already exist in ${projectPath}`);
  }

  try {
    // Process the template directly into the output path
    await processDirectory(templatePath, projectPath, params);

    return projectPath;
  } finally {
    // Clean up downloaded template if needed
    await TemplateManager.cleanup(templatePath);
  }
}

export default {
  name: 'scaffold_ios_project',
  description:
    'Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper iOS configuration.',
  schema: ScaffoldiOSProjectSchema.shape,
  async handler(args: any): Promise<ToolResponse> {
    const params = args;
    try {
      const projectParams = { ...params, platform: 'iOS' };
      const projectPath = await scaffoldProject(projectParams);

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
  },
};
