import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { determineSimulatorUuid } from '../../../utils/simulator-utils.ts';
import {
  createSessionAwareToolWithContext,
  getSessionAwareToolSchemaShape,
} from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  resolveSimulatorAppPid,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const baseSchemaObject = z.object({
  simulatorId: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator to use (obtained from list_sims). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both",
    ),
  bundleId: z
    .string()
    .optional()
    .describe("Bundle identifier of the app to attach (e.g., 'com.example.MyApp')"),
  pid: z.number().int().positive().optional().describe('Process ID to attach directly'),
  waitFor: z.boolean().optional().describe('Wait for the process to appear when attaching'),
  makeCurrent: z
    .boolean()
    .optional()
    .default(true)
    .describe('Set this debug session as the current session (default: true)'),
});

const debugAttachSchema = z.preprocess(
  nullifyEmptyStrings,
  baseSchemaObject
    .refine((val) => val.simulatorId !== undefined || val.simulatorName !== undefined, {
      message: 'Either simulatorId or simulatorName is required.',
    })
    .refine((val) => !(val.simulatorId && val.simulatorName), {
      message: 'simulatorId and simulatorName are mutually exclusive. Provide only one.',
    })
    .refine((val) => val.bundleId !== undefined || val.pid !== undefined, {
      message: 'Provide either bundleId or pid to attach.',
    })
    .refine((val) => !(val.bundleId && val.pid), {
      message: 'bundleId and pid are mutually exclusive. Provide only one.',
    }),
);

export type DebugAttachSimParams = z.infer<typeof debugAttachSchema>;

export async function debug_attach_simLogic(
  params: DebugAttachSimParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  const { executor, debugger: debuggerManager } = ctx;

  const simResult = await determineSimulatorUuid(
    { simulatorId: params.simulatorId, simulatorName: params.simulatorName },
    executor,
  );

  if (simResult.error) {
    return simResult.error;
  }

  const simulatorId = simResult.uuid;
  if (!simulatorId) {
    return createErrorResponse('Simulator resolution failed', 'Unable to determine simulator UUID');
  }

  let pid = params.pid;
  if (!pid && params.bundleId) {
    try {
      pid = await resolveSimulatorAppPid({
        executor,
        simulatorId,
        bundleId: params.bundleId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Failed to resolve simulator PID', message);
    }
  }

  if (!pid) {
    return createErrorResponse('Missing PID', 'Unable to resolve process ID to attach');
  }

  try {
    const session = await debuggerManager.createSession({
      simulatorId,
      pid,
      waitFor: params.waitFor,
    });

    const isCurrent = params.makeCurrent ?? true;
    if (isCurrent) {
      debuggerManager.setCurrentSession(session.id);
    }

    const warningText = simResult.warning ? `⚠️ ${simResult.warning}\n\n` : '';
    const currentText = isCurrent
      ? 'This session is now the current debug session.'
      : 'This session is not set as the current session.';

    const backendLabel = session.backend === 'dap' ? 'DAP debugger' : 'LLDB';

    return createTextResponse(
      `${warningText}✅ Attached ${backendLabel} to simulator process ${pid} (${simulatorId}).\n\n` +
        `Debug session ID: ${session.id}\n` +
        `${currentText}\n\n` +
        `Next steps:\n` +
        `1. debug_breakpoint_add({ debugSessionId: "${session.id}", file: "...", line: 123 })\n` +
        `2. debug_lldb_command({ debugSessionId: "${session.id}", command: "continue" })\n` +
        `3. debug_stack({ debugSessionId: "${session.id}" })`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Failed to attach LLDB: ${message}`);
    return createErrorResponse('Failed to attach debugger', message);
  }
}

const publicSchemaObject = z.strictObject(
  baseSchemaObject.omit({
    simulatorId: true,
    simulatorName: true,
  }).shape,
);

export default {
  name: 'debug_attach_sim',
  description:
    'Attach LLDB to a running iOS simulator app. Provide bundleId or pid, plus simulator defaults.',
  schema: getSessionAwareToolSchemaShape({
    sessionAware: publicSchemaObject,
    legacy: baseSchemaObject,
  }),
  handler: createSessionAwareToolWithContext<DebugAttachSimParams, DebuggerToolContext>({
    internalSchema: debugAttachSchema as unknown as z.ZodType<DebugAttachSimParams, unknown>,
    logicFunction: debug_attach_simLogic,
    getContext: getDefaultDebuggerToolContext,
    requirements: [
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    ],
    exclusivePairs: [['simulatorId', 'simulatorName']],
  }),
};
