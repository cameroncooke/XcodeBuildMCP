import { expect } from 'vitest';
import { loadManifest } from '../core/manifest/load-manifest.ts';
import type { NextStep } from '../types/common.ts';

function normalizeToolName(name: string): string {
  return name.trim().toLowerCase();
}

type MappedManifestTool = {
  id: string;
  names: { mcp: string };
  aliases?: { mcp?: string[] };
};

function createMcpToolToIdResolver(): (toolName: string | undefined) => string | undefined {
  const nameToId = new Map<string, string>();
  const manifest = loadManifest();

  for (const rawTool of manifest.tools.values()) {
    const tool = rawTool as MappedManifestTool;
    nameToId.set(normalizeToolName(tool.names.mcp), tool.id);

    for (const alias of tool.aliases?.mcp ?? []) {
      nameToId.set(normalizeToolName(alias), tool.id);
    }
  }

  return function resolveMcpToolToId(toolName: string | undefined): string | undefined {
    if (!toolName) {
      return undefined;
    }

    return nameToId.get(normalizeToolName(toolName));
  };
}

const resolveMcpToolToId = createMcpToolToIdResolver();

export function expectNextStepByToolId(
  steps: NextStep[] | undefined,
  expected: { toolId: string; label: string; priority?: number },
): NextStep {
  expect(steps).toBeDefined();
  expect(steps!.length).toBeGreaterThan(0);

  const matchesByToolId =
    steps?.filter((step) => resolveMcpToolToId(step.tool) === expected.toolId) ?? [];
  const matches =
    matchesByToolId.length > 0
      ? matchesByToolId
      : (steps?.filter(
          (step) =>
            step.label === expected.label &&
            (expected.priority === undefined || step.priority === expected.priority),
        ) ?? []);
  expect(matches).toHaveLength(1);

  const step = matches[0];
  expect(step.label).toBe(expected.label);

  if (expected.priority !== undefined) {
    expect(step.priority).toBe(expected.priority);
  }

  return step;
}
