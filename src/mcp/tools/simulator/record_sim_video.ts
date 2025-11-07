import { z } from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import {
  getDefaultCommandExecutor,
  getDefaultFileSystemExecutor,
} from '../../../utils/execution/index.ts';
import type { CommandExecutor, FileSystemExecutor } from '../../../utils/execution/index.ts';
import {
  areAxeToolsAvailable,
  isAxeAtLeastVersion,
  createAxeNotAvailableResponse,
} from '../../../utils/axe/index.ts';
import {
  startSimulatorVideoCapture,
  stopSimulatorVideoCapture,
} from '../../../utils/video-capture/index.ts';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
import { dirname } from 'path';

// Base schema object (used for MCP schema exposure)
const recordSimVideoSchemaObject = z.object({
  simulatorId: z
    .string()
    .uuid('Invalid Simulator UUID format')
    .describe('UUID of the simulator to record'),
  start: z.boolean().optional().describe('Start recording if true'),
  stop: z.boolean().optional().describe('Stop recording if true'),
  fps: z.number().int().min(1).max(120).optional().describe('Frames per second (default 30)'),
  outputFile: z
    .string()
    .optional()
    .describe('Destination MP4 path to move the recorded video to on stop'),
});

// Schema enforcing mutually exclusive start/stop and requiring outputFile on stop
const recordSimVideoSchema = recordSimVideoSchemaObject
  .refine(
    (v) => {
      const s = v.start === true ? 1 : 0;
      const t = v.stop === true ? 1 : 0;
      return s + t === 1;
    },
    {
      message:
        'Provide exactly one of start=true or stop=true; these options are mutually exclusive',
      path: ['start'],
    },
  )
  .refine((v) => (v.stop ? typeof v.outputFile === 'string' && v.outputFile.length > 0 : true), {
    message: 'outputFile is required when stop=true',
    path: ['outputFile'],
  });

type RecordSimVideoParams = z.infer<typeof recordSimVideoSchema>;

export async function record_sim_videoLogic(
  params: RecordSimVideoParams,
  executor: CommandExecutor,
  axe: {
    areAxeToolsAvailable(): boolean;
    isAxeAtLeastVersion(v: string, e: CommandExecutor): Promise<boolean>;
    createAxeNotAvailableResponse(): ToolResponse;
  } = {
    areAxeToolsAvailable,
    isAxeAtLeastVersion,
    createAxeNotAvailableResponse,
  },
  video: {
    startSimulatorVideoCapture: typeof startSimulatorVideoCapture;
    stopSimulatorVideoCapture: typeof stopSimulatorVideoCapture;
  } = {
    startSimulatorVideoCapture,
    stopSimulatorVideoCapture,
  },
  fs: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<ToolResponse> {
  // Preflight checks for AXe availability and version
  if (!axe.areAxeToolsAvailable()) {
    return axe.createAxeNotAvailableResponse();
  }
  const hasVersion = await axe.isAxeAtLeastVersion('1.1.0', executor);
  if (!hasVersion) {
    return createTextResponse(
      'AXe v1.1.0 or newer is required for simulator video capture. Please update bundled AXe artifacts.',
      true,
    );
  }

  // using injected fs executor

  if (params.start) {
    const fpsUsed = Number.isFinite(params.fps as number) ? Number(params.fps) : 30;
    const startRes = await video.startSimulatorVideoCapture(
      { simulatorUuid: params.simulatorId, fps: fpsUsed },
      executor,
    );

    if (!startRes.started) {
      return createTextResponse(
        `Failed to start video recording: ${startRes.error ?? 'Unknown error'}`,
        true,
      );
    }

    const notes: string[] = [];
    if (typeof params.outputFile === 'string' && params.outputFile.length > 0) {
      notes.push(
        'Note: outputFile is ignored when start=true; provide it when stopping to move/rename the recorded file.',
      );
    }
    if (startRes.warning) {
      notes.push(startRes.warning);
    }

    const nextSteps = `Next Steps:
Stop and save the recording:
record_sim_video({ simulatorId: "${params.simulatorId}", stop: true, outputFile: "/path/to/output.mp4" })`;

    return {
      content: [
        {
          type: 'text',
          text: `🎥 Video recording started for simulator ${params.simulatorId} at ${fpsUsed} fps.\nSession: ${startRes.sessionId}`,
        },
        ...(notes.length > 0
          ? [
              {
                type: 'text' as const,
                text: notes.join('\n'),
              },
            ]
          : []),
        {
          type: 'text',
          text: nextSteps,
        },
      ],
      isError: false,
    };
  }

  // params.stop must be true here per schema
  const stopRes = await video.stopSimulatorVideoCapture(
    { simulatorUuid: params.simulatorId },
    executor,
  );

  if (!stopRes.stopped) {
    return createTextResponse(
      `Failed to stop video recording: ${stopRes.error ?? 'Unknown error'}`,
      true,
    );
  }

  // Attempt to move/rename the recording if we parsed a source path and an outputFile was given
  const outputs: string[] = [];
  let finalSavedPath = params.outputFile ?? stopRes.parsedPath ?? '';
  try {
    if (params.outputFile) {
      if (!stopRes.parsedPath) {
        return createTextResponse(
          `Recording stopped but could not determine the recorded file path from AXe output.\nRaw output:\n${stopRes.stdout ?? '(no output captured)'}`,
          true,
        );
      }

      const src = stopRes.parsedPath;
      const dest = params.outputFile;
      await fs.mkdir(dirname(dest), { recursive: true });
      await fs.cp(src, dest);
      try {
        await fs.rm(src, { recursive: false });
      } catch {
        // Ignore cleanup failure
      }
      finalSavedPath = dest;

      outputs.push(`Original file: ${src}`);
      outputs.push(`Saved to: ${dest}`);
    } else if (stopRes.parsedPath) {
      outputs.push(`Saved to: ${stopRes.parsedPath}`);
      finalSavedPath = stopRes.parsedPath;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return createTextResponse(
      `Recording stopped but failed to save/move the video file: ${msg}`,
      true,
    );
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Video recording stopped for simulator ${params.simulatorId}.`,
      },
      ...(outputs.length > 0
        ? [
            {
              type: 'text' as const,
              text: outputs.join('\n'),
            },
          ]
        : []),
      ...(!outputs.length && stopRes.stdout
        ? [
            {
              type: 'text' as const,
              text: `AXe output:\n${stopRes.stdout}`,
            },
          ]
        : []),
    ],
    isError: false,
    _meta: finalSavedPath ? { outputFile: finalSavedPath } : undefined,
  };
}

const publicSchemaObject = recordSimVideoSchemaObject.omit({ simulatorId: true } as const).strict();

export default {
  name: 'record_sim_video',
  description: 'Starts or stops video capture for an iOS simulator.',
  schema: publicSchemaObject.shape,
  handler: createSessionAwareTool<RecordSimVideoParams>({
    internalSchema: recordSimVideoSchema as unknown as z.ZodType<RecordSimVideoParams>,
    logicFunction: record_sim_videoLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
