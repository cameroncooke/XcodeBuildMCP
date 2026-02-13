import type { ToolCatalog, ToolDefinition, ToolInvoker, InvokeOptions } from './types.ts';
import type { ToolResponse } from '../types/common.ts';
import { createErrorResponse } from '../utils/responses/index.ts';
import { DaemonClient } from '../cli/daemon-client.ts';
import { ensureDaemonRunning, DEFAULT_DAEMON_STARTUP_TIMEOUT_MS } from '../cli/daemon-control.ts';
import { log } from '../utils/logger.ts';
import {
  recordInternalErrorMetric,
  recordToolInvocationMetric,
  type SentryToolInvocationOutcome,
  type SentryToolRuntime,
  type SentryToolTransport,
} from '../utils/sentry.ts';

/**
 * Enrich nextSteps for CLI rendering.
 * Resolves MCP tool names to their workflow and CLI command name.
 */
function enrichNextStepsForCli(response: ToolResponse, catalog: ToolCatalog): ToolResponse {
  if (!response.nextSteps || response.nextSteps.length === 0) {
    return response;
  }

  return {
    ...response,
    nextSteps: response.nextSteps.map((step) => {
      const target = catalog.getByMcpName(step.tool);
      if (!target) {
        return step;
      }

      return {
        ...step,
        workflow: target.workflow,
        cliTool: target.cliName, // Canonical CLI name from manifest
      };
    }),
  };
}

function buildDaemonEnvOverrides(opts: InvokeOptions): Record<string, string> | undefined {
  const envOverrides: Record<string, string> = {};

  if (opts.logLevel) {
    envOverrides.XCODEBUILDMCP_DAEMON_LOG_LEVEL = opts.logLevel;
  }

  return Object.keys(envOverrides).length > 0 ? envOverrides : undefined;
}

function getErrorKind(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }
  return typeof error;
}

function mapRuntimeToSentryToolRuntime(runtime: InvokeOptions['runtime']): SentryToolRuntime {
  switch (runtime) {
    case 'daemon':
    case 'mcp':
      return runtime;
    default:
      return 'cli';
  }
}

export class DefaultToolInvoker implements ToolInvoker {
  constructor(private catalog: ToolCatalog) {}

  async invoke(
    toolName: string,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    const resolved = this.catalog.resolve(toolName);

    if (resolved.ambiguous) {
      return createErrorResponse(
        'Ambiguous tool name',
        `Multiple tools match '${toolName}'. Use one of:\n- ${resolved.ambiguous.join('\n- ')}`,
      );
    }

    if (resolved.notFound || !resolved.tool) {
      return createErrorResponse(
        'Tool not found',
        `Unknown tool '${toolName}'. Run 'xcodebuildmcp tools' to see available tools.`,
      );
    }

    return this.executeTool(resolved.tool, args, opts);
  }

  /**
   * Invoke a tool directly, bypassing catalog resolution.
   * Used by CLI where the correct ToolDefinition is already known
   * from workflow-scoped yargs routing.
   */
  async invokeDirect(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    return this.executeTool(tool, args, opts);
  }

  /**
   * Route a tool invocation through the daemon, auto-starting it if needed.
   */
  private async invokeViaDaemon(
    opts: InvokeOptions,
    args: Record<string, unknown>,
    invoke: (client: DaemonClient) => Promise<ToolResponse>,
    context: {
      label: string;
      errorTitle: string;
      captureInfraErrorMetric: (error: unknown) => void;
      captureInvocationMetric: (outcome: SentryToolInvocationOutcome) => void;
    },
  ): Promise<ToolResponse> {
    const socketPath = opts.socketPath;
    if (!socketPath) {
      context.captureInfraErrorMetric(new Error('SocketPathMissing'));
      context.captureInvocationMetric('infra_error');
      return createErrorResponse(
        'Socket path required',
        'No socket path configured for daemon communication.',
      );
    }

    const client = new DaemonClient({ socketPath });
    const envOverrides = buildDaemonEnvOverrides(opts);

    const isRunning = await client.isRunning();
    if (!isRunning) {
      try {
        await ensureDaemonRunning({
          socketPath,
          workspaceRoot: opts.workspaceRoot,
          startupTimeoutMs: opts.daemonStartupTimeoutMs ?? DEFAULT_DAEMON_STARTUP_TIMEOUT_MS,
          env: envOverrides,
        });
      } catch (error) {
        log(
          'error',
          `[infra/tool-invoker] ${context.label} daemon auto-start failed (${getErrorKind(error)})`,
          { sentry: true },
        );
        context.captureInfraErrorMetric(error);
        context.captureInvocationMetric('infra_error');
        return createErrorResponse(
          'Daemon auto-start failed',
          (error instanceof Error ? error.message : String(error)) +
            '\n\nYou can try starting the daemon manually:\n' +
            '  xcodebuildmcp daemon start',
        );
      }
    }

    try {
      const response = await invoke(client);
      context.captureInvocationMetric('completed');
      return enrichNextStepsForCli(response, this.catalog);
    } catch (error) {
      log(
        'error',
        `[infra/tool-invoker] ${context.label} transport failed (${getErrorKind(error)})`,
        { sentry: true },
      );
      context.captureInfraErrorMetric(error);
      context.captureInvocationMetric('infra_error');
      return createErrorResponse(
        context.errorTitle,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async executeTool(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    const startedAt = Date.now();
    const runtime = mapRuntimeToSentryToolRuntime(opts.runtime);
    let transport: SentryToolTransport = 'direct';

    const captureInvocationMetric = (outcome: SentryToolInvocationOutcome): void => {
      recordToolInvocationMetric({
        toolName: tool.mcpName,
        runtime,
        transport,
        outcome,
        durationMs: Date.now() - startedAt,
      });
    };

    const captureInfraErrorMetric = (error: unknown): void => {
      recordInternalErrorMetric({
        component: 'tool-invoker',
        runtime,
        errorKind: getErrorKind(error),
      });
    };

    const metricContext = { captureInfraErrorMetric, captureInvocationMetric };

    if (opts.runtime === 'cli') {
      const xcodeIdeRemoteToolName = tool.xcodeIdeRemoteToolName;
      const isDynamicXcodeIdeTool =
        tool.workflow === 'xcode-ide' && typeof xcodeIdeRemoteToolName === 'string';

      if (isDynamicXcodeIdeTool) {
        transport = 'xcode-ide-daemon';
        return this.invokeViaDaemon(
          opts,
          args,
          (client) => client.invokeXcodeIdeTool(xcodeIdeRemoteToolName, args),
          {
            ...metricContext,
            label: 'xcode-ide',
            errorTitle: 'Xcode IDE invocation failed',
          },
        );
      }

      if (tool.stateful) {
        transport = 'daemon';
        return this.invokeViaDaemon(opts, args, (client) => client.invokeTool(tool.mcpName, args), {
          ...metricContext,
          label: `daemon/${tool.mcpName}`,
          errorTitle: 'Daemon invocation failed',
        });
      }
    }

    // Direct invocation (CLI stateless or daemon internal)
    try {
      const response = await tool.handler(args);
      captureInvocationMetric('completed');
      return opts.runtime === 'cli' ? enrichNextStepsForCli(response, this.catalog) : response;
    } catch (error) {
      log(
        'error',
        `[infra/tool-invoker] direct tool handler failed for ${tool.mcpName} (${getErrorKind(error)})`,
        { sentry: true },
      );
      captureInfraErrorMetric(error);
      captureInvocationMetric('infra_error');
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Tool execution failed', message);
    }
  }
}
