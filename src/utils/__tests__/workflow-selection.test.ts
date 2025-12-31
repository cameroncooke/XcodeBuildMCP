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

  beforeEach(() => {
    originalDebug = process.env.XCODEBUILDMCP_DEBUG;
  });

  afterEach(() => {
    if (typeof originalDebug === 'undefined') {
      delete process.env.XCODEBUILDMCP_DEBUG;
    } else {
      process.env.XCODEBUILDMCP_DEBUG = originalDebug;
    }
  });

  it('adds doctor when debug is enabled and selection list is provided', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'true';
    const workflows = makeWorkflowMap(['session-management', 'doctor', 'simulator']);

    const result = resolveSelectedWorkflows(workflows, ['simulator']);

    expect(result.selectedNames).toEqual(['session-management', 'doctor', 'simulator']);
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'doctor',
      'simulator',
    ]);
  });

  it('does not add doctor when debug is disabled', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'false';
    const workflows = makeWorkflowMap(['session-management', 'doctor', 'simulator']);

    const result = resolveSelectedWorkflows(workflows, ['simulator']);

    expect(result.selectedNames).toEqual(['session-management', 'simulator']);
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'simulator',
    ]);
  });

  it('returns all workflows when no selection list is provided', () => {
    process.env.XCODEBUILDMCP_DEBUG = 'true';
    const workflows = makeWorkflowMap(['session-management', 'doctor', 'simulator']);

    const result = resolveSelectedWorkflows(workflows, []);

    expect(result.selectedNames).toBeNull();
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'doctor',
      'simulator',
    ]);
  });
});
