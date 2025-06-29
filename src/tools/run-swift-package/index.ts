import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { registerTool, swiftConfigurationSchema, parseAsLibrarySchema } from '../common/index.js';
import { executeCommand } from '../../utils/command.js';
import { createTextResponse, validateRequiredParam } from '../../utils/validation.js';
import { ToolResponse } from '../../types/common.js';
import { createErrorResponse } from '../../utils/errors.js';
import { log } from '../../utils/logger.js';

// Store active processes so we can manage them - keyed by PID for uniqueness
const activeProcesses = new Map<
  number,
  { process: ChildProcess; startedAt: Date; packagePath: string; executableName?: string }
>();

// Extract tool name
export const runSwiftPackageToolName = 'swift_package_run';

// Extract tool description
export const runSwiftPackageToolDescription =
  'Runs an executable target from a Swift Package with swift run';

// Extract tool schema
export const runSwiftPackageToolSchema = {
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
};

// Extract tool handler
export async function runSwiftPackageToolHandler(params: {
  packagePath: string;
  executableName?: string;
  arguments?: string[];
  configuration?: 'debug' | 'release';
  timeout?: number;
  background?: boolean;
  parseAsLibrary?: boolean;
}): Promise<ToolResponse> {
  const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
  if (!pkgValidation.isValid) return pkgValidation.errorResponse!;

  const resolvedPath = path.resolve(params.packagePath);
  const timeout = Math.min(params.timeout || 30, 300) * 1000; // Convert to ms, max 5 minutes

  const args: string[] = ['run', '--package-path', resolvedPath];

  if (params.configuration && params.configuration.toLowerCase() === 'release') {
    args.push('-c', 'release');
  } else if (params.configuration && params.configuration.toLowerCase() !== 'debug') {
    return createTextResponse("Invalid configuration. Use 'debug' or 'release'.", true);
  }

  if (params.parseAsLibrary) {
    args.push('-Xswiftc', '-parse-as-library');
  }

  if (params.executableName) {
    args.push(params.executableName);
  }

  // Add double dash before executable arguments
  if (params.arguments && params.arguments.length > 0) {
    args.push('--');
    args.push(...params.arguments);
  }

  log('info', `Running swift ${args.join(' ')}`);

  try {
    const child = spawn('swift', args, {
      cwd: resolvedPath,
      env: { ...process.env },
    });

    let output = '';
    let errorOutput = '';
    let processExited = false;
    let timeoutHandle: NodeJS.Timeout | null = null;

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
            type: 'text' as const,
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
            const content: Array<{ type: 'text'; text: string }> = [
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
              const exitReason = signal ? `killed by signal ${signal}` : `exited with code ${code}`;
              const content: Array<{ type: 'text'; text: string }> = [
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
}

export function registerRunSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    runSwiftPackageToolName,
    runSwiftPackageToolDescription,
    runSwiftPackageToolSchema,
    runSwiftPackageToolHandler,
  );
}

// Extract tool name for swift_package_list
export const listSwiftPackageToolName = 'swift_package_list';

// Extract tool description for swift_package_list
export const listSwiftPackageToolDescription = 'Lists currently running Swift Package processes';

// Extract tool schema for swift_package_list
export const listSwiftPackageToolSchema = {};

// Extract tool handler for swift_package_list
export async function listSwiftPackageToolHandler(): Promise<ToolResponse> {
  const processes = Array.from(activeProcesses.entries());

  if (processes.length === 0) {
    return {
      content: [
        { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
        { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
      ],
    };
  }

  const content = [
    { type: 'text', text: `📋 Active Swift Package processes (${processes.length}):` },
  ];

  for (const [pid, info] of processes) {
    const executableName = info.executableName || 'default';
    const runtime = Math.round((Date.now() - info.startedAt.getTime()) / 1000);
    content.push({
      type: 'text',
      text: `  • PID ${pid}: ${executableName} (${info.packagePath}) - running ${runtime}s`,
    });
  }

  content.push({
    type: 'text',
    text: '💡 Use swift_package_stop with a PID to terminate a process.',
  });

  return { content: content as Array<{ type: 'text'; text: string }> };
}

// Helper tool to stop background processes
// Helper tool to list active processes
export function registerListSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    listSwiftPackageToolName,
    listSwiftPackageToolDescription,
    listSwiftPackageToolSchema,
    listSwiftPackageToolHandler,
  );
}

// Extract tool name for swift_package_stop
export const stopSwiftPackageToolName = 'swift_package_stop';

// Extract tool description for swift_package_stop
export const stopSwiftPackageToolDescription =
  'Stops a running Swift Package executable started with swift_package_run';

// Extract tool schema for swift_package_stop
export const stopSwiftPackageToolSchema = {
  pid: z.number().describe('Process ID (PID) of the running executable'),
};

// Extract tool handler for swift_package_stop
export async function stopSwiftPackageToolHandler(params: { pid: number }): Promise<ToolResponse> {
  const processInfo = activeProcesses.get(params.pid);
  if (!processInfo) {
    return createTextResponse(
      `⚠️ No running process found with PID ${params.pid}. Use swift_package_run to check active processes.`,
      true,
    );
  }

  try {
    processInfo.process.kill('SIGTERM');

    // Give it 5 seconds to terminate gracefully
    await new Promise((resolve) => {
      let terminated = false;

      processInfo.process.on('exit', () => {
        terminated = true;
        resolve(true);
      });

      setTimeout(() => {
        if (!terminated) {
          processInfo.process.kill('SIGKILL');
        }
        resolve(true);
      }, 5000);
    });

    activeProcesses.delete(params.pid);

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Stopped executable (was running since ${processInfo.startedAt.toISOString()})`,
        },
        {
          type: 'text' as const,
          text: `💡 Process terminated. You can now run swift_package_run again if needed.`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to stop process', message, 'SystemError');
  }
}

export function registerStopSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    stopSwiftPackageToolName,
    stopSwiftPackageToolDescription,
    stopSwiftPackageToolSchema,
    stopSwiftPackageToolHandler,
  );
}

// Extract tool name for swift_package_clean
export const cleanSwiftPackageToolName = 'swift_package_clean';

// Extract tool description for swift_package_clean
export const cleanSwiftPackageToolDescription =
  'Cleans Swift Package build artifacts and derived data';

// Extract tool schema for swift_package_clean
export const cleanSwiftPackageToolSchema = {
  packagePath: z.string().describe('Path to the Swift package root (Required)'),
};

// Extract tool handler for swift_package_clean
export async function cleanSwiftPackageToolHandler(params: {
  packagePath: string;
}): Promise<ToolResponse> {
  const pkgValidation = validateRequiredParam('packagePath', params.packagePath);
  if (!pkgValidation.isValid) return pkgValidation.errorResponse!;

  const resolvedPath = path.resolve(params.packagePath);
  const args: string[] = ['package', '--package-path', resolvedPath, 'clean'];

  log('info', `Running swift ${args.join(' ')}`);
  try {
    const result = await executeCommand(['swift', ...args], 'Swift Package Clean');
    if (!result.success) {
      const errorMessage = result.error || result.output || 'Unknown error';
      return createErrorResponse('Swift package clean failed', errorMessage, 'CleanError');
    }

    return {
      content: [
        { type: 'text', text: '✅ Swift package cleaned successfully.' },
        {
          type: 'text',
          text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
        },
        { type: 'text', text: result.output || '(clean completed silently)' },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Swift package clean failed: ${message}`);
    return createErrorResponse('Failed to execute swift package clean', message, 'SystemError');
  }
}

// Helper tool to clean Swift package build artifacts
export function registerCleanSwiftPackageTool(server: McpServer): void {
  registerTool(
    server,
    cleanSwiftPackageToolName,
    cleanSwiftPackageToolDescription,
    cleanSwiftPackageToolSchema,
    cleanSwiftPackageToolHandler,
  );
}
