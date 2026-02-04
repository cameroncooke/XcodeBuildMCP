import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../utils/tool-registry.ts', () => ({
  applyWorkflowSelectionFromManifest: vi.fn(),
  getRegisteredWorkflows: vi.fn(),
  getMcpPredicateContext: vi.fn().mockReturnValue({
    runtime: 'mcp',
    config: { debug: false },
    runningUnderXcode: false,
    xcodeToolsActive: false,
  }),
}));

vi.mock('../../../../utils/config-store.ts', () => ({
  getConfig: vi.fn().mockReturnValue({
    debug: false,
    experimentalWorkflowDiscovery: false,
    enabledWorkflows: [],
  }),
}));

import { manage_workflowsLogic } from '../manage_workflows.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import {
  applyWorkflowSelectionFromManifest,
  getRegisteredWorkflows,
} from '../../../../utils/tool-registry.ts';

describe('manage_workflows tool', () => {
  beforeEach(() => {
    vi.mocked(applyWorkflowSelectionFromManifest).mockReset();
    vi.mocked(getRegisteredWorkflows).mockReset();
  });

  it('merges new workflows with current set when enable is true', async () => {
    vi.mocked(getRegisteredWorkflows).mockReturnValue(['simulator']);
    vi.mocked(applyWorkflowSelectionFromManifest).mockResolvedValue({
      enabledWorkflows: ['simulator', 'device'],
      registeredToolCount: 0,
    });

    const executor = createMockExecutor({ success: true, output: '' });
    const result = await manage_workflowsLogic(
      { workflowNames: ['device'], enable: true },
      executor,
    );

    expect(vi.mocked(applyWorkflowSelectionFromManifest)).toHaveBeenCalledWith(
      ['simulator', 'device'],
      expect.objectContaining({ runtime: 'mcp' }),
    );
    expect(result.content[0].text).toBe('Workflows enabled: simulator, device');
  });

  it('removes requested workflows when enable is false', async () => {
    vi.mocked(getRegisteredWorkflows).mockReturnValue(['simulator', 'device']);
    vi.mocked(applyWorkflowSelectionFromManifest).mockResolvedValue({
      enabledWorkflows: ['simulator'],
      registeredToolCount: 0,
    });

    const executor = createMockExecutor({ success: true, output: '' });
    const result = await manage_workflowsLogic(
      { workflowNames: ['device'], enable: false },
      executor,
    );

    expect(vi.mocked(applyWorkflowSelectionFromManifest)).toHaveBeenCalledWith(
      ['simulator'],
      expect.objectContaining({ runtime: 'mcp' }),
    );
    expect(result.content[0].text).toBe('Workflows enabled: simulator');
  });

  it('accepts workflowName as an array', async () => {
    vi.mocked(getRegisteredWorkflows).mockReturnValue(['simulator']);
    vi.mocked(applyWorkflowSelectionFromManifest).mockResolvedValue({
      enabledWorkflows: ['simulator', 'device', 'logging'],
      registeredToolCount: 0,
    });

    const executor = createMockExecutor({ success: true, output: '' });
    await manage_workflowsLogic({ workflowNames: ['device', 'logging'], enable: true }, executor);

    expect(vi.mocked(applyWorkflowSelectionFromManifest)).toHaveBeenCalledWith(
      ['simulator', 'device', 'logging'],
      expect.objectContaining({ runtime: 'mcp' }),
    );
  });
});
