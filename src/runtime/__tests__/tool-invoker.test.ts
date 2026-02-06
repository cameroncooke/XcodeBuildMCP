import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ToolResponse } from '../../types/common.ts';
import type { ToolDefinition } from '../types.ts';
import { createToolCatalog } from '../tool-catalog.ts';
import { DefaultToolInvoker } from '../tool-invoker.ts';
import { ensureDaemonRunning } from '../../cli/daemon-control.ts';

const daemonClientMock = {
  isRunning: vi.fn<() => Promise<boolean>>(),
  invokeXcodeIdeTool:
    vi.fn<(name: string, args: Record<string, unknown>) => Promise<ToolResponse>>(),
  invokeTool: vi.fn<(name: string, args: Record<string, unknown>) => Promise<ToolResponse>>(),
  listTools: vi.fn<() => Promise<Array<{ name: string }>>>(),
};

vi.mock('../../cli/daemon-client.ts', () => ({
  DaemonClient: vi.fn().mockImplementation(() => daemonClientMock),
}));

vi.mock('../../cli/daemon-control.ts', () => ({
  ensureDaemonRunning: vi.fn(),
  DEFAULT_DAEMON_STARTUP_TIMEOUT_MS: 5000,
}));

function textResponse(text: string): ToolResponse {
  return {
    content: [{ type: 'text', text }],
  };
}

function makeTool(opts: {
  cliName: string;
  workflow: string;
  stateful: boolean;
  handler: ToolDefinition['handler'];
  xcodeIdeRemoteToolName?: string;
}): ToolDefinition {
  return {
    cliName: opts.cliName,
    mcpName: opts.cliName.replace(/-/g, '_'),
    workflow: opts.workflow,
    description: `${opts.cliName} tool`,
    mcpSchema: { value: z.string().optional() },
    cliSchema: { value: z.string().optional() },
    stateful: opts.stateful,
    xcodeIdeRemoteToolName: opts.xcodeIdeRemoteToolName,
    handler: opts.handler,
  };
}

describe('DefaultToolInvoker CLI routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    daemonClientMock.isRunning.mockResolvedValue(true);
    daemonClientMock.invokeXcodeIdeTool.mockResolvedValue(textResponse('daemon-xcode-ide-result'));
    daemonClientMock.invokeTool.mockResolvedValue(textResponse('daemon-result'));
    daemonClientMock.listTools.mockResolvedValue([]);
  });

  it('uses direct invocation for stateless tools', async () => {
    const directHandler = vi.fn().mockResolvedValue(textResponse('direct-result'));
    const catalog = createToolCatalog([
      makeTool({
        cliName: 'list-sims',
        workflow: 'simulator',
        stateful: false,
        handler: directHandler,
      }),
    ]);
    const invoker = new DefaultToolInvoker(catalog);

    const response = await invoker.invoke(
      'list-sims',
      { value: 'hello' },
      {
        runtime: 'cli',
        socketPath: '/tmp/xcodebuildmcp.sock',
      },
    );

    expect(directHandler).toHaveBeenCalledWith({ value: 'hello' });
    expect(daemonClientMock.isRunning).not.toHaveBeenCalled();
    expect(daemonClientMock.invokeTool).not.toHaveBeenCalled();
    expect(response.content[0].text).toBe('direct-result');
  });

  it('routes stateful tools through daemon and auto-starts when needed', async () => {
    daemonClientMock.isRunning.mockResolvedValue(false);
    const directHandler = vi.fn().mockResolvedValue(textResponse('direct-result'));
    const catalog = createToolCatalog([
      makeTool({
        cliName: 'start-sim-log-cap',
        workflow: 'logging',
        stateful: true,
        handler: directHandler,
      }),
    ]);
    const invoker = new DefaultToolInvoker(catalog);

    const response = await invoker.invoke(
      'start-sim-log-cap',
      { value: 'hello' },
      {
        runtime: 'cli',
        socketPath: '/tmp/xcodebuildmcp.sock',
        workspaceRoot: '/repo',
      },
    );

    expect(ensureDaemonRunning).toHaveBeenCalledWith(
      expect.objectContaining({
        socketPath: '/tmp/xcodebuildmcp.sock',
        workspaceRoot: '/repo',
        env: undefined,
      }),
    );
    expect(daemonClientMock.invokeTool).toHaveBeenCalledWith('start-sim-log-cap', {
      value: 'hello',
    });
    expect(directHandler).not.toHaveBeenCalled();
    expect(response.content[0].text).toBe('daemon-result');
  });
});

describe('DefaultToolInvoker xcode-ide dynamic routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    daemonClientMock.isRunning.mockResolvedValue(true);
    daemonClientMock.invokeXcodeIdeTool.mockResolvedValue(textResponse('daemon-result'));
    daemonClientMock.invokeTool.mockResolvedValue(textResponse('daemon-generic'));
    daemonClientMock.listTools.mockResolvedValue([]);
  });

  it('routes dynamic xcode-ide tools through daemon xcode-ide invoke API', async () => {
    daemonClientMock.isRunning.mockResolvedValue(false);
    const directHandler = vi.fn().mockResolvedValue(textResponse('direct-result'));
    const catalog = createToolCatalog([
      makeTool({
        cliName: 'xcode-ide-alpha',
        workflow: 'xcode-ide',
        stateful: false,
        xcodeIdeRemoteToolName: 'Alpha',
        handler: directHandler,
      }),
    ]);
    const invoker = new DefaultToolInvoker(catalog);

    const response = await invoker.invoke(
      'xcode-ide-alpha',
      { value: 'hello' },
      {
        runtime: 'cli',
        socketPath: '/tmp/xcodebuildmcp.sock',
        workspaceRoot: '/repo',
        cliExposedWorkflowIds: ['simulator', 'xcode-ide'],
      },
    );

    expect(ensureDaemonRunning).toHaveBeenCalledWith(
      expect.objectContaining({
        socketPath: '/tmp/xcodebuildmcp.sock',
        workspaceRoot: '/repo',
        env: undefined,
      }),
    );
    expect(daemonClientMock.invokeXcodeIdeTool).toHaveBeenCalledWith('Alpha', { value: 'hello' });
    expect(directHandler).not.toHaveBeenCalled();
    expect(response.content[0].text).toBe('daemon-result');
  });

  it('fails for dynamic xcode-ide tools when socket path is missing', async () => {
    const directHandler = vi.fn().mockResolvedValue(textResponse('direct-result'));
    const catalog = createToolCatalog([
      makeTool({
        cliName: 'xcode-ide-alpha',
        workflow: 'xcode-ide',
        stateful: false,
        xcodeIdeRemoteToolName: 'Alpha',
        handler: directHandler,
      }),
    ]);
    const invoker = new DefaultToolInvoker(catalog);

    const response = await invoker.invoke(
      'xcode-ide-alpha',
      { value: 'hello' },
      {
        runtime: 'cli',
      },
    );

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('No socket path configured');
    expect(directHandler).not.toHaveBeenCalled();
    expect(daemonClientMock.invokeXcodeIdeTool).not.toHaveBeenCalled();
  });
});
