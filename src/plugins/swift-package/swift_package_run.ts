import { z } from 'zod';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createTextResponse, validateRequiredParam } from '../../utils/index.js';
import { createErrorResponse } from '../../utils/index.js';
import { log } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';
import { addProcess } from './active-processes.js';

// Inlined schemas from src/tools/common/index.ts
const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe("Build configuration: 'debug' (default) or 'release'");

const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Add -parse-as-library flag for @main support (default: false)');

export default {
  name: 'swift_package_run',
  description: 'Runs an executable target from a Swift Package with swift run',
  schema: {
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    executableName: z
      .string()
      .optional()
      .describe('Name of executable to run (defaults to package name)'),
    arguments: z.array(z.string()).optional().describe('Arguments to pass to the executable'),
    configuration: swiftConfigurationSchema,
    timeout: z.number().optional().describe('Timeout in seconds (default: 30, max: 300)'),
    background: z
      .boolean()
      .optional()
      .describe('Run in background and return immediately (default: false)'),
    parseAsLibrary: parseAsLibrarySchema,
  },
  async handler(
    args: Record<string, unknown>,
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<ToolResponse> {
    const params = args;
    const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
    if (!pkgValidation.isValid) return pkgValidation.errorResponse;

    const resolvedPath = path.resolve(params.packagePath);
    const timeout = Math.min(params.timeout || 30, 300) * 1000; // Convert to ms, max 5 minutes

    const swiftArgs = ['run', '--package-path', resolvedPath];

    if (params.configuration && params.configuration.toLowerCase() === 'release') {
      swiftArgs.push('-c', 'release');
    } else if (params.configuration && params.configuration.toLowerCase() !== 'debug') {
      return createTextResponse("Invalid configuration. Use 'debug' or 'release'.", true);
    }

    if (params.parseAsLibrary) {
      swiftArgs.push('-Xswiftc', '-parse-as-library');
    }

    if (params.executableName) {
      swiftArgs.push(params.executableName);
    }

    // Add double dash before executable arguments
    if (params.arguments && params.arguments.length > 0) {
      swiftArgs.push('--');
      swiftArgs.push(...params.arguments);
    }

    log('info', `Running swift ${swiftArgs.join(' ')}`);

    try {
      // For background processes, we need direct access to the ChildProcess
      // So we'll use spawn directly but in a way that integrates with CommandExecutor for foreground processes
      if (params.background) {
        // Background mode: use direct spawn for process management
        const child = spawn('swift', swiftArgs, {
          cwd: resolvedPath,
          env: { ...process.env },
        });

        // Store the process in active processes system
        if (child.pid) {
          addProcess(child.pid, {
            process: child,
            startedAt: new Date(),
          });
        }

        return {
          content: [
            {
              type: 'text',
              text:
                `🚀 Started executable in background (PID: ${child.pid})\n` +
                `💡 Process is running independently. Use swift_package_stop with PID ${child.pid} to terminate when needed.`,
            },
          ],
        };
      } else {
        // Foreground mode: use CommandExecutor but handle long-running processes
        const command = ['swift', ...swiftArgs];

        // Create a promise that will either complete with the command result or timeout
        const commandPromise = executor(command, 'Swift Package Run', true, undefined);

        const timeoutPromise = new Promise<any>((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              output: '',
              error: `Process timed out after ${timeout / 1000} seconds`,
              timedOut: true,
            });
          }, timeout);
        });

        // Race between command completion and timeout
        const result = await Promise.race([commandPromise, timeoutPromise]);

        if (result.timedOut) {
          // For timeout case, we need to start the process in background mode for continued monitoring
          const child = spawn('swift', swiftArgs, {
            cwd: resolvedPath,
            env: { ...process.env },
          });

          if (child.pid) {
            addProcess(child.pid, {
              process: child,
              startedAt: new Date(),
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: `⏱️ Process timed out after ${timeout / 1000} seconds but continues running.`,
              },
              {
                type: 'text',
                text: `PID: ${child.pid}`,
              },
              {
                type: 'text',
                text: `💡 Process is still running. Use swift_package_stop with PID ${child.pid} to terminate when needed.`,
              },
              { type: 'text', text: result.output || '(no output so far)' },
            ],
          };
        }

        if (result.success) {
          return {
            content: [
              { type: 'text', text: '✅ Swift executable completed successfully.' },
              {
                type: 'text',
                text: '💡 Process finished cleanly. Check output for results.',
              },
              { type: 'text', text: result.output || '(no output)' },
            ],
          };
        } else {
          const content = [
            { type: 'text', text: '❌ Swift executable failed.' },
            { type: 'text', text: result.output || '(no output)' },
          ];
          if (result.error) {
            content.push({ type: 'text', text: `Errors:\n${result.error}` });
          }
          return { content };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('error', `Swift run failed: ${message}`);
      return createErrorResponse('Failed to execute swift run', message, 'SystemError');
    }
  },
};
