import { z } from 'zod';
import { log } from '../../build/utils.js';
import { createTextResponse, validateRequiredParam } from '../../build/utils.js';
import { DependencyError, AxeError, SystemError, createErrorResponse } from '../../build/utils.js';
import { executeCommand } from '../../build/utils.js';
import {
  createAxeNotAvailableResponse,
  getAxePath,
  getBundledAxeEnvironment,
} from '../../build/utils.js';

const LOG_PREFIX = '[AXe]';

// Internal state for describe_ui tracking
const describeUITimestamps = new Map();
const DESCRIBE_UI_WARNING_TIMEOUT = 60000; // 60 seconds

function recordDescribeUICall(simulatorUuid) {
  describeUITimestamps.set(simulatorUuid, {
    timestamp: Date.now(),
    simulatorUuid,
  });
}

async function executeAxeCommand(commandArgs, simulatorUuid, commandName) {
  // Get the appropriate axe binary path
  const axeBinary = getAxePath();
  if (!axeBinary) {
    throw new DependencyError('AXe binary not found');
  }

  // Add --udid parameter to all commands
  const fullArgs = [...commandArgs, '--udid', simulatorUuid];

  // Construct the full command array with the axe binary as the first element
  const fullCommand = [axeBinary, ...fullArgs];

  try {
    // Determine environment variables for bundled AXe
    const axeEnv = axeBinary !== 'axe' ? getBundledAxeEnvironment() : undefined;

    const result = await executeCommand(
      fullCommand,
      `${LOG_PREFIX}: ${commandName}`,
      false,
      axeEnv,
    );

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

export default {
  name: 'describe_ui',
  description: 'Gets entire view hierarchy with precise frame coordinates (x, y, width, height) for all visible elements. Use this before UI interactions or after layout changes - do NOT guess coordinates from screenshots. Returns JSON tree with frame data for accurate automation.',
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
  },
  async handler(params) {
    const toolName = 'describe_ui';
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;

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
              'Accessibility hierarchy retrieved successfully:\n```json\n' + responseText + '\n```',
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
};