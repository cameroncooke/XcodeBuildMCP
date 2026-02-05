import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types/common.ts';
import type { ToolSchemaShape, PluginMeta } from '../core/plugin-types.ts';

export type RuntimeKind = 'cli' | 'daemon' | 'mcp';

export interface ToolDefinition {
  /** Stable CLI command name (kebab-case, disambiguated) */
  cliName: string;

  /** Original MCP tool name as declared (unchanged) */
  mcpName: string;

  /** Workflow directory name (e.g., "simulator", "device", "logging") */
  workflow: string;

  description?: string;
  annotations?: ToolAnnotations;

  /**
   * Schema shape used to generate yargs flags for CLI.
   * Must include ALL parameters (not the session-default-hidden version).
   */
  cliSchema: ToolSchemaShape;

  /**
   * Schema shape used for MCP registration.
   */
  mcpSchema: ToolSchemaShape;

  /**
   * Whether CLI MUST route this tool to the daemon (stateful operations).
   */
  stateful: boolean;

  /**
   * Daemon routing preference for CLI (optional).
   */
  daemonAffinity?: 'preferred' | 'required';

  /**
   * Shared handler (same used by MCP). No duplication.
   */
  handler: PluginMeta['handler'];
}

export interface ToolResolution {
  tool?: ToolDefinition;
  ambiguous?: string[];
  notFound?: boolean;
}

export interface ToolCatalog {
  tools: ToolDefinition[];

  /** Exact match on cliName */
  getByCliName(name: string): ToolDefinition | null;

  /** Exact match on MCP name */
  getByMcpName(name: string): ToolDefinition | null;

  /** Resolve user input, supporting aliases + ambiguity reporting */
  resolve(input: string): ToolResolution;
}

export interface InvokeOptions {
  runtime: RuntimeKind;
  /** CLI-exposed workflow IDs used for daemon environment overrides */
  cliExposedWorkflowIds?: string[];
  /** @deprecated Use cliExposedWorkflowIds instead */
  enabledWorkflows?: string[];
  /** If true, route even stateless tools to daemon */
  forceDaemon?: boolean;
  /** Socket path override */
  socketPath?: string;
  /** If true, disable daemon usage entirely (stateful tools will error) */
  disableDaemon?: boolean;
  /** Timeout in ms for daemon startup when auto-starting (default: 5000) */
  daemonStartupTimeoutMs?: number;
  /** Workspace root for daemon auto-start context */
  workspaceRoot?: string;
  /** Log level override for daemon auto-start */
  logLevel?: string;
}

export interface ToolInvoker {
  invoke(
    toolName: string,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse>;
}
