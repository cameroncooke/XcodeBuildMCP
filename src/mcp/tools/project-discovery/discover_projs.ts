/**
 * Project Discovery Plugin: Discover Projects
 *
 * Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj)
 * and workspace (.xcworkspace) files.
 */

import { z } from 'zod';
import * as path from 'node:path';
import { log } from '../../../utils/logging/index.ts';
import { ToolResponse, createTextContent } from '../../../types/common.ts';
import { getDefaultFileSystemExecutor, getDefaultCommandExecutor } from '../../../utils/command.ts';
import { FileSystemExecutor } from '../../../utils/FileSystemExecutor.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Constants
const DEFAULT_MAX_DEPTH = 5;
const SKIPPED_DIRS = new Set(['build', 'DerivedData', 'Pods', '.git', 'node_modules']);

// Type definition for Dirent-like objects returned by readdir with withFileTypes: true
interface DirentLike {
  name: string;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

/**
 * Recursively scans directories to find Xcode projects and workspaces.
 */
async function _findProjectsRecursive(
  currentDirAbs: string,
  workspaceRootAbs: string,
  currentDepth: number,
  maxDepth: number,
  results: { projects: string[]; workspaces: string[] },
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<void> {
  // Explicit depth check (now simplified as maxDepth is always non-negative)
  if (currentDepth >= maxDepth) {
    log('debug', `Max depth ${maxDepth} reached at ${currentDirAbs}, stopping recursion.`);
    return;
  }

  log('debug', `Scanning directory: ${currentDirAbs} at depth ${currentDepth}`);
  const normalizedWorkspaceRoot = path.normalize(workspaceRootAbs);

  try {
    // Use the injected fileSystemExecutor
    const entries = await fileSystemExecutor.readdir(currentDirAbs, { withFileTypes: true });
    for (const rawEntry of entries) {
      // Cast the unknown entry to DirentLike interface for type safety
      const entry = rawEntry as DirentLike;
      const absoluteEntryPath = path.join(currentDirAbs, entry.name);
      const relativePath = path.relative(workspaceRootAbs, absoluteEntryPath);

      // --- Skip conditions ---
      if (entry.isSymbolicLink()) {
        log('debug', `Skipping symbolic link: ${relativePath}`);
        continue;
      }

      // Skip common build/dependency directories by name
      if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) {
        log('debug', `Skipping standard directory: ${relativePath}`);
        continue;
      }

      // Ensure entry is within the workspace root (security/sanity check)
      if (!path.normalize(absoluteEntryPath).startsWith(normalizedWorkspaceRoot)) {
        log(
          'warn',
          `Skipping entry outside workspace root: ${absoluteEntryPath} (Workspace: ${workspaceRootAbs})`,
        );
        continue;
      }

      // --- Process entries ---
      if (entry.isDirectory()) {
        let isXcodeBundle = false;

        if (entry.name.endsWith('.xcodeproj')) {
          results.projects.push(absoluteEntryPath); // Use absolute path
          log('debug', `Found project: ${absoluteEntryPath}`);
          isXcodeBundle = true;
        } else if (entry.name.endsWith('.xcworkspace')) {
          results.workspaces.push(absoluteEntryPath); // Use absolute path
          log('debug', `Found workspace: ${absoluteEntryPath}`);
          isXcodeBundle = true;
        }

        // Recurse into regular directories, but not into found project/workspace bundles
        if (!isXcodeBundle) {
          await _findProjectsRecursive(
            absoluteEntryPath,
            workspaceRootAbs,
            currentDepth + 1,
            maxDepth,
            results,
            fileSystemExecutor,
          );
        }
      }
    }
  } catch (error) {
    let code;
    let message = 'Unknown error';

    if (error instanceof Error) {
      message = error.message;
      if ('code' in error) {
        code = error.code;
      }
    } else if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      }
      if ('code' in error && typeof error.code === 'string') {
        code = error.code;
      }
    } else {
      message = String(error);
    }

    if (code === 'EPERM' || code === 'EACCES') {
      log('debug', `Permission denied scanning directory: ${currentDirAbs}`);
    } else {
      log(
        'warning',
        `Error scanning directory ${currentDirAbs}: ${message} (Code: ${code ?? 'N/A'})`,
      );
    }
  }
}

// Define schema as ZodObject
const discoverProjsSchema = z.object({
  workspaceRoot: z.string().describe('The absolute path of the workspace root to scan within.'),
  scanPath: z
    .string()
    .optional()
    .describe('Optional: Path relative to workspace root to scan. Defaults to workspace root.'),
  maxDepth: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(`Optional: Maximum directory depth to scan. Defaults to ${DEFAULT_MAX_DEPTH}.`),
});

// Use z.infer for type safety
type DiscoverProjsParams = z.infer<typeof discoverProjsSchema>;

/**
 * Business logic for discovering projects.
 * Exported for testing purposes.
 */
export async function discover_projsLogic(
  params: DiscoverProjsParams,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  // Apply defaults
  const scanPath = params.scanPath ?? '.';
  const maxDepth = params.maxDepth ?? DEFAULT_MAX_DEPTH;
  const workspaceRoot = params.workspaceRoot;

  const relativeScanPath = scanPath;

  // Calculate and validate the absolute scan path
  const requestedScanPath = path.resolve(workspaceRoot, relativeScanPath ?? '.');
  let absoluteScanPath = requestedScanPath;
  const normalizedWorkspaceRoot = path.normalize(workspaceRoot);
  if (!path.normalize(absoluteScanPath).startsWith(normalizedWorkspaceRoot)) {
    log(
      'warn',
      `Requested scan path '${relativeScanPath}' resolved outside workspace root '${workspaceRoot}'. Defaulting scan to workspace root.`,
    );
    absoluteScanPath = normalizedWorkspaceRoot;
  }

  const results = { projects: [], workspaces: [] };

  log(
    'info',
    `Starting project discovery request: path=${absoluteScanPath}, maxDepth=${maxDepth}, workspace=${workspaceRoot}`,
  );

  try {
    // Ensure the scan path exists and is a directory
    const stats = await fileSystemExecutor.stat(absoluteScanPath);
    if (!stats.isDirectory()) {
      const errorMsg = `Scan path is not a directory: ${absoluteScanPath}`;
      log('error', errorMsg);
      // Return ToolResponse error format
      return {
        content: [createTextContent(errorMsg)],
        isError: true,
      };
    }
  } catch (error) {
    let code;
    let message = 'Unknown error accessing scan path';

    // Type guards - refined
    if (error instanceof Error) {
      message = error.message;
      // Check for code property specific to Node.js fs errors
      if ('code' in error) {
        code = error.code;
      }
    } else if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      }
      if ('code' in error && typeof error.code === 'string') {
        code = error.code;
      }
    } else {
      message = String(error);
    }

    const errorMsg = `Failed to access scan path: ${absoluteScanPath}. Error: ${message}`;
    log('error', `${errorMsg} - Code: ${code ?? 'N/A'}`);
    return {
      content: [createTextContent(errorMsg)],
      isError: true,
    };
  }

  // Start the recursive scan from the validated absolute path
  await _findProjectsRecursive(
    absoluteScanPath,
    workspaceRoot,
    0,
    maxDepth,
    results,
    fileSystemExecutor,
  );

  log(
    'info',
    `Discovery finished. Found ${results.projects.length} projects and ${results.workspaces.length} workspaces.`,
  );

  const responseContent = [
    createTextContent(
      `Discovery finished. Found ${results.projects.length} projects and ${results.workspaces.length} workspaces.`,
    ),
  ];

  // Sort results for consistent output
  results.projects.sort();
  results.workspaces.sort();

  if (results.projects.length > 0) {
    responseContent.push(
      createTextContent(`Projects found:\n - ${results.projects.join('\n - ')}`),
    );
  }

  if (results.workspaces.length > 0) {
    responseContent.push(
      createTextContent(`Workspaces found:\n - ${results.workspaces.join('\n - ')}`),
    );
  }

  return {
    content: responseContent,
    isError: false,
  };
}

export default {
  name: 'discover_projs',
  description:
    'Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.',
  schema: discoverProjsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    discoverProjsSchema,
    (params: DiscoverProjsParams) => {
      return discover_projsLogic(params, getDefaultFileSystemExecutor());
    },
    getDefaultCommandExecutor,
  ),
};
