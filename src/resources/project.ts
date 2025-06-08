/**
 * Project Resources - Xcode Project Context and Metadata
 *
 * This module provides resources for accessing Xcode project information,
 * including project metadata, schemes, targets, and configuration details.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execSync } from 'child_process';
import { log } from '../utils/logger.js';

/**
 * Find Xcode project or workspace in the current directory
 */
function findXcodeProject(): { path: string; type: 'workspace' | 'project' } | null {
  const cwd = process.cwd();

  // Look for workspace first
  try {
    const workspaces = execSync('find . -name "*.xcworkspace" -maxdepth 2', {
      cwd,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    if (workspaces.length > 0) {
      return { path: workspaces[0], type: 'workspace' };
    }
  } catch {
    // Continue to look for projects
  }

  // Look for project files
  try {
    const projects = execSync('find . -name "*.xcodeproj" -maxdepth 2', {
      cwd,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    if (projects.length > 0) {
      return { path: projects[0], type: 'project' };
    }
  } catch {
    // No projects found
  }

  return null;
}

/**
 * Get project schemes using xcodebuild
 */
function getProjectSchemes(projectPath: string, projectType: 'workspace' | 'project'): string[] {
  try {
    const flag = projectType === 'workspace' ? '-workspace' : '-project';
    const output = execSync(`xcodebuild ${flag} "${projectPath}" -list`, {
      encoding: 'utf8',
      timeout: 10000,
    });

    const lines = output.split('\n');
    const schemesIndex = lines.findIndex((line) => line.trim() === 'Schemes:');

    if (schemesIndex === -1) return [];

    const schemes: string[] = [];
    for (let i = schemesIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.includes(':')) break;
      schemes.push(line);
    }

    return schemes;
  } catch (error) {
    log('warn', `Failed to get schemes for ${projectPath}: ${error}`);
    return [];
  }
}

/**
 * Get project targets using xcodebuild
 */
function getProjectTargets(projectPath: string, projectType: 'workspace' | 'project'): string[] {
  try {
    const flag = projectType === 'workspace' ? '-workspace' : '-project';
    const output = execSync(`xcodebuild ${flag} "${projectPath}" -list`, {
      encoding: 'utf8',
      timeout: 10000,
    });

    const lines = output.split('\n');
    const targetsIndex = lines.findIndex((line) => line.trim() === 'Targets:');

    if (targetsIndex === -1) return [];

    const targets: string[] = [];
    for (let i = targetsIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.includes(':')) break;
      targets.push(line);
    }

    return targets;
  } catch (error) {
    log('warn', `Failed to get targets for ${projectPath}: ${error}`);
    return [];
  }
}

/**
 * Register project-related resources
 */
export function registerProjectResources(server: McpServer): void {
  // Project info resource
  server.resource(
    'project-info',
    'xcode://project/info',
    'Xcode project metadata and configuration information',
    async (uri) => {
      const project = findXcodeProject();

      if (!project) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'No Xcode project or workspace found in current directory',
                  cwd: process.cwd(),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const schemes = getProjectSchemes(project.path, project.type);
      const targets = getProjectTargets(project.path, project.type);

      const projectInfo = {
        path: project.path,
        type: project.type,
        name: project.path
          .split('/')
          .pop()
          ?.replace(/\.(xcworkspace|xcodeproj)$/, ''),
        schemes,
        targets,
        cwd: process.cwd(),
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(projectInfo, null, 2),
          },
        ],
      };
    },
  );

  // Project schemes resource
  server.resource(
    'project-schemes',
    'xcode://project/schemes',
    'Available build schemes in the Xcode project',
    async (uri) => {
      const project = findXcodeProject();

      if (!project) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'No Xcode project or workspace found',
                  schemes: [],
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const schemes = getProjectSchemes(project.path, project.type);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                project: project.path,
                schemes: schemes.map((scheme) => ({
                  name: scheme,
                  uri: `xcode://build/settings/${encodeURIComponent(scheme)}`,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // Project targets resource
  server.resource(
    'project-targets',
    'xcode://project/targets',
    'Available targets in the Xcode project',
    async (uri) => {
      const project = findXcodeProject();

      if (!project) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'No Xcode project or workspace found',
                  targets: [],
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const targets = getProjectTargets(project.path, project.type);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                project: project.path,
                targets: targets.map((target) => ({
                  name: target,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  log('info', 'Registered project resources: project-info, project-schemes, project-targets');
}
