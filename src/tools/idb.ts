/**
 * idb Tools - Interact with iOS Simulator UI via idb
 *
 * This module provides tools to control and inspect the iOS Simulator UI
 * using Meta's idb (iOS Development Bridge) command-line utility.
 * It assumes idb is installed and available in the system PATH.
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ToolResponse } from '../types/common.js';
import { log } from '../utils/logger.js';
import { createTextResponse, validateRequiredParam } from '../utils/validation.js';
import { DependencyError, IdbError, SystemError, createErrorResponse } from '../utils/errors.js';
import { executeCommand } from '../utils/command.js';
import { createIdbNotAvailableResponse } from '../utils/idb-setup.js';
import { areIdbToolsAvailable } from '../utils/idb-setup.js';

const IDB_COMMAND = 'idb';
const LOG_PREFIX = '[IDB]';

async function executeIdbCommand(
  commandArgs: string[],
  simulatorUuid: string,
  commandName: string,
): Promise<string> {
  let fullArgs: string[] = [];

  const uiCommands = ['describe-all', 'describe-point', 'tap', 'swipe', 'key', 'press', 'text'];

  if (uiCommands.includes(commandName)) {
    fullArgs = ['ui', commandName, '--udid', simulatorUuid];
    if (commandArgs.length > 1) {
      fullArgs.push(...commandArgs.slice(1));
    }
  } else {
    fullArgs = [commandName, '--udid', simulatorUuid];
    if (commandArgs.length > 1) {
      fullArgs.push(...commandArgs.slice(1));
    }
  }

  // Construct the full command array with IDB_COMMAND as the first element
  const fullCommand = [IDB_COMMAND, ...fullArgs];

  try {
    const result = await executeCommand(fullCommand, `${LOG_PREFIX}: ${commandName}`, false);

    if (!result.success) {
      throw new IdbError(
        `idb command '${commandName}' failed.`,
        commandName,
        result.error || result.output,
        simulatorUuid,
      );
    }

    // Check for stderr output in successful commands
    if (result.error) {
      log(
        'warn',
        `${LOG_PREFIX}: Command '${commandName}' produced stderr output but exited successfully. Output: ${result.error}`,
      );
    }

    return result.output.trim();
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof IdbError) {
        throw error;
      }

      // Otherwise wrap it in a SystemError
      throw new SystemError(`Failed to execute idb command: ${error.message}`, error);
    }

    // For any other type of error
    throw new SystemError(`Failed to execute idb command: ${String(error)}`);
  }
}

// --- Registration Function ---

/**
 * Registers all idb-related tools with the dispatcher.
 * @param server The McpServer instance.
 */
export function registerIdbTools(server: McpServer): void {
  // Check if idb is available and log a warning if not
  if (!areIdbToolsAvailable()) {
    log('warning', `${LOG_PREFIX}: failed to register idb tools as idb is not available`);
    return;
  }

  // 1. describe_all
  server.tool(
    'describe_all',
    'Gets the full accessibility hierarchy for the running app in the specified simulator as JSON.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'describe_all';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;

      const { simulatorUuid } = params;
      const commandArgs = ['describe-all'];

      log('info', `${LOG_PREFIX}/${toolName}: Starting for ${simulatorUuid}`);

      try {
        const responseText = await executeIdbCommand(commandArgs, simulatorUuid, 'describe-all');

        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return {
          content: [
            {
              type: 'text',
              text:
                'Accessibility hierarchy retrieved successfully:\n```json\n' +
                responseText +
                '\n```',
            },
            {
              type: 'text',
              text: `Next Steps:
- Use describe_point to inspect a specific element.
- Use tap, swipe, etc. to interact with the UI.`,
            },
          ],
        };
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to get accessibility hierarchy: ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 2. describe_point
  server.tool(
    'describe_point',
    'Gets accessibility information for the element at the specified (x, y) coordinates in the simulator as JSON.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x: z.number().int('X coordinate must be an integer'),
      y: z.number().int('Y coordinate must be an integer'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'describe_point';
      // Validation
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;

      const xValidation = validateRequiredParam('x', params.x);
      if (!xValidation.isValid) return xValidation.errorResponse!;

      const yValidation = validateRequiredParam('y', params.y);
      if (!yValidation.isValid) return yValidation.errorResponse!;

      const { simulatorUuid, x, y } = params;
      const commandArgs = ['describe-point', String(x), String(y)];

      log('info', `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}) on ${simulatorUuid}`);

      try {
        const responseText = await executeIdbCommand(commandArgs, simulatorUuid, 'describe-point');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return {
          content: [
            {
              type: 'text',
              text: `Element information at (${x}, ${y}) retrieved successfully:\n\`\`\`json\n${responseText}\n\`\`\``,
            },
            {
              type: 'text',
              text: `Next Steps:
- Use describe_all to see the full hierarchy.
- Use tap, swipe, etc. on the coordinates if it's an interactive element.`,
            },
          ],
        };
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to get accessibility info at (${x}, ${y}): ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 3. tap
  server.tool(
    'tap',
    'Simulates a tap event at the specified (x, y) coordinates in the simulator. Make sure to tap the center of the element you want to tap.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x: z.number().int('X coordinate must be an integer'),
      y: z.number().int('Y coordinate must be an integer'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'tap';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      // Zod handles number validation
      const xValidation = validateRequiredParam('x', params.x);
      if (!xValidation.isValid) return xValidation.errorResponse!;
      const yValidation = validateRequiredParam('y', params.y);
      if (!yValidation.isValid) return yValidation.errorResponse!;

      const { simulatorUuid, x, y } = params;
      const commandArgs = ['tap', String(x), String(y)];

      log('info', `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}) on ${simulatorUuid}`);

      try {
        await executeIdbCommand(commandArgs, simulatorUuid, 'tap');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Tap at (${x}, ${y}) simulated successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to simulate tap at (${x}, ${y}): ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 4. long_press
  server.tool(
    'long_press',
    'Simulates a long press event at (x, y) for a given duration (ms).',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x: z.number().int('X coordinate must be an integer'),
      y: z.number().int('Y coordinate must be an integer'),
      duration: z.number().positive('Duration must be a positive number (ms)'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'long_press';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const xValidation = validateRequiredParam('x', params.x);
      if (!xValidation.isValid) return xValidation.errorResponse!;
      const yValidation = validateRequiredParam('y', params.y);
      if (!yValidation.isValid) return yValidation.errorResponse!;
      const durationValidation = validateRequiredParam('duration', params.duration);
      if (!durationValidation.isValid) return durationValidation.errorResponse!;

      const { simulatorUuid, x, y, duration } = params;
      const durationSeconds = duration / 1000; // idb uses seconds
      const commandArgs = ['press', String(x), String(y), '--duration', String(durationSeconds)];

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}), ${duration}ms on ${simulatorUuid}`,
      );

      try {
        await executeIdbCommand(commandArgs, simulatorUuid, 'press');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(
          `Long press at (${x}, ${y}) for ${duration}ms simulated successfully.`,
        );
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to simulate long press at (${x}, ${y}): ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 5. swipe
  server.tool(
    'swipe',
    'Simulates a swipe from (x1, y1) to (x2, y2) with optional velocity (points/sec).',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x1: z.number().int('Start X (x1) must be an integer'),
      y1: z.number().int('Start Y (y1) must be an integer'),
      x2: z.number().int('End X (x2) must be an integer'),
      y2: z.number().int('End Y (y2) must be an integer'),
      velocity: z.number().positive('Velocity must be positive').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'swipe';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const x1Validation = validateRequiredParam('x1', params.x1);
      if (!x1Validation.isValid) return x1Validation.errorResponse!;
      const y1Validation = validateRequiredParam('y1', params.y1);
      if (!y1Validation.isValid) return y1Validation.errorResponse!;
      const x2Validation = validateRequiredParam('x2', params.x2);
      if (!x2Validation.isValid) return x2Validation.errorResponse!;
      const y2Validation = validateRequiredParam('y2', params.y2);
      if (!y2Validation.isValid) return y2Validation.errorResponse!;
      // velocity is optional

      const { simulatorUuid, x1, y1, x2, y2, velocity } = params;
      const commandArgs = ['swipe', String(x1), String(y1), String(x2), String(y2)];
      if (velocity) {
        commandArgs.push('--delta', String(velocity)); // idb uses --delta
      }

      const velocityText = velocity ? ` with velocity ${velocity} pts/sec` : '';
      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting swipe (${x1},${y1})->(${x2},${y2})${velocityText} on ${simulatorUuid}`,
      );

      try {
        await executeIdbCommand(commandArgs, simulatorUuid, 'swipe');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(
          `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})${velocityText} simulated successfully.`,
        );
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to simulate swipe: ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 6. type_text
  server.tool(
    'type_text',
    'Simulates typing the specified text into the simulator. Make sure to tap the center of the text field first to focus it.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      text: z.string().min(1, 'Text cannot be empty'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'type_text';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const textValidation = validateRequiredParam('text', params.text);
      if (!textValidation.isValid) return textValidation.errorResponse!;

      const { simulatorUuid, text } = params;
      const commandArgs = ['text', text];

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting type "${text.substring(0, 20)}..." on ${simulatorUuid}`,
      );

      try {
        await executeIdbCommand(commandArgs, simulatorUuid, 'text');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Text typing simulated successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to simulate text typing: ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 7. key_press
  server.tool(
    'key_press',
    'Simulates pressing a hardware/keyboard key using its key code.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      keyCode: z.number().int('Key code must be an integer'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'key_press';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const keyCodeValidation = validateRequiredParam('keyCode', params.keyCode);
      if (!keyCodeValidation.isValid) return keyCodeValidation.errorResponse!;

      const { simulatorUuid, keyCode } = params;
      const commandArgs = ['key', String(keyCode)];

      log('info', `${LOG_PREFIX}/${toolName}: Starting key press ${keyCode} on ${simulatorUuid}`);

      try {
        await executeIdbCommand(commandArgs, simulatorUuid, 'key');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Key press (code: ${keyCode}) simulated successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (error instanceof IdbError) {
          return createErrorResponse(
            `Failed to simulate key press (code: ${keyCode}): ${error.message}`,
            error.idbOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${error.message}`,
            error.originalError?.stack,
            error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );

  // 8. screenshot
  server.tool(
    'screenshot',
    'Captures a screenshot of the simulator screen and returns the path to the PNG file.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'screenshot';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;

      const { simulatorUuid } = params;
      const tempDir = os.tmpdir();
      const screenshotFilename = `idb_screenshot_${uuidv4()}.png`;
      const screenshotPath = path.join(tempDir, screenshotFilename);
      // Based on error message, 'screencapture' is not a valid ui command
      // Use the 'screenshot' command instead which is part of the main idb namespace
      const commandArgs = ['screenshot', screenshotPath];

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting capture to ${screenshotPath} on ${simulatorUuid}`,
      );

      try {
        // Execute the screenshot command
        await executeIdbCommand(commandArgs, simulatorUuid, 'screenshot');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

        try {
          // Read the image file into memory
          const imageBuffer = await fs.readFile(screenshotPath);

          // Encode the image as a Base64 string
          const base64Image = imageBuffer.toString('base64');

          log('info', `${LOG_PREFIX}/${toolName}: Successfully encoded image as Base64`);

          // Clean up the temporary file
          await fs.unlink(screenshotPath).catch((err) => {
            log('warning', `${LOG_PREFIX}/${toolName}: Failed to delete temporary file: ${err}`);
          });

          // Return the image directly in the tool response
          return {
            content: [
              {
                type: 'image',
                data: base64Image,
                mimeType: 'image/png',
              },
            ],
          };
        } catch (fileError) {
          log('error', `${LOG_PREFIX}/${toolName}: Failed to process image file: ${fileError}`);
          return createErrorResponse(
            `Screenshot captured but failed to process image file: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
            undefined,
            'FileProcessingError',
          );
        }
      } catch (_error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${_error}`);
        // Consider deleting the potentially empty/corrupt file on error
        // fs.unlink(screenshotPath, () => {});
        if (_error instanceof DependencyError) {
          return createIdbNotAvailableResponse();
        } else if (_error instanceof IdbError) {
          return createErrorResponse(
            `Failed to capture screenshot: ${_error.message}`,
            _error.idbOutput,
            _error.name,
          );
        } else if (_error instanceof SystemError) {
          return createErrorResponse(
            `System error executing idb: ${_error.message}`,
            _error.originalError?.stack,
            _error.name,
          );
        }
        return createErrorResponse(
          `An unexpected error occurred: ${_error instanceof Error ? _error.message : String(_error)}`,
          undefined,
          'UnexpectedError',
        );
      }
    },
  );
}
