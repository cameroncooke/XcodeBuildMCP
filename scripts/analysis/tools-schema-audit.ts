#!/usr/bin/env node

/**
 * Tool schema audit analysis for XcodeBuildMCP.
 *
 * Static analysis of tool files to extract schema argument names and their
 * `.describe()` strings without loading tool modules at runtime.
 */

import {
  createSourceFile,
  forEachChild,
  isAsExpression,
  isCallExpression,
  isExportAssignment,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isShorthandPropertyAssignment,
  isSpreadAssignment,
  isStringLiteral,
  isTemplateExpression,
  isVariableDeclaration,
  isVariableStatement,
  type Expression,
  type Node,
  type ObjectLiteralExpression,
  ScriptTarget,
  type SourceFile,
} from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const toolsDir = path.join(projectRoot, 'src', 'mcp', 'tools');

export interface SchemaAuditArgument {
  name: string;
  description: string | null;
}

export interface SchemaAuditTool {
  name: string;
  description: string | null;
  args: SchemaAuditArgument[];
  relativePath: string;
}

type SchemaShape = Map<string, string | null>;

function isReExportFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  const contentWithoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const cleanedLines = contentWithoutBlockComments
    .split('\n')
    .map((line) => line.split('//')[0].trim())
    .filter((line) => line.length > 0);

  if (cleanedLines.length !== 1) {
    return false;
  }

  const exportLine = cleanedLines[0];
  return /^export\s*{\s*default\s*}\s*from\s*['"][^'"]+['"];?\s*$/.test(exportLine);
}

function extractStringLiteral(
  expression: Expression | undefined,
  sourceFile: SourceFile,
): string | null {
  if (!expression) {
    return null;
  }

  if (isStringLiteral(expression)) {
    return expression.text.trim();
  }

  if (isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text.trim();
  }

  if (isTemplateExpression(expression)) {
    const raw = expression.getFullText(sourceFile).trim();
    if (raw.startsWith('`') && raw.endsWith('`')) {
      return raw.slice(1, -1).trim();
    }
    return raw;
  }

  return null;
}

function getPropertyName(node: Node): string | null {
  if (isIdentifier(node)) {
    return node.text;
  }
  if (isStringLiteral(node)) {
    return node.text;
  }
  return null;
}

function extractDescribeCall(expression: Expression, sourceFile: SourceFile): string | null {
  if (isCallExpression(expression)) {
    if (
      isPropertyAccessExpression(expression.expression) &&
      expression.expression.name.text === 'describe'
    ) {
      return extractStringLiteral(expression.arguments[0], sourceFile);
    }

    const fromCallee = extractDescribeCall(expression.expression, sourceFile);
    if (fromCallee) {
      return fromCallee;
    }
  }

  if (isPropertyAccessExpression(expression)) {
    return extractDescribeCall(expression.expression, sourceFile);
  }

  if (isParenthesizedExpression(expression)) {
    return extractDescribeCall(expression.expression, sourceFile);
  }

  if (isAsExpression(expression)) {
    return extractDescribeCall(expression.expression, sourceFile);
  }

  return null;
}

function resolveObjectLiteralShape(
  objectLiteral: ObjectLiteralExpression,
  context: SchemaResolveContext,
): SchemaShape {
  const shape: SchemaShape = new Map();

  for (const property of objectLiteral.properties) {
    if (isPropertyAssignment(property)) {
      const name = getPropertyName(property.name);
      if (!name) {
        continue;
      }

      const description = extractDescribeCall(property.initializer, context.sourceFile);
      shape.set(name, description ?? null);
      continue;
    }

    if (isShorthandPropertyAssignment(property)) {
      const name = property.name.text;
      if (!name) {
        continue;
      }

      shape.set(name, null);
      continue;
    }

    if (isSpreadAssignment(property)) {
      const spreadShape = resolveSchemaShape(property.expression, context);
      for (const [key, value] of spreadShape.entries()) {
        shape.set(key, value);
      }
    }
  }

  return shape;
}

function isZodCall(expression: Expression, name: string): boolean {
  if (!isCallExpression(expression)) {
    return false;
  }
  if (!isPropertyAccessExpression(expression.expression)) {
    return false;
  }
  if (!isIdentifier(expression.expression.expression)) {
    return false;
  }

  return expression.expression.expression.text === 'z' && expression.expression.name.text === name;
}

function resolveOmitKeys(expression: Expression): Set<string> {
  if (isAsExpression(expression)) {
    return resolveOmitKeys(expression.expression);
  }

  if (!isObjectLiteralExpression(expression)) {
    return new Set();
  }

  const keys = new Set<string>();
  for (const property of expression.properties) {
    if (isPropertyAssignment(property)) {
      const name = getPropertyName(property.name);
      if (name) {
        keys.add(name);
      }
    }
  }
  return keys;
}

function resolveSchemaShape(expression: Expression, context: SchemaResolveContext): SchemaShape {
  if (isParenthesizedExpression(expression)) {
    return resolveSchemaShape(expression.expression, context);
  }

  if (isAsExpression(expression)) {
    return resolveSchemaShape(expression.expression, context);
  }

  if (isIdentifier(expression)) {
    const name = expression.text;
    if (context.memo.has(name)) {
      return context.memo.get(name) ?? new Map();
    }
    if (context.resolving.has(name)) {
      return new Map();
    }

    const initializer = context.variableInitializers.get(name);
    if (!initializer) {
      return new Map();
    }

    context.resolving.add(name);
    const resolved = resolveSchemaShape(initializer, context);
    context.memo.set(name, resolved);
    context.resolving.delete(name);
    return resolved;
  }

  if (isObjectLiteralExpression(expression)) {
    return resolveObjectLiteralShape(expression, context);
  }

  if (isPropertyAccessExpression(expression) && expression.name.text === 'shape') {
    return resolveSchemaShape(expression.expression, context);
  }

  if (isCallExpression(expression)) {
    if (isZodCall(expression, 'object') || isZodCall(expression, 'strictObject')) {
      const firstArg = expression.arguments[0];
      if (firstArg) {
        return resolveSchemaShape(firstArg, context);
      }
    }

    if (isZodCall(expression, 'preprocess')) {
      const schemaArg = expression.arguments[1];
      if (schemaArg) {
        return resolveSchemaShape(schemaArg, context);
      }
    }

    if (isIdentifier(expression.expression) && expression.expression.text === 'getSessionAwareToolSchemaShape') {
      const firstArg = expression.arguments[0];
      if (firstArg && isObjectLiteralExpression(firstArg)) {
        let sessionAware: Expression | null = null;
        let legacy: Expression | null = null;

        for (const property of firstArg.properties) {
          if (isPropertyAssignment(property) && isIdentifier(property.name)) {
            if (property.name.text === 'sessionAware') {
              sessionAware = property.initializer;
            } else if (property.name.text === 'legacy') {
              legacy = property.initializer;
            }
          }
        }

        if (sessionAware) {
          return resolveSchemaShape(sessionAware, context);
        }
        if (legacy) {
          return resolveSchemaShape(legacy, context);
        }
      }
    }

    if (isPropertyAccessExpression(expression.expression)) {
      const operation = expression.expression.name.text;
      const baseExpression = expression.expression.expression;
      const baseShape = resolveSchemaShape(baseExpression, context);

      if (operation === 'omit') {
        const omitKeys = resolveOmitKeys(expression.arguments[0]);
        for (const key of omitKeys) {
          baseShape.delete(key);
        }
        return baseShape;
      }

      if (operation === 'extend') {
        const extensionArg = expression.arguments[0];
        if (extensionArg) {
          const extensionShape = resolveSchemaShape(extensionArg, context);
          for (const [key, value] of extensionShape.entries()) {
            baseShape.set(key, value);
          }
        }
        return baseShape;
      }

      if (operation === 'passthrough') {
        return baseShape;
      }
    }
  }

  return new Map();
}

interface SchemaResolveContext {
  sourceFile: SourceFile;
  variableInitializers: Map<string, Expression>;
  memo: Map<string, SchemaShape>;
  resolving: Set<string>;
}

function getExportDefaultObject(sourceFile: SourceFile): ObjectLiteralExpression | null {
  let exportObject: ObjectLiteralExpression | null = null;

  function visit(node: Node): void {
    if (isExportAssignment(node) && !node.isExportEquals) {
      if (isObjectLiteralExpression(node.expression)) {
        exportObject = node.expression;
        return;
      }
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);
  return exportObject;
}

function extractToolMetadata(
  sourceFile: SourceFile,
  variableInitializers: Map<string, Expression>,
  fallbackName: string,
): { name: string; description: string | null; schemaExpression: Expression } {
  const exportObject = getExportDefaultObject(sourceFile);
  if (!exportObject) {
    throw new Error('Export default object not found.');
  }

  let name: string | null = null;
  let description: string | null = null;
  let schemaExpression: Expression | null = null;

  for (const property of exportObject.properties) {
    if (!isPropertyAssignment(property) || !isIdentifier(property.name)) {
      continue;
    }

    if (property.name.text === 'name') {
      name = extractStringLiteral(property.initializer, sourceFile);
    } else if (property.name.text === 'description') {
      description = extractStringLiteral(property.initializer, sourceFile);
    } else if (property.name.text === 'schema') {
      schemaExpression = property.initializer;
    }
  }

  if (!schemaExpression) {
    throw new Error('Tool schema not found.');
  }

  return {
    name: name ?? fallbackName,
    description,
    schemaExpression,
  };
}

function collectVariableInitializers(sourceFile: SourceFile): Map<string, Expression> {
  const map = new Map<string, Expression>();

  function visit(node: Node): void {
    if (isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          isVariableDeclaration(declaration) &&
          isIdentifier(declaration.name) &&
          declaration.initializer
        ) {
          map.set(declaration.name.text, declaration.initializer);
        }
      }
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);
  return map;
}

export async function getSchemaAuditTools(): Promise<SchemaAuditTool[]> {
  const files = await glob('**/*.ts', {
    cwd: toolsDir,
    ignore: [
      '**/__tests__/**',
      '**/index.ts',
      '**/*.test.ts',
      '**/lib/**',
      '**/*-processes.ts',
      '**/*.deps.ts',
      '**/*-utils.ts',
      '**/*-common.ts',
      '**/*-types.ts',
    ],
    absolute: true,
  });

  const tools: SchemaAuditTool[] = [];

  for (const filePath of files) {
    if (isReExportFile(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = createSourceFile(filePath, content, ScriptTarget.Latest, true);
    const variableInitializers = collectVariableInitializers(sourceFile);

    const toolNameFallback = path.basename(filePath, '.ts');
    const { name, description, schemaExpression } = extractToolMetadata(
      sourceFile,
      variableInitializers,
      toolNameFallback,
    );

    const context: SchemaResolveContext = {
      sourceFile,
      variableInitializers,
      memo: new Map(),
      resolving: new Set(),
    };

    const shape = resolveSchemaShape(schemaExpression, context);
    const args = Array.from(shape.entries())
      .map(([argName, argDescription]) => ({
        name: argName,
        description: argDescription,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    tools.push({
      name,
      description,
      args,
      relativePath: path.relative(projectRoot, filePath),
    });
  }

  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  async function main(): Promise<void> {
    const tools = await getSchemaAuditTools();
    console.log(JSON.stringify(tools, null, 2));
  }

  main().catch((error) => {
    console.error('Schema audit failed:', error);
    process.exit(1);
  });
}
