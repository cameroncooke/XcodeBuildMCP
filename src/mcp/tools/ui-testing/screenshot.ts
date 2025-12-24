/**
 * Screenshot tool plugin - Capture screenshots from iOS Simulator
 */
import * as path from 'path';
import { tmpdir } from 'os';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ToolResponse, createImageContent } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { createErrorResponse, SystemError } from '../../../utils/responses/index.ts';
import type { CommandExecutor, FileSystemExecutor } from '../../../utils/execution/index.ts';
import {
  getDefaultFileSystemExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/execution/index.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

const LOG_PREFIX = '[Screenshot]';

// Define schema as ZodObject
const screenshotSchema = z.object({
  simulatorId: z.string().uuid('Invalid Simulator UUID format'),
});

// Use z.infer for type safety
type ScreenshotParams = z.infer<typeof screenshotSchema>;

const publicSchemaObject = screenshotSchema.omit({ simulatorId: true } as const).strict();

export async function screenshotLogic(
  params: ScreenshotParams,
  executor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
  pathUtils: { tmpdir: () => string; join: (...paths: string[]) => string } = { ...path, tmpdir },
  uuidUtils: { v4: () => string } = { v4: uuidv4 },
): Promise<ToolResponse> {
  const { simulatorId } = params;
  const tempDir = pathUtils.tmpdir();
  const screenshotFilename = `screenshot_${uuidUtils.v4()}.png`;
  const screenshotPath = pathUtils.join(tempDir, screenshotFilename);
  const optimizedFilename = `screenshot_optimized_${uuidUtils.v4()}.jpg`;
  const optimizedPath = pathUtils.join(tempDir, optimizedFilename);
  // Use xcrun simctl to take screenshot
  const commandArgs: string[] = [
    'xcrun',
    'simctl',
    'io',
    simulatorId,
    'screenshot',
    screenshotPath,
  ];

  log('info', `${LOG_PREFIX}/screenshot: Starting capture to ${screenshotPath} on ${simulatorId}`);

  try {
    // Execute the screenshot command
    const result = await executor(commandArgs, `${LOG_PREFIX}: screenshot`, false);

    if (!result.success) {
      throw new SystemError(`Failed to capture screenshot: ${result.error ?? result.output}`);
    }

    log('info', `${LOG_PREFIX}/screenshot: Success for ${simulatorId}`);

    try {
      // Optimize the image for LLM consumption: resize to max 800px width and convert to JPEG
      const optimizeArgs = [
        'sips',
        '-Z',
        '800', // Resize to max 800px (maintains aspect ratio)
        '-s',
        'format',
        'jpeg', // Convert to JPEG
        '-s',
        'formatOptions',
        '75', // 75% quality compression
        screenshotPath,
        '--out',
        optimizedPath,
      ];

      const optimizeResult = await executor(optimizeArgs, `${LOG_PREFIX}: optimize image`, false);

      if (!optimizeResult.success) {
        log('warning', `${LOG_PREFIX}/screenshot: Image optimization failed, using original PNG`);
        // Fallback to original PNG if optimization fails
        const base64Image = await fileSystemExecutor.readFile(screenshotPath, 'base64');

        // Clean up
        try {
          await fileSystemExecutor.rm(screenshotPath);
        } catch (err) {
          log('warning', `${LOG_PREFIX}/screenshot: Failed to delete temp file: ${err}`);
        }

        return {
          content: [createImageContent(base64Image, 'image/png')],
          isError: false,
        };
      }

      log('info', `${LOG_PREFIX}/screenshot: Image optimized successfully`);

      // Read the optimized image file as base64
      const base64Image = await fileSystemExecutor.readFile(optimizedPath, 'base64');

      log('info', `${LOG_PREFIX}/screenshot: Successfully encoded image as Base64`);

      // Clean up both temporary files
      try {
        await fileSystemExecutor.rm(screenshotPath);
        await fileSystemExecutor.rm(optimizedPath);
      } catch (err) {
        log('warning', `${LOG_PREFIX}/screenshot: Failed to delete temporary files: ${err}`);
      }

      // Return the optimized image (JPEG format, smaller size)
      return {
        content: [createImageContent(base64Image, 'image/jpeg')],
        isError: false,
      };
    } catch (fileError) {
      log('error', `${LOG_PREFIX}/screenshot: Failed to process image file: ${fileError}`);
      return createErrorResponse(
        `Screenshot captured but failed to process image file: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
      );
    }
  } catch (_error) {
    log('error', `${LOG_PREFIX}/screenshot: Failed - ${_error}`);
    if (_error instanceof SystemError) {
      return createErrorResponse(
        `System error executing screenshot: ${_error.message}`,
        _error.originalError?.stack,
      );
    }
    return createErrorResponse(
      `An unexpected error occurred: ${_error instanceof Error ? _error.message : String(_error)}`,
    );
  }
}

export default {
  name: 'screenshot',
  description:
    "Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).",
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: screenshotSchema,
  }),
  annotations: {
    title: 'Screenshot',
    readOnlyHint: true,
  },
  handler: createSessionAwareTool<ScreenshotParams>({
    internalSchema: screenshotSchema as unknown as z.ZodType<ScreenshotParams>,
    logicFunction: (params: ScreenshotParams, executor: CommandExecutor) => {
      return screenshotLogic(params, executor);
    },
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
