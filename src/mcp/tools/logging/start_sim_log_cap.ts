/**
 * Logging Plugin: Start Simulator Log Capture
 *
 * Starts capturing logs from a specified simulator.
 */

import * as z from 'zod';
import { startLogCapture } from '../../../utils/log-capture/index.ts';
import type { CommandExecutor } from '../../../utils/command.ts';
import { getDefaultCommandExecutor } from '../../../utils/command.ts';
import type { ToolResponse } from '../../../types/common.ts';
import { createTextContent } from '../../../types/common.ts';
import type { SubsystemFilter } from '../../../utils/log_capture.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const startSimLogCapSchema = z.object({
  simulatorId: z
    .uuid()
    .describe('UUID of the simulator to capture logs from (obtained from list_simulators).'),
  bundleId: z.string(),
  captureConsole: z.boolean().optional(),
  subsystemFilter: z
    .union([z.enum(['app', 'all', 'swiftui']), z.array(z.string()).min(1)])
    .default('app')
    .describe('app|all|swiftui|[subsystem]'),
});

// Use z.infer for type safety
type StartSimLogCapParams = z.infer<typeof startSimLogCapSchema>;

function buildSubsystemFilterDescription(subsystemFilter: SubsystemFilter): string {
  if (subsystemFilter === 'all') {
    return 'Capturing all system logs (no subsystem filtering).';
  }
  if (subsystemFilter === 'swiftui') {
    return 'Capturing app logs + SwiftUI logs (includes Self._printChanges()).';
  }
  if (Array.isArray(subsystemFilter)) {
    if (subsystemFilter.length === 0) {
      return 'Only structured logs from the app subsystem are being captured.';
    }
    return `Capturing logs from subsystems: ${subsystemFilter.join(', ')} (plus app bundle ID).`;
  }

  return 'Only structured logs from the app subsystem are being captured.';
}

export async function start_sim_log_capLogic(
  params: StartSimLogCapParams,
  _executor: CommandExecutor = getDefaultCommandExecutor(),
  logCaptureFunction: typeof startLogCapture = startLogCapture,
): Promise<ToolResponse> {
  const { bundleId, simulatorId, subsystemFilter } = params;
  const captureConsole = params.captureConsole ?? false;
  const logCaptureParams: Parameters<typeof startLogCapture>[0] = {
    simulatorUuid: simulatorId,
    bundleId,
    captureConsole,
    subsystemFilter,
  };
  const { sessionId, error } = await logCaptureFunction(logCaptureParams, _executor);
  if (error) {
    return {
      content: [createTextContent(`Error starting log capture: ${error}`)],
      isError: true,
    };
  }

  const filterDescription = buildSubsystemFilterDescription(subsystemFilter);

  return {
    content: [
      createTextContent(
        `Log capture started successfully. Session ID: ${sessionId}.\n\n${captureConsole ? 'Note: Your app was relaunched to capture console output.\n' : ''}${filterDescription}\n\nInteract with your simulator and app, then stop capture to retrieve logs.`,
      ),
    ],
    nextStepParams: {
      stop_sim_log_cap: { logSessionId: sessionId },
    },
  };
}

const publicSchemaObject = z.strictObject(
  startSimLogCapSchema.omit({ simulatorId: true, bundleId: true } as const).shape,
);

export const schema = getSessionAwareToolSchemaShape({
  sessionAware: publicSchemaObject,
  legacy: startSimLogCapSchema,
});

export const handler = createSessionAwareTool<StartSimLogCapParams>({
  internalSchema: startSimLogCapSchema as unknown as z.ZodType<StartSimLogCapParams, unknown>,
  logicFunction: start_sim_log_capLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { allOf: ['simulatorId', 'bundleId'], message: 'Provide simulatorId and bundleId' },
  ],
});
