/**
 * Screenshot tool plugin - Capture screenshots from iOS Simulator
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../../src/utils/logger.js';
import { validateRequiredParam } from '../../src/utils/validation.js';
import { SystemError, createErrorResponse } from '../../src/utils/errors.js';
import { executeCommand } from '../../src/utils/command.js';

const LOG_PREFIX = '[Screenshot]';

export default {
  name: 'screenshot',
  description: "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
  schema: {
    simulatorUuid: z.string().uuid('Invalid Simulator UUID format'),
  },
  async handler(params) {
    const simUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simUuidValidation.isValid) return simUuidValidation.errorResponse;

    const { simulatorUuid } = params;
    const tempDir = os.tmpdir();
    const screenshotFilename = `screenshot_${uuidv4()}.png`;
    const screenshotPath = path.join(tempDir, screenshotFilename);
    // Use xcrun simctl to take screenshot
    const commandArgs = ['xcrun', 'simctl', 'io', simulatorUuid, 'screenshot', screenshotPath];

    log(
      'info',
      `${LOG_PREFIX}/screenshot: Starting capture to ${screenshotPath} on ${simulatorUuid}`,
    );

    try {
      // Execute the screenshot command
      const result = await executeCommand(commandArgs, `${LOG_PREFIX}: screenshot`, false);

      if (!result.success) {
        throw new SystemError(`Failed to capture screenshot: ${result.error || result.output}`);
      }

      log('info', `${LOG_PREFIX}/screenshot: Success for ${simulatorUuid}`);

      try {
        // Read the image file into memory
        const imageBuffer = await fs.readFile(screenshotPath);

        // Encode the image as a Base64 string
        const base64Image = imageBuffer.toString('base64');

        log('info', `${LOG_PREFIX}/screenshot: Successfully encoded image as Base64`);

        // Clean up the temporary file
        await fs.unlink(screenshotPath).catch((err) => {
          log(
            'warning',
            `${LOG_PREFIX}/screenshot: Failed to delete temporary file: ${err}`,
          );
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
        log(
          'error',
          `${LOG_PREFIX}/screenshot: Failed to process image file: ${fileError}`,
        );
        return createErrorResponse(
          `Screenshot captured but failed to process image file: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
          undefined,
          'FileProcessingError',
        );
      }
    } catch (_error) {
      log('error', `${LOG_PREFIX}/screenshot: Failed - ${_error}`);
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
};