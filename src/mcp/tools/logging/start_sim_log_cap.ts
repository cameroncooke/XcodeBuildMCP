/**
 * Logging Plugin: Start Simulator Log Capture
 *
 * Starts capturing logs from a specified simulator.
 */

import * as z from 'zod';
import { startLogCapture } from '../../../utils/log-capture/index.ts';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.ts';
import { ToolResponse, createTextContent } from '../../../types/common.ts';
import {
  createSessionAwareTool,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const startSimLogCapSchema = z.object({
  simulatorId: z
    .uuid()
    .describe('UUID of the simulator to capture logs from (obtained from list_simulators).'),
  bundleId: z.string().describe('Bundle identifier of the app to capture logs for.'),
  captureConsole: z
    .boolean()
    .optional()
    .describe('Whether to capture console output (requires app relaunch).'),
  subsystemFilter: z
    .union([z.enum(['app', 'all', 'swiftui']), z.array(z.string())])
    .optional()
    .describe(
      "Controls which log subsystems to capture. Options: 'app' (default, only app logs), 'all' (capture all system logs), 'swiftui' (app + SwiftUI logs for Self._printChanges()), or an array of custom subsystem strings.",
    ),
});

// Use z.infer for type safety
type StartSimLogCapParams = z.infer<typeof startSimLogCapSchema>;

export async function start_sim_log_capLogic(
  params: StartSimLogCapParams,
  _executor: CommandExecutor = getDefaultCommandExecutor(),
  logCaptureFunction: typeof startLogCapture = startLogCapture,
): Promise<ToolResponse> {
  const captureConsole = params.captureConsole ?? false;
  // Normalize subsystem filter with explicit type handling for the union type
  let subsystemFilter: SubsystemFilter = 'app';
  if (params.subsystemFilter !== undefined) {
    if (Array.isArray(params.subsystemFilter)) {
      subsystemFilter = params.subsystemFilter;
    } else if (
      params.subsystemFilter === 'app' ||
      params.subsystemFilter === 'all' ||
      params.subsystemFilter === 'swiftui'
    ) {
      subsystemFilter = params.subsystemFilter;
    }
  }
  const logCaptureParams: Parameters<typeof startLogCapture>[0] = {
    simulatorUuid: params.simulatorId,
    bundleId: params.bundleId,
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

  // Build subsystem filter description for the response
  let filterDescription: string;
  if (subsystemFilter === 'all') {
    filterDescription = 'Capturing all system logs (no subsystem filtering).';
  } else if (subsystemFilter === 'swiftui') {
    filterDescription = 'Capturing app logs + SwiftUI logs (includes Self._printChanges()).';
  } else if (Array.isArray(subsystemFilter)) {
    filterDescription = `Capturing logs from subsystems: ${subsystemFilter.join(', ')} (plus app bundle ID).`;
  } else {
    filterDescription = 'Only structured logs from the app subsystem are being captured.';
  }

  return {
    content: [
      createTextContent(
        `Log capture started successfully. Session ID: ${sessionId}.\n\n${captureConsole ? 'Note: Your app was relaunched to capture console output.\n' : ''}${filterDescription}\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
      ),
    ],
  };
}

const publicSchemaObject = z.strictObject(
  startSimLogCapSchema.omit({ simulatorId: true } as const).shape,
);

export default {
  name: 'start_sim_log_cap',
  description:
    "Starts capturing logs from a specified simulator. Returns a session ID. Use subsystemFilter to control what logs are captured: 'app' (default), 'all' (everything), 'swiftui' (includes Self._printChanges()), or custom subsystems.",
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: startSimLogCapSchema,
  }),
  annotations: {
    title: 'Start Simulator Log Capture',
    destructiveHint: true,
  },
  handler: createSessionAwareTool<StartSimLogCapParams>({
    internalSchema: startSimLogCapSchema as unknown as z.ZodType<StartSimLogCapParams, unknown>,
    logicFunction: start_sim_log_capLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [{ allOf: ['simulatorId'], message: 'simulatorId is required' }],
  }),
};
