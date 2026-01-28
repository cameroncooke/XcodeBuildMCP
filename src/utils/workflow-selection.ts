import type { WorkflowGroup } from '../core/plugin-types.ts';
import { getConfig } from './config-store.ts';

export const REQUIRED_WORKFLOW = 'session-management';
export const WORKFLOW_DISCOVERY_WORKFLOW = 'workflow-discovery';
export const DEBUG_WORKFLOW = 'doctor';
export const DEFAULT_WORKFLOW = 'simulator';

type WorkflowName = string;

function normalizeWorkflowNames(workflowNames: WorkflowName[]): WorkflowName[] {
  return workflowNames.map((name) => name.trim().toLowerCase()).filter(Boolean);
}

function isWorkflowGroup(value: WorkflowGroup | undefined): value is WorkflowGroup {
  return Boolean(value);
}

export function isDebugEnabled(): boolean {
  return getConfig().debug;
}

export function isWorkflowDiscoveryEnabled(): boolean {
  return getConfig().experimentalWorkflowDiscovery;
}

/**
 * Resolve selected workflow names to only include workflows that
 * match real workflows, ensuring the mandatory workflows are always included.
 *
 * @param workflowNames - The list of selected workflow names
 * @returns The list of workflows to register.
 */
export function resolveSelectedWorkflowNames(
  workflowNames: WorkflowName[] = [],
  availableWorkflowNames: WorkflowName[] = [],
): {
  selectedWorkflowNames: WorkflowName[];
  selectedNames: WorkflowName[];
} {
  const normalizedNames = normalizeWorkflowNames(workflowNames);
  const baseAutoSelected = [REQUIRED_WORKFLOW];

  if (isWorkflowDiscoveryEnabled()) {
    baseAutoSelected.push(WORKFLOW_DISCOVERY_WORKFLOW);
  }

  if (isDebugEnabled()) {
    baseAutoSelected.push(DEBUG_WORKFLOW);
  }

  // When no workflows specified, default to simulator workflow
  const effectiveNames = normalizedNames.length > 0 ? normalizedNames : [DEFAULT_WORKFLOW];
  const selectedNames = [...new Set([...baseAutoSelected, ...effectiveNames])];

  // Filter selected names to only include workflows that match real workflows.
  const selectedWorkflowNames = selectedNames.filter((workflowName) =>
    availableWorkflowNames.includes(workflowName),
  );

  return { selectedWorkflowNames, selectedNames };
}

/**
 * Resolve selected workflow groups to only include workflow groups that
 * match real workflow groups, ensuring the mandatory workflow groups are always included.
 *
 * @param workflowNames - The list of selected workflow names
 * @param workflowGroups - The map of workflow groups
 * @returns The list of workflow groups to register.
 */
export function resolveSelectedWorkflows(
  workflowNames: WorkflowName[] = [],
  workflowGroupsParam?: Map<WorkflowName, WorkflowGroup>,
): {
  selectedWorkflows: WorkflowGroup[];
  selectedNames: WorkflowName[];
} {
  const resolvedWorkflowGroups = workflowGroupsParam ?? new Map<WorkflowName, WorkflowGroup>();
  const availableWorkflowNames = [...resolvedWorkflowGroups.keys()];
  const selection = resolveSelectedWorkflowNames(workflowNames, availableWorkflowNames);

  const selectedWorkflows = selection.selectedWorkflowNames
    .map((workflowName) => resolvedWorkflowGroups.get(workflowName))
    .filter(isWorkflowGroup);

  return { selectedWorkflows, selectedNames: selection.selectedNames };
}

export function collectToolNames(workflows: WorkflowGroup[]): string[] {
  const toolNames = new Set<string>();

  for (const workflow of workflows) {
    for (const tool of workflow.tools) {
      if (tool?.name) {
        toolNames.add(tool.name);
      }
    }
  }

  return [...toolNames];
}
