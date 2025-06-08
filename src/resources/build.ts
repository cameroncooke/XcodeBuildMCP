/**
 * Build Resources - Xcode Build Context and Configuration
 *
 * This module provides resources for accessing Xcode build information,
 * including build settings, logs, and configuration details.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { log } from '../utils/logger.js';

/**
 * Find Xcode project or workspace in the current directory
 */
function findXcodeProject(): { path: string; type: 'workspace' | 'project' } | null {
  const cwd = process.cwd();

  // Look for workspace files first
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
 * Get build settings for a specific scheme
 */
function getBuildSettings(
  projectPath: string,
  projectType: 'workspace' | 'project',
  scheme: string,
): any {
  try {
    const flag = projectType === 'workspace' ? '-workspace' : '-project';
    const output = execSync(
      `xcodebuild ${flag} "${projectPath}" -scheme "${scheme}" -showBuildSettings`,
      {
        encoding: 'utf8',
        timeout: 15000,
      },
    );

    const settings: any = {};
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        settings[match[1]] = match[2];
      }
    }

    return settings;
  } catch (error) {
    log('warn', `Failed to get build settings for scheme ${scheme}: ${error}`);
    return { error: `Failed to get build settings: ${error}` };
  }
}

/**
 * Find the most recent build log
 */
function findLatestBuildLog(): string | null {
  try {
    const derivedDataPath = execSync(
      'xcodebuild -showBuildSettings | grep "BUILD_DIR" | head -1 | cut -d "=" -f2 | xargs dirname',
      {
        encoding: 'utf8',
        timeout: 5000,
      },
    ).trim();

    if (!derivedDataPath || !existsSync(derivedDataPath)) {
      return null;
    }

    // Look for build logs in DerivedData
    const logsPath = path.join(derivedDataPath, 'Logs', 'Build');
    if (!existsSync(logsPath)) {
      return null;
    }

    const logFiles = readdirSync(logsPath)
      .filter((file) => file.endsWith('.xcactivitylog'))
      .map((file) => ({
        name: file,
        path: path.join(logsPath, file),
        mtime: statSync(path.join(logsPath, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return logFiles.length > 0 ? logFiles[0].path : null;
  } catch (error) {
    log('warn', `Failed to find latest build log: ${error}`);
    return null;
  }
}

/**
 * Register build-related resources
 */
export function registerBuildResources(server: McpServer): void {
  // Build settings resource template for specific schemes
  server.resource(
    'build-settings',
    new ResourceTemplate('xcode://build/settings/{scheme}', {
      list: async () => {
        const project = findXcodeProject();
        if (!project) {
          return { resources: [] };
        }

        try {
          const flag = project.type === 'workspace' ? '-workspace' : '-project';
          const output = execSync(`xcodebuild ${flag} "${project.path}" -list`, {
            encoding: 'utf8',
            timeout: 10000,
          });

          const lines = output.split('\n');
          const schemesIndex = lines.findIndex((line) => line.trim() === 'Schemes:');

          if (schemesIndex === -1) return { resources: [] };

          const schemes: string[] = [];
          for (let i = schemesIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.includes(':')) break;
            schemes.push(line);
          }

          return {
            resources: schemes.map((scheme) => ({
              uri: `xcode://build/settings/${encodeURIComponent(scheme)}`,
              name: `Build Settings - ${scheme}`,
              description: `Build settings and configuration for the ${scheme} scheme`,
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
      complete: {
        scheme: async (value: string) => {
          const project = findXcodeProject();
          if (!project) return [];

          try {
            const flag = project.type === 'workspace' ? '-workspace' : '-project';
            const output = execSync(`xcodebuild ${flag} "${project.path}" -list`, {
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

            return schemes.filter((scheme) => scheme.toLowerCase().includes(value.toLowerCase()));
          } catch {
            return [];
          }
        },
      },
    }),
    'Build settings and configuration for Xcode schemes',
    async (uri, variables) => {
      const scheme = decodeURIComponent(variables.scheme);
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
                  scheme,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const settings = getBuildSettings(project.path, project.type, scheme);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                project: project.path,
                scheme,
                settings,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // Latest build log resource
  server.resource(
    'build-logs-latest',
    'xcode://build/logs/latest',
    'Most recent Xcode build log',
    async (uri) => {
      const logPath = findLatestBuildLog();

      if (!logPath) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'No recent build logs found',
                  suggestion: 'Run a build first to generate logs',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      try {
        // For .xcactivitylog files, we need to use xcrun to extract readable content
        const logContent = execSync(`xcrun xcactivitylog dump "${logPath}"`, {
          encoding: 'utf8',
          timeout: 10000,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        });

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'text/plain',
              text: logContent,
            },
          ],
        };
      } catch (error) {
        // Fallback to basic file info if xcactivitylog dump fails
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  logPath,
                  error: 'Failed to extract log content',
                  details: `${error}`,
                  suggestion: 'Use xcodebuild tools to access detailed log information',
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );

  log('info', 'Registered build resources: build-settings template, build-logs-latest');
}
