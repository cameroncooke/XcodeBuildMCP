/**
 * Manifest loader for YAML-based tool and workflow definitions.
 * Loads and merges multiple YAML files into a resolved manifest.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  toolManifestEntrySchema,
  workflowManifestEntrySchema,
  type ToolManifestEntry,
  type WorkflowManifestEntry,
  type ResolvedManifest,
} from './schema.ts';
import { getManifestsDir, getPackageRoot } from '../resource-root.ts';

// Re-export types for consumers
export type { ResolvedManifest, ToolManifestEntry, WorkflowManifestEntry };
import { isValidPredicate } from '../../visibility/predicate-registry.ts';
export { getManifestsDir, getPackageRoot } from '../resource-root.ts';

/**
 * Load all YAML files from a directory.
 */
function loadYamlFiles(dir: string): unknown[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  const results: unknown[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      const parsed = parseYaml(content) as Record<string, unknown> | null;
      if (parsed) {
        results.push({ ...parsed, _sourceFile: file });
      }
    } catch (err) {
      throw new Error(`Failed to parse YAML file ${filePath}: ${err}`);
    }
  }

  return results;
}

/**
 * Validation error for manifest loading.
 */
export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public readonly sourceFile?: string,
  ) {
    super(sourceFile ? `${message} (in ${sourceFile})` : message);
    this.name = 'ManifestValidationError';
  }
}

/**
 * Load and validate the complete manifest registry.
 * Merges all YAML files from manifests/tools/ and manifests/workflows/.
 */
export function loadManifest(): ResolvedManifest {
  const manifestsDir = getManifestsDir();
  const toolsDir = path.join(manifestsDir, 'tools');
  const workflowsDir = path.join(manifestsDir, 'workflows');

  const tools = new Map<string, ToolManifestEntry>();
  const workflows = new Map<string, WorkflowManifestEntry>();

  // Load tools
  const toolFiles = loadYamlFiles(toolsDir);
  for (const raw of toolFiles) {
    const sourceFile = (raw as { _sourceFile?: string })._sourceFile;
    const result = toolManifestEntrySchema.safeParse(raw);
    if (!result.success) {
      throw new ManifestValidationError(
        `Invalid tool manifest: ${result.error.message}`,
        sourceFile,
      );
    }

    const tool = result.data;

    // Check for duplicate ID
    if (tools.has(tool.id)) {
      throw new ManifestValidationError(`Duplicate tool ID '${tool.id}'`, sourceFile);
    }

    // Validate predicates
    for (const pred of tool.predicates) {
      if (!isValidPredicate(pred)) {
        throw new ManifestValidationError(
          `Unknown predicate '${pred}' in tool '${tool.id}'`,
          sourceFile,
        );
      }
    }

    tools.set(tool.id, tool);
  }

  // Load workflows
  const workflowFiles = loadYamlFiles(workflowsDir);
  for (const raw of workflowFiles) {
    const sourceFile = (raw as { _sourceFile?: string })._sourceFile;
    const result = workflowManifestEntrySchema.safeParse(raw);
    if (!result.success) {
      throw new ManifestValidationError(
        `Invalid workflow manifest: ${result.error.message}`,
        sourceFile,
      );
    }

    const workflow = result.data;

    // Check for duplicate ID
    if (workflows.has(workflow.id)) {
      throw new ManifestValidationError(`Duplicate workflow ID '${workflow.id}'`, sourceFile);
    }

    // Validate predicates
    for (const pred of workflow.predicates) {
      if (!isValidPredicate(pred)) {
        throw new ManifestValidationError(
          `Unknown predicate '${pred}' in workflow '${workflow.id}'`,
          sourceFile,
        );
      }
    }

    // Validate tool references
    for (const toolId of workflow.tools) {
      if (!tools.has(toolId)) {
        throw new ManifestValidationError(
          `Workflow '${workflow.id}' references unknown tool '${toolId}'`,
          sourceFile,
        );
      }
    }

    workflows.set(workflow.id, workflow);
  }

  // Validate MCP name uniqueness
  const mcpNames = new Map<string, string>(); // mcpName -> toolId
  for (const [toolId, tool] of tools) {
    const existing = mcpNames.get(tool.names.mcp);
    if (existing) {
      throw new ManifestValidationError(
        `Duplicate MCP name '${tool.names.mcp}' used by tools '${existing}' and '${toolId}'`,
      );
    }
    mcpNames.set(tool.names.mcp, toolId);
  }

  // Validate next step template references
  for (const [toolId, tool] of tools.entries()) {
    const sourceFile = toolFiles.find((raw) => {
      const candidate = raw as { id?: string; _sourceFile?: string };
      return candidate.id === toolId;
    }) as { _sourceFile?: string } | undefined;

    for (const nextStep of tool.nextSteps) {
      if (nextStep.toolId && !tools.has(nextStep.toolId)) {
        throw new ManifestValidationError(
          `Tool '${toolId}' next step references unknown tool '${nextStep.toolId}'`,
          sourceFile?._sourceFile,
        );
      }
    }
  }

  return { tools, workflows };
}

/**
 * Validate that all tool modules exist on disk.
 * Call this at startup to fail fast on missing modules.
 */
export function validateToolModules(manifest: ResolvedManifest): void {
  const packageRoot = getPackageRoot();

  for (const [toolId, tool] of manifest.tools) {
    const modulePath = path.join(packageRoot, 'build', `${tool.module}.js`);
    if (!fs.existsSync(modulePath)) {
      throw new ManifestValidationError(
        `Tool '${toolId}' references missing module: ${modulePath}`,
      );
    }
  }
}

/**
 * Get tools for a specific workflow.
 */
export function getWorkflowTools(
  manifest: ResolvedManifest,
  workflowId: string,
): ToolManifestEntry[] {
  const workflow = manifest.workflows.get(workflowId);
  if (!workflow) {
    return [];
  }

  return workflow.tools
    .map((toolId) => manifest.tools.get(toolId))
    .filter((t): t is ToolManifestEntry => t !== undefined);
}

/**
 * Get all unique tools across selected workflows.
 */
export function getToolsForWorkflows(
  manifest: ResolvedManifest,
  workflowIds: string[],
): ToolManifestEntry[] {
  const seenToolIds = new Set<string>();
  const tools: ToolManifestEntry[] = [];

  for (const workflowId of workflowIds) {
    const workflowTools = getWorkflowTools(manifest, workflowId);
    for (const tool of workflowTools) {
      if (!seenToolIds.has(tool.id)) {
        seenToolIds.add(tool.id);
        tools.push(tool);
      }
    }
  }

  return tools;
}

/**
 * Get workflow metadata from the manifest.
 * Returns a record mapping workflow IDs to their title/description.
 */
export function getWorkflowMetadataFromManifest(): Record<
  string,
  { name: string; description: string }
> {
  const manifest = loadManifest();
  const metadata: Record<string, { name: string; description: string }> = {};

  for (const [id, workflow] of manifest.workflows.entries()) {
    metadata[id] = {
      name: workflow.title,
      description: workflow.description,
    };
  }

  return metadata;
}
