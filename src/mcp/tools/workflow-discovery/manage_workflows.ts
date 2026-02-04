import * as z from 'zod';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor, type CommandExecutor } from '../../../utils/execution/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import type { ToolResponse } from '../../../types/common.ts';
import {
  applyWorkflowSelectionFromManifest,
  getRegisteredWorkflows,
  getMcpPredicateContext,
} from '../../../utils/tool-registry.ts';
import { loadManifest } from '../../../core/manifest/load-manifest.ts';

const baseSchemaObject = z.object({
  workflowNames: z.array(z.string()).describe('Workflow directory name(s).'),
  enable: z.boolean().describe('Enable or disable the selected workflows.'),
});

const manageWorkflowsSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

export type ManageWorkflowsParams = z.infer<typeof manageWorkflowsSchema>;

export async function manage_workflowsLogic(
  params: ManageWorkflowsParams,
  _neverExecutor: CommandExecutor,
): Promise<ToolResponse> {
  const workflowNames = params.workflowNames;
  const currentWorkflows = getRegisteredWorkflows();
  const requestedSet = new Set(
    workflowNames.map((name) => name.trim().toLowerCase()).filter(Boolean),
  );
  let nextWorkflows: string[];
  if (params.enable === false) {
    nextWorkflows = currentWorkflows.filter((name) => !requestedSet.has(name.toLowerCase()));
  } else {
    nextWorkflows = [...new Set([...currentWorkflows, ...workflowNames])];
  }

  // Use the stored MCP predicate context to preserve Xcode detection state
  const ctx = getMcpPredicateContext();

  const registryState = await applyWorkflowSelectionFromManifest(nextWorkflows, ctx);

  return createTextResponse(`Workflows enabled: ${registryState.enabledWorkflows.join(', ')}`);
}

const manifest = loadManifest();
const allWorkflowIds = Array.from(manifest.workflows.keys());
const availableWorkflows =
  allWorkflowIds.length > 0 ? allWorkflowIds.join(', ') : 'none (no workflows discovered)';

export default {
  name: 'manage-workflows',
  description: `Workflows are groups of tools exposed by XcodeBuildMCP.
By default, not all workflows (and therefore tools) are enabled; only simulator tools are enabled by default.
Some workflows are mandatory and can't be disabled.
Available workflows: ${availableWorkflows}`,
  schema: baseSchemaObject.shape,
  handler: createTypedTool(manageWorkflowsSchema, manage_workflowsLogic, getDefaultCommandExecutor),
};
