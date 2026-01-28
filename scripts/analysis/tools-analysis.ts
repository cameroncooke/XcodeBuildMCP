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

/**
 * Extract the description from a tool's default export using TypeScript AST
 */
function extractToolDescription(sourceFile: SourceFile): string {
  let description: string | null = null;

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
      // Found export default { ... }, now look for description property
      for (const property of objectExpression.properties) {
        if (
          isPropertyAssignment(property) &&
          isIdentifier(property.name) &&
          property.name.text === 'description'
        ) {
          // Extract the description value
          if (isStringLiteral(property.initializer)) {
            // This is the most common case - simple string literal
            description = property.initializer.text;
          } else if (
            isTemplateExpression(property.initializer) ||
            isNoSubstitutionTemplateLiteral(property.initializer)
          ) {
            // Handle template literals - get the raw text and clean it
            description = property.initializer.getFullText(sourceFile).trim();
            // Remove surrounding backticks
            if (description.startsWith('`') && description.endsWith('`')) {
              description = description.slice(1, -1);
            }
          } else {
            // Handle any other expression (multiline strings, computed values)
            const fullText = property.initializer.getFullText(sourceFile).trim();
            // This covers cases where the description spans multiple lines
            // Remove surrounding quotes and normalize whitespace
            let cleaned = fullText;
            if (
              (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
              (cleaned.startsWith("'") && cleaned.endsWith("'"))
            ) {
              cleaned = cleaned.slice(1, -1);
            }
            // Collapse multiple whitespaces and newlines into single spaces
            description = cleaned.replace(/\s+/g, ' ').trim();
          }
          return; // Found description, stop looking
        }
      }
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);

  if (description === null) {
    throw new Error('Could not extract description from tool export default object');
  }

  return description;
}

/**
 * Check if a file is a re-export by examining its content
 */
function isReExportFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Remove comments and empty lines, then check for re-export pattern
  // First remove multi-line comments
  const contentWithoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '');

  const cleanedLines = contentWithoutBlockComments
    .split('\n')
    .map((line) => {
      // Remove inline comments but preserve the code before them
      const codeBeforeComment = line.split('//')[0].trim();
      return codeBeforeComment;
    })
    .filter((line) => line.length > 0);

  // Should have exactly one line: export { default } from '...';
  if (cleanedLines.length !== 1) {
    return false;
  }

  const exportLine = cleanedLines[0];
  return /^export\s*{\s*default\s*}\s*from\s*['"][^'"]+['"];?\s*$/.test(exportLine);
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

                if (propertyName === 'name' && isStringLiteral(property.initializer)) {
                  workflowExport.name = property.initializer.text;
                } else if (
                  propertyName === 'description' &&
                  isStringLiteral(property.initializer)
                ) {
                  workflowExport.description = property.initializer.text;
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

    if (!isReExport) {
      // Extract description from canonical tool using AST
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = createSourceFile(filePath, content, ScriptTarget.Latest, true);

        description = extractToolDescription(sourceFile);
        canonicalCount++;
      } catch (error) {
        throw new Error(`Failed to extract description from ${relativePath}: ${error}`);
      }
    } else {
      description = '(Re-exported from shared workflow)';
      reExportCount++;
    }

    const toolInfo: ToolInfo = {
      name: toolName,
      workflow: workflowDir,
      path: filePath,
      relativePath,
      description,
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

/**
 * Get only canonical tools (excluding re-exports) for documentation generation
 */
export async function getCanonicalTools(): Promise<ToolInfo[]> {
  const analysis = await getStaticToolAnalysis();
  return analysis.tools.filter((tool) => tool.isCanonical);
}

/**
 * Get tools grouped by workflow for documentation generation
 */
export async function getToolsByWorkflow(): Promise<Map<string, ToolInfo[]>> {
  const analysis = await getStaticToolAnalysis();
  const workflowMap = new Map<string, ToolInfo[]>();

  for (const workflow of analysis.workflows) {
    // Only include canonical tools for documentation
    const canonicalTools = workflow.tools.filter((tool) => tool.isCanonical);
    if (canonicalTools.length > 0) {
      workflowMap.set(workflow.name, canonicalTools);
    }
  }

  return workflowMap;
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
