import { z } from 'zod';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createTextResponse, validateRequiredParam } from '../../utils/index.js';
import { createErrorResponse } from '../../utils/index.js';
import { log } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

// Store active processes so we can manage them - keyed by PID for uniqueness
const activeProcesses = new Map();

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
  async handler(args: any): Promise<ToolResponse> {
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
      const child = spawn('swift', swiftArgs, {
        cwd: resolvedPath,
        env: { ...process.env },
      });

      let output = '';
      let errorOutput = '';
      let processExited = false;
      let timeoutHandle = null;

      // Set up output collection
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
      });

      // Handle process exit
      child.on('exit', (_code, _signal) => {
        processExited = true;
        if (child.pid) {
          activeProcesses.delete(child.pid);
        }
        if (timeoutHandle) clearTimeout(timeoutHandle);
      });

      child.on('error', (error) => {
        processExited = true;
        if (child.pid) {
          activeProcesses.delete(child.pid);
        }
        if (timeoutHandle) clearTimeout(timeoutHandle);
        errorOutput += `\nProcess error: ${error.message}`;
      });

      // Store the process by PID
      if (child.pid) {
        activeProcesses.set(child.pid, {
          process: child,
          startedAt: new Date(),
          packagePath: resolvedPath,
          executableName: params.executableName,
        });
      }

      if (params.background) {
        // Background mode: return immediately
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
        // Foreground mode: wait for completion or timeout, but always complete tool call
        return await new Promise((resolve) => {
          let resolved = false;

          // Set up timeout - this will fire and complete the tool call
          timeoutHandle = setTimeout(() => {
            if (!resolved && !processExited) {
              resolved = true;
              // Don't kill the process - let it continue running
              const content = [
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
                { type: 'text', text: output || '(no output so far)' },
              ];
              if (errorOutput) {
                content.push({ type: 'text', text: `Errors:\n${errorOutput}` });
              }
              resolve({ content });
            }
          }, timeout);

          // Wait for process to exit (only if it happens before timeout)
          child.on('exit', (code, signal) => {
            if (!resolved) {
              resolved = true;
              if (timeoutHandle) clearTimeout(timeoutHandle);

              if (code === 0) {
                resolve({
                  content: [
                    { type: 'text', text: '✅ Swift executable completed successfully.' },
                    {
                      type: 'text',
                      text: '💡 Process finished cleanly. Check output for results.',
                    },
                    { type: 'text', text: output || '(no output)' },
                  ],
                });
              } else {
                const exitReason = signal
                  ? `killed by signal ${signal}`
                  : `exited with code ${code}`;
                const content = [
                  { type: 'text', text: `❌ Swift executable ${exitReason}.` },
                  { type: 'text', text: output || '(no output)' },
                ];
                if (errorOutput) {
                  content.push({ type: 'text', text: `Errors:\n${errorOutput}` });
                }
                resolve({ content });
              }
            }
          });
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('error', `Swift run failed: ${message}`);
      // Note: No need to delete from activeProcesses since child.pid won't exist if spawn failed
      return createErrorResponse('Failed to execute swift run', message, 'SystemError');
    }
  },
};
