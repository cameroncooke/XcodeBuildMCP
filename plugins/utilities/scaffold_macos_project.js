/**
 * Utilities Plugin: Scaffold macOS Project
 * 
 * Scaffold a new macOS project from templates.
 */

import { z } from 'zod';
import { existsSync } from 'fs';
import { mkdir, cp, readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { log } from '../../build/utils.js';
import { ValidationError } from '../../build/utils.js';
import { TemplateManager } from '../../build/utils.js';

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

/**
 * Update Package.swift file with deployment target
 */
function updatePackageSwiftFile(content, params) {
  let result = content;

  // Update ALL target name references in Package.swift
  const featureName = `${params.projectName}Feature`;
  const testName = `${params.projectName}FeatureTests`;

  // Replace ALL occurrences of MyProjectFeatureTests first (more specific)
  result = result.replace(/MyProjectFeatureTests/g, testName);
  // Then replace ALL occurrences of MyProjectFeature (less specific, so comes after)
  result = result.replace(/MyProjectFeature/g, featureName);

  // Update deployment targets based on platform
  if (params.platform === 'macOS') {
    if (params.deploymentTarget) {
      // Extract major version (e.g., "14.0" -> "14")
      const majorVersion = params.deploymentTarget.split('.')[0];
      result = result.replace(/\.macOS\(\.v\d+\)/, `.macOS(.v${majorVersion})`);
    }
  }

  return result;
}

/**
 * Update XCConfig file with scaffold parameters
 */
function updateXCConfigFile(content, params) {
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
  if (params.platform === 'macOS') {
    // macOS deployment target
    if (params.deploymentTarget) {
      result = result.replace(
        /MACOSX_DEPLOYMENT_TARGET = .+/g,
        `MACOSX_DEPLOYMENT_TARGET = ${params.deploymentTarget}`,
      );
    }

    // Update entitlements path for macOS
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
  content,
  projectName,
  bundleIdentifier,
) {
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
  sourcePath,
  destPath,
  params,
) {
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
async function processDirectory(
  sourceDir,
  destDir,
  params,
) {
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
async function scaffoldProject(params) {
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
  name: 'scaffold_macos_project',
  description: 'Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper macOS configuration.',
  schema: ScaffoldmacOSProjectSchema.shape,
  async handler(params) {
    try {
      const projectParams = { ...params, platform: 'macOS' };
      const projectPath = await scaffoldProject(projectParams);

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
  },
};