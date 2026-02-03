#!/usr/bin/env node

/**
 * XcodeBuildMCP Tools Analysis
 *
 * Core TypeScript module for analyzing XcodeBuildMCP tools using AST parsing.
 * Provides reliable extraction of tool information without fallback strategies.
 */

import {
  createSourceFile,
  forEachChild,
  isExportAssignment,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  isTemplateExpression,
  isVariableDeclaration,
  isVariableStatement,
  type Node,
  type ObjectLiteralExpression,
  ScriptTarget,
  type SourceFile,
  SyntaxKind,
} from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const toolsDir = path.join(projectRoot, 'src', 'mcp', 'tools');

export interface ToolInfo {
  name: string;
  workflow: string;
  path: string;
  relativePath: string;
  description: string;
  cliName?: string;
  originWorkflow?: string;
  stateful?: boolean;
  isCanonical: boolean;
}

export interface WorkflowInfo {
  name: string;
  displayName: string;
  description: string;
  tools: ToolInfo[];
  toolCount: number;
  canonicalCount: number;
  reExportCount: number;
}

export interface AnalysisStats {
  totalTools: number;
  canonicalTools: number;
  reExportTools: number;
  workflowCount: number;
}

export interface StaticAnalysisResult {
  workflows: WorkflowInfo[];
  tools: ToolInfo[];
  stats: AnalysisStats;
}

type ExtractStringOptions = {
  allowFallback: boolean;
};

function extractStringValue(
  sourceFile: SourceFile,
  node: Node,
  options: ExtractStringOptions = { allowFallback: false },
): string | null {
  if (isStringLiteral(node)) {
    return node.text;
  }

  if (isTemplateExpression(node) || isNoSubstitutionTemplateLiteral(node)) {
    let text = node.getFullText(sourceFile).trim();
    if (text.startsWith('`') && text.endsWith('`')) {
      text = text.slice(1, -1);
    }
    return text;
  }

  if (!options.allowFallback) {
    return null;
  }

  const fullText = node.getFullText(sourceFile).trim();
  let cleaned = fullText;
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function extractBooleanValue(node: Node): boolean | null {
  if (node.kind === SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function getCodeLines(content: string): string[] {
  const contentWithoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '');

  return contentWithoutBlockComments
    .split('\n')
    .map((line) => line.split('//')[0].trim())
    .filter((line) => line.length > 0);
}

/**
 * Extract the description from a tool's default export using TypeScript AST
 */
function extractToolMetadata(sourceFile: SourceFile): {
  description: string;
  cliName?: string;
  stateful?: boolean;
} {
  let description: string | null = null;
  let cliName: string | null = null;
  let stateful: boolean | null = null;

  function visit(node: Node): void {
    let objectExpression: ObjectLiteralExpression | null = null;

    // Look for export default { ... } - the standard TypeScript pattern
    // isExportEquals is undefined for `export default` and true for `export = `
    if (isExportAssignment(node) && !node.isExportEquals) {
      if (isObjectLiteralExpression(node.expression)) {
        objectExpression = node.expression;
      }
    }

    if (objectExpression) {
      // Found export default { ... }, now look for description and CLI metadata
      for (const property of objectExpression.properties) {
        if (!isPropertyAssignment(property) || !isIdentifier(property.name)) {
          continue;
        }

        if (property.name.text === 'description') {
          description = extractStringValue(sourceFile, property.initializer, {
            allowFallback: true,
          });
          continue;
        }

        if (property.name.text === 'cli' && isObjectLiteralExpression(property.initializer)) {
          for (const cliProperty of property.initializer.properties) {
            if (!isPropertyAssignment(cliProperty) || !isIdentifier(cliProperty.name)) {
              continue;
            }

            if (cliProperty.name.text === 'name') {
              cliName = extractStringValue(sourceFile, cliProperty.initializer, {
                allowFallback: true,
              });
              continue;
            }

            if (cliProperty.name.text === 'stateful') {
              stateful = extractBooleanValue(cliProperty.initializer);
            }
          }
        }
      }
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);

  if (description === null) {
    throw new Error('Could not extract description from tool export default object');
  }

  return {
    description,
    cliName: cliName ?? undefined,
    stateful: stateful ?? undefined,
  };
}

/**
 * Check if a file is a re-export by examining its content
 */
function isReExportFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanedLines = getCodeLines(content);

  // Should have exactly one line: export { default } from '...';
  if (cleanedLines.length !== 1) {
    return false;
  }

  const exportLine = cleanedLines[0];
  return /^export\s*{\s*default\s*}\s*from\s*['"][^'"]+['"];?\s*$/.test(exportLine);
}

function getReExportTargetInfo(filePath: string): { filePath: string; workflow: string } | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanedLines = getCodeLines(content);

  if (cleanedLines.length !== 1) {
    return null;
  }

  const match = cleanedLines[0].match(/export\s*{\s*default\s*}\s*from\s*['"]([^'"]+)['"];?\s*$/);
  if (!match) {
    return null;
  }

  let targetFilePath = path.resolve(path.dirname(filePath), match[1]);
  if (!path.extname(targetFilePath)) {
    targetFilePath += '.ts';
  }

  if (!targetFilePath.startsWith(toolsDir)) {
    throw new Error(
      `Re-export target for ${path.relative(projectRoot, filePath)} is outside tools directory: ${targetFilePath}`,
    );
  }

  if (!fs.existsSync(targetFilePath)) {
    throw new Error(
      `Re-export target for ${path.relative(projectRoot, filePath)} does not exist: ${targetFilePath}`,
    );
  }

  return {
    filePath: targetFilePath,
    workflow: path.basename(path.dirname(targetFilePath)),
  };
}

/**
 * Get workflow metadata from index.ts file if it exists
 */
async function getWorkflowMetadata(
  workflowDir: string,
): Promise<{ displayName: string; description: string } | null> {
  const indexPath = path.join(toolsDir, workflowDir, 'index.ts');

  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const sourceFile = createSourceFile(indexPath, content, ScriptTarget.Latest, true);

    const workflowExport: { name?: string; description?: string } = {};

    function visit(node: Node): void {
      // Look for: export const workflow = { ... }
      if (
        isVariableStatement(node) &&
        node.modifiers?.some((mod) => mod.kind === SyntaxKind.ExportKeyword)
      ) {
        for (const declaration of node.declarationList.declarations) {
          if (
            isVariableDeclaration(declaration) &&
            isIdentifier(declaration.name) &&
            declaration.name.text === 'workflow' &&
            declaration.initializer &&
            isObjectLiteralExpression(declaration.initializer)
          ) {
            // Extract name and description properties
            for (const property of declaration.initializer.properties) {
              if (isPropertyAssignment(property) && isIdentifier(property.name)) {
                const propertyName = property.name.text;

                if (propertyName === 'name') {
                  const value = extractStringValue(sourceFile, property.initializer);
                  if (value) {
                    workflowExport.name = value;
                  }
                } else if (propertyName === 'description') {
                  const value = extractStringValue(sourceFile, property.initializer);
                  if (value) {
                    workflowExport.description = value;
                  }
                }
              }
            }
          }
        }
      }

      forEachChild(node, visit);
    }

    visit(sourceFile);

    if (workflowExport.name && workflowExport.description) {
      return {
        displayName: workflowExport.name,
        description: workflowExport.description,
      };
    }
  } catch (error) {
    console.error(`Warning: Could not parse workflow metadata from ${indexPath}: ${error}`);
  }

  return null;
}

/**
 * Get a human-readable workflow name from directory name
 */
function getWorkflowDisplayName(workflowDir: string): string {
  const displayNames: Record<string, string> = {
    device: 'iOS Device Development',
    doctor: 'System Doctor',
    logging: 'Logging & Monitoring',
    macos: 'macOS Development',
    'project-discovery': 'Project Discovery',
    'project-scaffolding': 'Project Scaffolding',
    simulator: 'iOS Simulator Development',
    'simulator-management': 'Simulator Management',
    'swift-package': 'Swift Package Manager',
    'ui-testing': 'UI Testing & Automation',
    utilities: 'Utilities',
  };

  return displayNames[workflowDir] || workflowDir;
}

/**
 * Get workflow description
 */
function getWorkflowDescription(workflowDir: string): string {
  const descriptions: Record<string, string> = {
    device: 'Physical device development, testing, and deployment',
    doctor: 'System health checks and environment validation',
    logging: 'Log capture and monitoring across platforms',
    macos: 'Native macOS application development and testing',
    'project-discovery': 'Project analysis and information gathering',
    'project-scaffolding': 'Create new projects from templates',
    simulator: 'Simulator-based development, testing, and deployment',
    'simulator-management': 'Simulator environment and configuration management',
    'swift-package': 'Swift Package development and testing',
    'ui-testing': 'Automated UI interaction and testing',
    utilities: 'General utility operations',
  };

  return descriptions[workflowDir] || `${workflowDir} related tools`;
}

/**
 * Perform static analysis of all tools in the project
 */
export async function getStaticToolAnalysis(): Promise<StaticAnalysisResult> {
  // Find all workflow directories
  const workflowDirs = fs
    .readdirSync(toolsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();

  // Find all tool files
  const files = await glob('**/*.ts', {
    cwd: toolsDir,
    ignore: [
      '**/__tests__/**',
      '**/index.ts',
      '**/*.test.ts',
      '**/lib/**',
      '**/shared/**',
      '**/*-processes.ts', // Process management utilities
      '**/*.deps.ts', // Dependency files
      '**/*-utils.ts', // Utility files
      '**/*-common.ts', // Common/shared code
      '**/*-types.ts', // Type definition files
    ],
    absolute: true,
  });

  const allTools: ToolInfo[] = [];
  const workflowMap = new Map<string, ToolInfo[]>();

  let canonicalCount = 0;
  let reExportCount = 0;

  // Initialize workflow map
  for (const workflowDir of workflowDirs) {
    workflowMap.set(workflowDir, []);
  }

  // Process each tool file
  for (const filePath of files) {
    const toolName = path.basename(filePath, '.ts');
    const workflowDir = path.basename(path.dirname(filePath));
    const relativePath = path.relative(projectRoot, filePath);

    const isReExport = isReExportFile(filePath);

    let description = '';
    let cliName: string | undefined;
    let originWorkflow: string | undefined;
    let stateful: boolean | undefined;

    if (!isReExport) {
      // Extract description from canonical tool using AST
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = createSourceFile(filePath, content, ScriptTarget.Latest, true);

        const metadata = extractToolMetadata(sourceFile);
        description = metadata.description;
        cliName = metadata.cliName;
        stateful = metadata.stateful;
        canonicalCount++;
      } catch (error) {
        throw new Error(`Failed to extract description from ${relativePath}: ${error}`);
      }
    } else {
      const reExportInfo = getReExportTargetInfo(filePath);
      if (!reExportInfo) {
        throw new Error(`Failed to resolve re-export target for ${relativePath}`);
      }

      originWorkflow = reExportInfo.workflow;
      try {
        const targetContent = fs.readFileSync(reExportInfo.filePath, 'utf-8');
        const targetSourceFile = createSourceFile(
          reExportInfo.filePath,
          targetContent,
          ScriptTarget.Latest,
          true,
        );
        const metadata = extractToolMetadata(targetSourceFile);
        description = metadata.description;
        cliName = metadata.cliName;
        stateful = metadata.stateful;
      } catch (error) {
        throw new Error(
          `Failed to extract description for re-export ${relativePath}: ${error as Error}`,
        );
      }
      reExportCount++;
    }

    const toolInfo: ToolInfo = {
      name: toolName,
      workflow: workflowDir,
      path: filePath,
      relativePath,
      description,
      cliName,
      originWorkflow,
      stateful,
      isCanonical: !isReExport,
    };

    allTools.push(toolInfo);

    const workflowTools = workflowMap.get(workflowDir);
    if (workflowTools) {
      workflowTools.push(toolInfo);
    }
  }

  // Build workflow information
  const workflows: WorkflowInfo[] = [];

  for (const workflowDir of workflowDirs) {
    const workflowTools = workflowMap.get(workflowDir) ?? [];
    const canonicalTools = workflowTools.filter((t) => t.isCanonical);
    const reExportTools = workflowTools.filter((t) => !t.isCanonical);

    // Try to get metadata from index.ts, fall back to hardcoded names/descriptions
    const metadata = await getWorkflowMetadata(workflowDir);

    const workflowInfo: WorkflowInfo = {
      name: workflowDir,
      displayName: metadata?.displayName ?? getWorkflowDisplayName(workflowDir),
      description: metadata?.description ?? getWorkflowDescription(workflowDir),
      tools: workflowTools.sort((a, b) => a.name.localeCompare(b.name)),
      toolCount: workflowTools.length,
      canonicalCount: canonicalTools.length,
      reExportCount: reExportTools.length,
    };

    workflows.push(workflowInfo);
  }

  const stats: AnalysisStats = {
    totalTools: allTools.length,
    canonicalTools: canonicalCount,
    reExportTools: reExportCount,
    workflowCount: workflows.length,
  };

  return {
    workflows: workflows.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    tools: allTools.sort((a, b) => a.name.localeCompare(b.name)),
    stats,
  };
}

// CLI support - if run directly, perform analysis and output results
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main(): Promise<void> {
    try {
      console.log('🔍 Performing static analysis...');
      const analysis = await getStaticToolAnalysis();

      console.log('\n📊 Analysis Results:');
      console.log(`   Workflows: ${analysis.stats.workflowCount}`);
      console.log(`   Total tools: ${analysis.stats.totalTools}`);
      console.log(`   Canonical tools: ${analysis.stats.canonicalTools}`);
      console.log(`   Re-export tools: ${analysis.stats.reExportTools}`);

      if (process.argv.includes('--json')) {
        console.log('\n' + JSON.stringify(analysis, null, 2));
      } else {
        console.log('\n📂 Workflows:');
        for (const workflow of analysis.workflows) {
          console.log(
            `   • ${workflow.displayName} (${workflow.canonicalCount} canonical, ${workflow.reExportCount} re-exports)`,
          );
        }
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  main();
}
