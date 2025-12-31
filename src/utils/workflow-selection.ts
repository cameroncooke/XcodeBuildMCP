import type { WorkflowGroup } from '../core/plugin-types.ts';

const REQUIRED_WORKFLOW = 'session-management';
const DEBUG_WORKFLOW = 'doctor';

function normalizeWorkflowNames(workflowNames: string[]): string[] {
  return workflowNames.map((name) => name.trim().toLowerCase()).filter(Boolean);
}

function isWorkflowGroup(value: WorkflowGroup | undefined): value is WorkflowGroup {
  return Boolean(value);
}

function isDebugEnabled(): boolean {
  const value = process.env.XCODEBUILDMCP_DEBUG ?? '';
  return value.toLowerCase() === 'true' || value === '1';
}

export function resolveSelectedWorkflows(
  workflowGroups: Map<string, WorkflowGroup>,
  workflowNames: string[] = [],
): {
  selectedWorkflows: WorkflowGroup[];
  selectedNames: string[] | null;
} {
  const normalizedNames = normalizeWorkflowNames(workflowNames);
  const autoSelected = isDebugEnabled() ? [REQUIRED_WORKFLOW, DEBUG_WORKFLOW] : [REQUIRED_WORKFLOW];
  const selectedNames =
    normalizedNames.length > 0 ? [...new Set([...autoSelected, ...normalizedNames])] : null;

  const selectedWorkflows = selectedNames
    ? selectedNames.map((workflowName) => workflowGroups.get(workflowName)).filter(isWorkflowGroup)
    : [...workflowGroups.values()];

  return { selectedWorkflows, selectedNames };
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
