import * as z from 'zod';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor, type CommandExecutor } from '../../../utils/execution/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import type { ToolResponse } from '../../../types/common.ts';
import { applyWorkflowSelection, getRegisteredWorkflows } from '../../../utils/tool-registry.ts';
import { listWorkflowDirectoryNames } from '../../../core/plugin-registry.ts';

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
  const nextWorkflows =
    params.enable === false
      ? currentWorkflows.filter((name) => !requestedSet.has(name.toLowerCase()))
      : [...new Set([...currentWorkflows, ...workflowNames])];
  const registryState = await applyWorkflowSelection(nextWorkflows);

  return createTextResponse(`Workflows enabled: ${registryState.enabledWorkflows.join(', ')}`);
}

const workflowNames = listWorkflowDirectoryNames();
const availableWorkflows =
  workflowNames.length > 0 ? workflowNames.join(', ') : 'none (no workflows discovered)';

export default {
  name: 'manage-workflows',
  description: `Workflows are groups of tools exposed by XcodeBuildMCP.
By default, not all workflows (and therefore tools) are enabled; only simulator tools are enabled by default.
Some workflows are mandatory and can't be disabled.
Available workflows: ${availableWorkflows}`,
  schema: baseSchemaObject.shape,
  handler: createTypedTool(manageWorkflowsSchema, manage_workflowsLogic, getDefaultCommandExecutor),
};
