import type { ToolCatalog, ToolDefinition, ToolInvoker, InvokeOptions } from './types.ts';
import type { NextStep, NextStepParams, NextStepParamsMap, ToolResponse } from '../types/common.ts';
import { createErrorResponse } from '../utils/responses/index.ts';
import { DaemonClient } from '../cli/daemon-client.ts';
import { ensureDaemonRunning, DEFAULT_DAEMON_STARTUP_TIMEOUT_MS } from '../cli/daemon-control.ts';

/**
 * Resolve template params using input args.
 * Supports primitive passthrough and ${argName} substitution.
 */
function resolveTemplateParams(
  params: Record<string, string | number | boolean>,
  args: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const resolved: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      const match = value.match(/^\$\{([^}]+)\}$/);
      if (match) {
        const argValue = args[match[1]];
        if (
          typeof argValue === 'string' ||
          typeof argValue === 'number' ||
          typeof argValue === 'boolean'
        ) {
          resolved[key] = argValue;
          continue;
        }
      }
    }
    resolved[key] = value;
  }

  return resolved;
}

function buildTemplateNextSteps(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  catalog: ToolCatalog,
): NextStep[] {
  if (!tool.nextStepTemplates || tool.nextStepTemplates.length === 0) {
    return [];
  }

  const built: NextStep[] = [];
  for (const template of tool.nextStepTemplates) {
    if (!template.toolId) {
      built.push({
        label: template.label,
        priority: template.priority,
      });
      continue;
    }

    const target = catalog.getByToolId(template.toolId);
    if (!target) {
      continue;
    }

    built.push({
      tool: target.mcpName,
      label: template.label,
      params: resolveTemplateParams(template.params ?? {}, args),
      priority: template.priority,
    });
  }

  return built;
}

function hasTemplateParams(step: NextStep): boolean {
  return !!step.params && Object.keys(step.params).length > 0;
}

function consumeDynamicParams(
  nextStepParams: NextStepParamsMap | undefined,
  toolId: string,
  consumedCounts: Map<string, number>,
): NextStepParams | undefined {
  const candidate = nextStepParams?.[toolId];
  if (!candidate) {
    return undefined;
  }

  if (Array.isArray(candidate)) {
    const current = consumedCounts.get(toolId) ?? 0;
    consumedCounts.set(toolId, current + 1);
    return candidate[current];
  }

  return candidate;
}

function mergeTemplateAndResponseNextSteps(
  tool: ToolDefinition,
  templateSteps: NextStep[],
  responseParamsMap: NextStepParamsMap | undefined,
  responseSteps: NextStep[] | undefined,
): NextStep[] {
  const consumedCounts = new Map<string, number>();
  const templates = tool.nextStepTemplates ?? [];

  return templateSteps.map((templateStep, index) => {
    const template = templates[index];
    if (!template?.toolId || !templateStep.tool || hasTemplateParams(templateStep)) {
      return templateStep;
    }

    const paramsFromMap = consumeDynamicParams(responseParamsMap, template.toolId, consumedCounts);
    if (paramsFromMap) {
      return {
        ...templateStep,
        params: paramsFromMap,
      };
    }

    const fallbackStep = responseSteps?.[index];
    if (!fallbackStep?.params) {
      return templateStep;
    }

    return {
      ...templateStep,
      params: fallbackStep.params,
    };
  });
}

function normalizeNextSteps(
  response: ToolResponse,
  catalog: ToolCatalog,
  runtime: InvokeOptions['runtime'],
): ToolResponse {
  if (!response.nextSteps || response.nextSteps.length === 0) {
    return response;
  }

  return {
    ...response,
    nextSteps: response.nextSteps.map((step) => {
      if (!step.tool) {
        return step;
      }

      const target = catalog.getByMcpName(step.tool);
      if (!target) {
        return step;
      }

      return runtime === 'cli'
        ? {
            ...step,
            tool: target.mcpName,
            workflow: target.workflow,
            cliTool: target.cliName,
          }
        : {
            ...step,
            tool: target.mcpName,
          };
    }),
  };
}

function postProcessToolResponse(params: {
  tool: ToolDefinition;
  response: ToolResponse;
  args: Record<string, unknown>;
  catalog: ToolCatalog;
  runtime: InvokeOptions['runtime'];
}): ToolResponse {
  const { tool, response, args, catalog, runtime } = params;

  const templateSteps = buildTemplateNextSteps(tool, args, catalog);
  const canApplyTemplates =
    templateSteps.length > 0 &&
    (!response.nextSteps ||
      response.nextSteps.length === 0 ||
      response.nextSteps.length === templateSteps.length);

  const withTemplates = canApplyTemplates
    ? {
        ...response,
        nextSteps: mergeTemplateAndResponseNextSteps(
          tool,
          templateSteps,
          response.nextStepParams,
          response.nextSteps,
        ),
      }
    : response;

  const result = normalizeNextSteps(withTemplates, catalog, runtime);
  delete result.nextStepParams;
  return result;
}

function buildDaemonEnvOverrides(opts: InvokeOptions): Record<string, string> | undefined {
  const envOverrides: Record<string, string> = {};

  if (opts.logLevel) {
    envOverrides.XCODEBUILDMCP_DAEMON_LOG_LEVEL = opts.logLevel;
  }

  return Object.keys(envOverrides).length > 0 ? envOverrides : undefined;
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

  private buildPostProcessParams(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    runtime: InvokeOptions['runtime'],
  ): {
    tool: ToolDefinition;
    args: Record<string, unknown>;
    catalog: ToolCatalog;
    runtime: InvokeOptions['runtime'];
  } {
    return { tool, args, catalog: this.catalog, runtime };
  }

  private async ensureDaemonClient(
    opts: InvokeOptions,
  ): Promise<{ client: DaemonClient } | { error: ToolResponse }> {
    const socketPath = opts.socketPath;
    if (!socketPath) {
      return {
        error: createErrorResponse(
          'Socket path required',
          `No socket path configured for daemon communication.`,
        ),
      };
    }

    const client = new DaemonClient({ socketPath });
    const isRunning = await client.isRunning();

    if (!isRunning) {
      try {
        await ensureDaemonRunning({
          socketPath,
          workspaceRoot: opts.workspaceRoot,
          startupTimeoutMs: opts.daemonStartupTimeoutMs ?? DEFAULT_DAEMON_STARTUP_TIMEOUT_MS,
          env: buildDaemonEnvOverrides(opts),
        });
      } catch (error) {
        return {
          error: createErrorResponse(
            'Daemon auto-start failed',
            (error instanceof Error ? error.message : String(error)) +
              `\n\nYou can try starting the daemon manually:\n` +
              `  xcodebuildmcp daemon start`,
          ),
        };
      }
    }

    return { client };
  }

  private async executeTool(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    const xcodeIdeRemoteToolName = tool.xcodeIdeRemoteToolName;
    const isDynamicXcodeIdeTool =
      tool.workflow === 'xcode-ide' && typeof xcodeIdeRemoteToolName === 'string';

    if (opts.runtime === 'cli' && isDynamicXcodeIdeTool) {
      const result = await this.ensureDaemonClient(opts);
      if ('error' in result) return result.error;

      try {
        const response = await result.client.invokeXcodeIdeTool(xcodeIdeRemoteToolName, args);
        return postProcessToolResponse({
          ...this.buildPostProcessParams(tool, args, opts.runtime),
          response,
        });
      } catch (error) {
        return createErrorResponse(
          'Xcode IDE invocation failed',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (opts.runtime === 'cli' && tool.stateful) {
      const result = await this.ensureDaemonClient(opts);
      if ('error' in result) return result.error;

      try {
        const response = await result.client.invokeTool(tool.mcpName, args);
        return postProcessToolResponse({
          ...this.buildPostProcessParams(tool, args, opts.runtime),
          response,
        });
      } catch (error) {
        return createErrorResponse(
          'Daemon invocation failed',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Direct invocation (CLI stateless or daemon internal)
    try {
      const response = await tool.handler(args);
      return postProcessToolResponse({
        ...this.buildPostProcessParams(tool, args, opts.runtime),
        response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Tool execution failed', message);
    }
  }
}
