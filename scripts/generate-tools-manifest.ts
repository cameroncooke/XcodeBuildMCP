#!/usr/bin/env node

/**
 * XcodeBuildMCP Tools Manifest Generator
 *
 * Generates build/tools-manifest.json from static AST analysis.
 * This is the canonical source of truth for docs and CLI tooling output.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getStaticToolAnalysis } from './analysis/tools-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

type ToolManifestEntry = {
  name: string;
  mcpName: string;
  cliName: string;
  workflow: string;
  description: string;
  originWorkflow?: string;
  isCanonical: boolean;
  stateful: boolean;
};

type WorkflowManifestEntry = {
  name: string;
  displayName: string;
  description: string;
  toolCount: number;
  canonicalCount: number;
  reExportCount: number;
};

type ToolsManifest = {
  generatedAt: string;
  stats: {
    totalTools: number;
    canonicalTools: number;
    reExportTools: number;
    workflowCount: number;
  };
  workflows: WorkflowManifestEntry[];
  tools: ToolManifestEntry[];
};

function toKebabCase(name: string): string {
  return name
    .trim()
    .replace(/_/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main(): Promise<void> {
  const analysis = await getStaticToolAnalysis();

  const tools: ToolManifestEntry[] = analysis.tools.map((tool) => ({
    name: tool.name,
    mcpName: tool.name,
    cliName: tool.cliName ?? toKebabCase(tool.name),
    workflow: tool.workflow,
    description: tool.description,
    originWorkflow: tool.originWorkflow,
    isCanonical: tool.isCanonical,
    stateful: tool.stateful ?? false,
  }));

  tools.sort(
    (a, b) => a.workflow.localeCompare(b.workflow) || a.name.localeCompare(b.name),
  );

  const workflows: WorkflowManifestEntry[] = analysis.workflows.map((workflow) => ({
    name: workflow.name,
    displayName: workflow.displayName,
    description: workflow.description,
    toolCount: workflow.toolCount,
    canonicalCount: workflow.canonicalCount,
    reExportCount: workflow.reExportCount,
  }));

  const manifest: ToolsManifest = {
    generatedAt: new Date().toISOString(),
    stats: analysis.stats,
    workflows,
    tools,
  };

  const outputPath = path.join(projectRoot, 'build', 'tools-manifest.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  process.stdout.write(
    `✅ Generated tools manifest: ${path.relative(projectRoot, outputPath)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`❌ Failed to generate tools manifest: ${String(error)}\n`);
  process.exit(1);
});

