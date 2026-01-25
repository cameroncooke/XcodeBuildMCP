import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { resolveSelectedWorkflows } from '../workflow-selection.ts';
import type { WorkflowGroup } from '../../core/plugin-types.ts';

function makeWorkflow(name: string): WorkflowGroup {
  return {
    directoryName: name,
    workflow: {
      name,
      description: `${name} workflow`,
    },
    tools: [
      {
        name: `${name}-tool`,
        description: `${name} tool`,
        schema: { enabled: z.boolean().optional() },
        async handler() {
          return { content: [] };
        },
      },
    ],
  };
}

function makeWorkflowMap(names: string[]): Map<string, WorkflowGroup> {
  const map = new Map<string, WorkflowGroup>();
  for (const name of names) {
    map.set(name, makeWorkflow(name));
  }
  return map;
}

describe('resolveSelectedWorkflows', () => {
  let originalDebug: string | undefined;
  let originalWorkflowDiscovery: string | undefined;

  beforeEach(() => {
    originalDebug = process.env.XCODEBUILDMCP_DEBUG;
    originalWorkflowDiscovery = process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY;
  });

  afterEach(() => {
    if (typeof originalDebug === 'undefined') {
      delete process.env.XCODEBUILDMCP_DEBUG;
    } else {
      process.env.XCODEBUILDMCP_DEBUG = originalDebug;
    }
    if (typeof originalWorkflowDiscovery === 'undefined') {
      delete process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY;
    } else {
      process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY = originalWorkflowDiscovery;
    }
  });

  it('adds doctor when debug is enabled and selection list is provided', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'true';
    process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY = 'true';
    const workflows = makeWorkflowMap([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);

    const result = resolveSelectedWorkflows(['simulator'], workflows);

    expect(result.selectedNames).toEqual([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);
  });

  it('does not add doctor when debug is disabled', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'false';
    process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY = 'true';
    const workflows = makeWorkflowMap([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);

    const result = resolveSelectedWorkflows(['simulator'], workflows);

    expect(result.selectedNames).toEqual(['session-management', 'workflow-discovery', 'simulator']);
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'workflow-discovery',
      'simulator',
    ]);
  });

  it('returns all workflows when no selection list is provided', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'true';
    process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY = 'true';
    const workflows = makeWorkflowMap([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);

    const result = resolveSelectedWorkflows([], workflows);

    expect(result.selectedNames).toBeNull();
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);
  });

  it('excludes workflow-discovery when experimental flag is disabled', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'false';
    process.env.XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY = 'false';
    const workflows = makeWorkflowMap(['session-management', 'workflow-discovery', 'simulator']);

    const result = resolveSelectedWorkflows([], workflows);

    expect(result.selectedNames).toBeNull();
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'simulator',
    ]);
  });
});
