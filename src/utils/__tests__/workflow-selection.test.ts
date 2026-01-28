import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { resolveSelectedWorkflows } from '../workflow-selection.ts';
import type { WorkflowGroup } from '../../core/plugin-types.ts';
import {
  __resetConfigStoreForTests,
  initConfigStore,
  type RuntimeConfigOverrides,
} from '../config-store.ts';
import { createMockFileSystemExecutor } from '../../test-utils/mock-executors.ts';

const cwd = '/repo';

async function initConfigStoreForTest(overrides: RuntimeConfigOverrides): Promise<void> {
  __resetConfigStoreForTests();
  await initConfigStore({ cwd, fs: createMockFileSystemExecutor(), overrides });
}

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
  it('adds doctor when debug is enabled and selection list is provided', async () => {
    await initConfigStoreForTest({
      debug: true,
      experimentalWorkflowDiscovery: true,
    });
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

  it('does not add doctor when debug is disabled', async () => {
    await initConfigStoreForTest({
      debug: false,
      experimentalWorkflowDiscovery: true,
    });
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

  it('defaults to simulator workflow when no selection list is provided', async () => {
    await initConfigStoreForTest({
      debug: true,
      experimentalWorkflowDiscovery: true,
    });
    const workflows = makeWorkflowMap([
      'session-management',
      'workflow-discovery',
      'doctor',
      'simulator',
    ]);

    const result = resolveSelectedWorkflows([], workflows);

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

  it('excludes workflow-discovery when experimental flag is disabled', async () => {
    await initConfigStoreForTest({
      debug: false,
      experimentalWorkflowDiscovery: false,
    });
    const workflows = makeWorkflowMap(['session-management', 'workflow-discovery', 'simulator']);

    const result = resolveSelectedWorkflows([], workflows);

    expect(result.selectedNames).toEqual(['session-management', 'simulator']);
    expect(result.selectedWorkflows.map((workflow) => workflow.directoryName)).toEqual([
      'session-management',
      'simulator',
    ]);
  });
});
