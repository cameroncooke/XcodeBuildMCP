import type { ToolDefinition } from './types.ts';

/**
 * Convert a tool name to kebab-case for CLI usage.
 * Examples:
 *   build_sim -> build-sim
 *   startSimLogCap -> start-sim-log-cap
 *   BuildSimulator -> build-simulator
 */
export function toKebabCase(name: string): string {
  return (
    name
      .trim()
      // Replace underscores with hyphens
      .replace(/_/g, '-')
      // Insert hyphen before uppercase letters (for camelCase/PascalCase)
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      // Replace spaces with hyphens
      .replace(/\s+/g, '-')
      // Convert to lowercase
      .toLowerCase()
      // Remove any duplicate hyphens
      .replace(/-+/g, '-')
      // Trim leading/trailing hyphens
      .replace(/^-|-$/g, '')
  );
}

/**
 * Convert kebab-case CLI flag back to camelCase for tool params.
 * Examples:
 *   project-path -> projectPath
 *   simulator-name -> simulatorName
 */
export function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_match: string, letter: string) => letter.toUpperCase());
}

/**
 * Disambiguate CLI names when duplicates exist across workflows.
 * If multiple tools have the same kebab-case name, prefix with workflow name.
 */
export function disambiguateCliNames(tools: ToolDefinition[]): ToolDefinition[] {
  // Group tools by their base CLI name
  const groups = new Map<string, ToolDefinition[]>();
  for (const tool of tools) {
    const existing = groups.get(tool.cliName) ?? [];
    groups.set(tool.cliName, [...existing, tool]);
  }

  // Disambiguate tools that share the same CLI name
  return tools.map((tool) => {
    const sameNameTools = groups.get(tool.cliName) ?? [];
    if (sameNameTools.length <= 1) {
      return tool;
    }

    // Prefix with workflow name for disambiguation
    const disambiguatedName = `${tool.workflow}-${tool.cliName}`;
    return { ...tool, cliName: disambiguatedName };
  });
}

/**
 * Convert CLI argv keys (kebab-case) back to tool param keys (camelCase).
 */
export function convertArgvToToolParams(argv: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(argv)) {
    // Skip yargs internal keys
    if (key === '_' || key === '$0') continue;
    // Convert kebab-case to camelCase
    const camelKey = toCamelCase(key);
    result[camelKey] = value;
  }
  return result;
}
