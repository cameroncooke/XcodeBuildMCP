/**
 * Screenshot Tool - Capture screenshots from iOS Simulator
 *
 * This module provides a tool to capture screenshots from the iOS Simulator
 * using xcrun simctl commands. It does not depend on AXe.
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/logger.js';
import { validateRequiredParam } from '../../utils/validation.js';
import { SystemError, createErrorResponse } from '../../utils/errors.js';
import { executeCommand } from '../../utils/command.js';

const LOG_PREFIX = '[Screenshot]';

/**
 * Registers the screenshot tool with the dispatcher.
 * @param server The McpServer instance.
 */
export function registerScreenshotTool(server: McpServer): void {
  server.tool(
    'screenshot',
    "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
    {
      simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
    },
    async (params): Promise<ToolResponse> => {
      const toolName = 'screenshot';
      const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
      if (!simUuidValidation.isValid) return simUuidValidation.errorResponse!;

      const { simulatorUuid } = params;
      const tempDir = os.tmpdir();
      const screenshotFilename = `screenshot_${uuidv4()}.png`;
      const screenshotPath = path.join(tempDir, screenshotFilename);
      // Use xcrun simctl to take screenshot
      const commandArgs = ['xcrun', 'simctl', 'io', simulatorUuid, 'screenshot', screenshotPath];

      log(
        'info',
        `${LOG_PREFIX}/${toolName}: Starting capture to ${screenshotPath} on ${simulatorUuid}`,
      );

      try {
        // Execute the screenshot command
        const result = await executeCommand(commandArgs, `${LOG_PREFIX}: screenshot`, false);

        if (!result.success) {
          throw new SystemError(`Failed to capture screenshot: ${result.error || result.output}`);
        }

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
        if (_error instanceof SystemError) {
          return createErrorResponse(
            `System error executing screenshot: ${_error.message}`,
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
