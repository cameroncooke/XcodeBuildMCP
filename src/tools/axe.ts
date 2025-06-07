/**
 * UI Automation Tools - Interact with iOS Simulator UI via AXe
 *
 * This module provides tools to control and inspect the iOS Simulator UI
 * using AXe command-line utility.
 * It assumes AXe is installed and available in the system PATH.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ToolResponse } from '../types/common.js';
import { log } from '../utils/logger.js';
import { createTextResponse, validateRequiredParam } from '../utils/validation.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../utils/errors.js';
import { executeCommand } from '../utils/command.js';
import { createAxeNotAvailableResponse } from '../utils/axe-setup.js';
import { areAxeToolsAvailable } from '../utils/axe-setup.js';

const AXE_COMMAND = 'axe';
const LOG_PREFIX = '[AXe]';

// Session tracking for describe_ui warnings
interface DescribeUISession {
  timestamp: number;
  simulatorUuid: string;
}

const describeUITimestamps = new Map<string, DescribeUISession>();
const DESCRIBE_UI_WARNING_TIMEOUT = 60000; // 60 seconds

function recordDescribeUICall(simulatorUuid: string): void {
  describeUITimestamps.set(simulatorUuid, {
    timestamp: Date.now(),
    simulatorUuid,
  });
}

function getCoordinateWarning(simulatorUuid: string): string | null {
  const session = describeUITimestamps.get(simulatorUuid);
  if (!session) {
    return 'Warning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.';
  }

  const timeSinceDescribe = Date.now() - session.timestamp;
  if (timeSinceDescribe > DESCRIBE_UI_WARNING_TIMEOUT) {
    const secondsAgo = Math.round(timeSinceDescribe / 1000);
    return `Warning: describe_ui was last called ${secondsAgo} seconds ago. Consider refreshing UI coordinates with describe_ui instead of using potentially stale coordinates.`;
  }

  return null;
}

async function executeAxeCommand(
  commandArgs: string[],
  simulatorUuid: string,
  commandName: string,
): Promise<string> {
  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorUuid];

  // Construct the full command array with AXE_COMMAND as the first element
  const fullCommand = [AXE_COMMAND, ...fullArgs];

  try {
    const result = await executeCommand(fullCommand, `${LOG_PREFIX}: ${commandName}`, false);

    if (!result.success) {
      throw new AxeError(
        `axe command '${commandName}' failed.`,
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
      if (error instanceof AxeError) {
        throw error;
      }

      // Otherwise wrap it in a SystemError
      throw new SystemError(`Failed to execute axe command: ${error.message}`, error);
    }

    // For any other type of error
    throw new SystemError(`Failed to execute axe command: ${String(error)}`);
  }
}

// --- Registration Function ---

/**
 * Registers all axe-related tools with the dispatcher.
 * @param server The McpServer instance.
 */
export function registerAxeTools(server: McpServer): void {
  // Check if axe is available and log a warning if not
  if (!areAxeToolsAvailable()) {
    log('warning', `${LOG_PREFIX}: failed to register axe tools as axe is not available`);
    return;
  }

  // 1. describe_ui
  server.tool(
    'describe_ui',
    'Gets entire view hierarchy with precise frame coordinates (x, y, width, height) for all visible elements. Use this before UI interactions or after layout changes - do NOT guess coordinates from screenshots. Returns JSON tree with frame data for accurate automation.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'describe_ui';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;

      const { simulatorUuid } = params;
      const commandArgs = ['describe-ui'];

      log('info', `${LOG_PREFIX}/${toolName}: Starting for ${simulatorUuid}`);

      try {
        const responseText = await executeAxeCommand(commandArgs, simulatorUuid, 'describe-ui');

        // Record the describe_ui call for warning system
        recordDescribeUICall(simulatorUuid);

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
- Use frame coordinates for tap/swipe (center: x+width/2, y+height/2)
- Re-run describe_ui after layout changes
- Screenshots are for visual verification only`,
            },
          ],
        };
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to get accessibility hierarchy: ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 2. tap
  server.tool(
    'tap',
    "Tap at specific coordinates. Use describe_ui to get precise element coordinates (don't guess from screenshots). Supports optional timing delays.",
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x: z.number().int('X coordinate must be an integer'),
      y: z.number().int('Y coordinate must be an integer'),
      preDelay: z.number().min(0, 'Pre-delay must be non-negative').optional(),
      postDelay: z.number().min(0, 'Post-delay must be non-negative').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'tap';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const xValidation = validateRequiredParam('x', params.x);
      if (!xValidation.isValid) return xValidation.errorResponse!;
      const yValidation = validateRequiredParam('y', params.y);
      if (!yValidation.isValid) return yValidation.errorResponse!;

      const { simulatorUuid, x, y, preDelay, postDelay } = params;
      const commandArgs = ['tap', '-x', String(x), '-y', String(y)];
      if (preDelay !== undefined) {
        commandArgs.push('--pre-delay', String(preDelay));
      }
      if (postDelay !== undefined) {
        commandArgs.push('--post-delay', String(postDelay));
      }

      log('info', `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}) on ${simulatorUuid}`);

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'tap');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

        const warning = getCoordinateWarning(simulatorUuid);
        const message = `Tap at (${x}, ${y}) simulated successfully.`;

        if (warning) {
          return createTextResponse(`${message}\n\n${warning}`);
        }

        return createTextResponse(message);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to simulate tap at (${x}, ${y}): ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 3. long_press
  server.tool(
    'long_press',
    "Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don't guess from screenshots).",
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
      // AXe uses touch command with --down, --up, and --delay for long press
      const delayInSeconds = duration / 1000; // Convert ms to seconds
      const commandArgs = [
        'touch',
        '-x',
        String(x),
        '-y',
        String(y),
        '--down',
        '--up',
        '--delay',
        String(delayInSeconds),
      ];

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting for (${x}, ${y}), ${duration}ms on ${simulatorUuid}`,
      );

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'touch');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

        const warning = getCoordinateWarning(simulatorUuid);
        const message = `Long press at (${x}, ${y}) for ${duration}ms simulated successfully.`;

        if (warning) {
          return createTextResponse(`${message}\n\n${warning}`);
        }

        return createTextResponse(message);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to simulate long press at (${x}, ${y}): ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 4. swipe
  server.tool(
    'swipe',
    "Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.",
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x1: z.number().int('Start X coordinate must be an integer'),
      y1: z.number().int('Start Y coordinate must be an integer'),
      x2: z.number().int('End X coordinate must be an integer'),
      y2: z.number().int('End Y coordinate must be an integer'),
      duration: z.number().min(0, 'Duration must be non-negative').optional(),
      delta: z.number().min(0, 'Delta must be non-negative').optional(),
      preDelay: z.number().min(0, 'Pre-delay must be non-negative').optional(),
      postDelay: z.number().min(0, 'Post-delay must be non-negative').optional(),
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

      const { simulatorUuid, x1, y1, x2, y2, duration, delta, preDelay, postDelay } = params;
      const commandArgs = [
        'swipe',
        '--start-x',
        String(x1),
        '--start-y',
        String(y1),
        '--end-x',
        String(x2),
        '--end-y',
        String(y2),
      ];
      if (duration !== undefined) {
        commandArgs.push('--duration', String(duration));
      }
      if (delta !== undefined) {
        commandArgs.push('--delta', String(delta));
      }
      if (preDelay !== undefined) {
        commandArgs.push('--pre-delay', String(preDelay));
      }
      if (postDelay !== undefined) {
        commandArgs.push('--post-delay', String(postDelay));
      }

      const optionsText = duration ? ` duration=${duration}s` : '';
      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting swipe (${x1},${y1})->(${x2},${y2})${optionsText} on ${simulatorUuid}`,
      );

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'swipe');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

        const warning = getCoordinateWarning(simulatorUuid);
        const message = `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})${optionsText} simulated successfully.`;

        if (warning) {
          return createTextResponse(`${message}\n\n${warning}`);
        }

        return createTextResponse(message);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to simulate swipe: ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 5. type_text
  server.tool(
    'type_text',
    'Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type.',
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
      const commandArgs = ['type', text];

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting type "${text.substring(0, 20)}..." on ${simulatorUuid}`,
      );

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'type');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Text typing simulated successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to simulate text typing: ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 6. key_press
  server.tool(
    'key_press',
    'Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      keyCode: z.number().int('HID keycode to press (0-255)').min(0).max(255),
      duration: z.number().min(0, 'Duration must be non-negative').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'key_press';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const keyCodeValidation = validateRequiredParam('keyCode', params.keyCode);
      if (!keyCodeValidation.isValid) return keyCodeValidation.errorResponse!;

      const { simulatorUuid, keyCode, duration } = params;
      const commandArgs = ['key', String(keyCode)];
      if (duration !== undefined) {
        commandArgs.push('--duration', String(duration));
      }

      log('info', `${LOG_PREFIX}/${toolName}: Starting key press ${keyCode} on ${simulatorUuid}`);

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'key');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Key press (code: ${keyCode}) simulated successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to simulate key press (code: ${keyCode}): ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 7. button
  server.tool(
    'button',
    'Press a hardware button on the simulator. Available buttons: apple-pay, home, lock, side-button, siri.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      buttonType: z.enum(['apple-pay', 'home', 'lock', 'side-button', 'siri']),
      duration: z.number().min(0, 'Duration must be non-negative').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'button';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const buttonTypeValidation = validateRequiredParam('buttonType', params.buttonType);
      if (!buttonTypeValidation.isValid) return buttonTypeValidation.errorResponse!;

      const { simulatorUuid, buttonType, duration } = params;
      const commandArgs = ['button', buttonType];
      if (duration !== undefined) {
        commandArgs.push('--duration', String(duration));
      }

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting ${buttonType} button press on ${simulatorUuid}`,
      );

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'button');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Hardware button '${buttonType}' pressed successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to press button '${buttonType}': ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 8. key_sequence
  server.tool(
    'key_sequence',
    'Press a sequence of keys by their keycodes on the simulator. Each key will be pressed and released before the next key.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      keyCodes: z.array(z.number().int().min(0).max(255)).min(1, 'At least one keycode required'),
      delay: z.number().min(0, 'Delay must be non-negative').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'key_sequence';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const keyCodesValidation = validateRequiredParam('keyCodes', params.keyCodes);
      if (!keyCodesValidation.isValid) return keyCodesValidation.errorResponse!;

      const { simulatorUuid, keyCodes, delay } = params;
      const commandArgs = ['key-sequence', '--keycodes', keyCodes.join(',')];
      if (delay !== undefined) {
        commandArgs.push('--delay', String(delay));
      }

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting key sequence [${keyCodes.join(',')}] on ${simulatorUuid}`,
      );

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'key-sequence');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Key sequence [${keyCodes.join(',')}] executed successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to execute key sequence: ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 9. touch
  server.tool(
    'touch',
    "Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates (don't guess from screenshots).",
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      x: z.number().int('X coordinate must be an integer'),
      y: z.number().int('Y coordinate must be an integer'),
      down: z.boolean().optional(),
      up: z.boolean().optional(),
      delay: z.number().min(0, 'Delay must be non-negative').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'touch';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const xValidation = validateRequiredParam('x', params.x);
      if (!xValidation.isValid) return xValidation.errorResponse!;
      const yValidation = validateRequiredParam('y', params.y);
      if (!yValidation.isValid) return yValidation.errorResponse!;

      const { simulatorUuid, x, y, down, up, delay } = params;

      // Validate that at least one of down or up is specified
      if (!down && !up) {
        return createErrorResponse(
          'At least one of "down" or "up" must be true',
          undefined,
          'ValidationError',
        );
      }

      const commandArgs = ['touch', '-x', String(x), '-y', String(y)];
      if (down) {
        commandArgs.push('--down');
      }
      if (up) {
        commandArgs.push('--up');
      }
      if (delay !== undefined) {
        commandArgs.push('--delay', String(delay));
      }

      const actionText = down && up ? 'touch down+up' : down ? 'touch down' : 'touch up';
      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting ${actionText} at (${x}, ${y}) on ${simulatorUuid}`,
      );

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'touch');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);

        const warning = getCoordinateWarning(simulatorUuid);
        const message = `Touch event (${actionText}) at (${x}, ${y}) executed successfully.`;

        if (warning) {
          return createTextResponse(`${message}\n\n${warning}`);
        }

        return createTextResponse(message);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to execute touch event: ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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

  // 10. gesture
  server.tool(
    'gesture',
    'Perform preset gesture patterns on the simulator. Available presets: scroll-up, scroll-down, scroll-left, scroll-right, swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge.',
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
      preset: z.enum([
        'scroll-up',
        'scroll-down',
        'scroll-left',
        'scroll-right',
        'swipe-from-left-edge',
        'swipe-from-right-edge',
        'swipe-from-top-edge',
        'swipe-from-bottom-edge',
      ]),
      screenWidth: z.number().int().min(1).optional(),
      screenHeight: z.number().int().min(1).optional(),
      duration: z.number().min(0, 'Duration must be non-negative').optional(),
      delta: z.number().min(0, 'Delta must be non-negative').optional(),
      preDelay: z.number().min(0, 'Pre-delay must be non-negative').optional(),
      postDelay: z.number().min(0, 'Post-delay must be non-negative').optional(),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'gesture';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;
      const presetValidation = validateRequiredParam('preset', params.preset);
      if (!presetValidation.isValid) return presetValidation.errorResponse!;

      const {
        simulatorUuid,
        preset,
        screenWidth,
        screenHeight,
        duration,
        delta,
        preDelay,
        postDelay,
      } = params;
      const commandArgs = ['gesture', preset];

      if (screenWidth !== undefined) {
        commandArgs.push('--screen-width', String(screenWidth));
      }
      if (screenHeight !== undefined) {
        commandArgs.push('--screen-height', String(screenHeight));
      }
      if (duration !== undefined) {
        commandArgs.push('--duration', String(duration));
      }
      if (delta !== undefined) {
        commandArgs.push('--delta', String(delta));
      }
      if (preDelay !== undefined) {
        commandArgs.push('--pre-delay', String(preDelay));
      }
      if (postDelay !== undefined) {
        commandArgs.push('--post-delay', String(postDelay));
      }

      log('info', `${LOG_PREFIX}/${toolName}: Starting gesture '${preset}' on ${simulatorUuid}`);

      try {
        await executeAxeCommand(commandArgs, simulatorUuid, 'gesture');
        log('info', `${LOG_PREFIX}/${toolName}: Success for ${simulatorUuid}`);
        return createTextResponse(`Gesture '${preset}' executed successfully.`);
      } catch (error) {
        log('error', `${LOG_PREFIX}/${toolName}: Failed - ${error}`);
        if (error instanceof DependencyError) {
          return createAxeNotAvailableResponse();
        } else if (error instanceof AxeError) {
          return createErrorResponse(
            `Failed to execute gesture '${preset}': ${error.message}`,
            error.axeOutput,
            error.name,
          );
        } else if (error instanceof SystemError) {
          return createErrorResponse(
            `System error executing axe: ${error.message}`,
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
}
