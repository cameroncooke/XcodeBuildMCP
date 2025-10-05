/**
 * Type-safe tool factory for XcodeBuildMCP
 *
 * This module provides a factory function to create MCP tool handlers that safely
 * convert from the generic Record<string, unknown> signature required by the MCP SDK
 * to strongly-typed parameters using runtime validation with Zod.
 *
 * This eliminates the need for unsafe type assertions while maintaining full
 * compatibility with the MCP SDK's tool handler signature requirements.
 */

import { z } from 'zod';
import { ToolResponse } from '../types/common.ts';
import type { CommandExecutor } from './execution/index.ts';
import { createErrorResponse } from './responses/index.ts';
import { sessionStore, type SessionDefaults } from './session-store.ts';

/**
 * Creates a type-safe tool handler that validates parameters at runtime
 * before passing them to the typed logic function.
 *
 * This is the ONLY safe way to cross the type boundary from the generic
 * MCP handler signature to our typed domain logic.
 *
 * @param schema - Zod schema for parameter validation
 * @param logicFunction - The typed logic function to execute
 * @param getExecutor - Function to get the command executor (must be provided)
 * @returns A handler function compatible with MCP SDK requirements
 */
export function createTypedTool<TParams>(
  schema: z.ZodType<TParams>,
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>,
  getExecutor: () => CommandExecutor,
) {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation - the ONLY safe way to cross the type boundary
      // This provides both compile-time and runtime type safety
      const validatedParams = schema.parse(args);

      // Now we have guaranteed type safety - no assertions needed!
      return await logicFunction(validatedParams, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors in a user-friendly way
        const errorMessages = error.errors.map((e) => {
          const path = e.path.length > 0 ? `${e.path.join('.')}` : 'root';
          return `${path}: ${e.message}`;
        });

        return createErrorResponse(
          'Parameter validation failed',
          `Invalid parameters:\n${errorMessages.join('\n')}`,
        );
      }

      // Re-throw unexpected errors (they'll be caught by the MCP framework)
      throw error;
    }
  };
}

export type SessionRequirement =
  | { allOf: (keyof SessionDefaults)[]; message?: string }
  | { oneOf: (keyof SessionDefaults)[]; message?: string };

function missingFromMerged(
  keys: (keyof SessionDefaults)[],
  merged: Record<string, unknown>,
): string[] {
  return keys.filter((k) => merged[k] == null);
}

export function createSessionAwareTool<TParams>(opts: {
  internalSchema: z.ZodType<TParams>;
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>;
  getExecutor: () => CommandExecutor;
  sessionKeys?: (keyof SessionDefaults)[];
  requirements?: SessionRequirement[];
  exclusivePairs?: (keyof SessionDefaults)[][]; // when args provide one side, drop conflicting session-default side(s)
}) {
  const {
    internalSchema,
    logicFunction,
    getExecutor,
    requirements = [],
    exclusivePairs = [],
  } = opts;

  return async (rawArgs: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Sanitize args: treat null/undefined as "not provided" so they don't override session defaults
      const sanitizedArgs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawArgs)) {
        if (v !== null && v !== undefined) sanitizedArgs[k] = v;
      }

      // Factory-level mutual exclusivity check: if user provides multiple explicit values
      // within an exclusive group, reject early even if tool schema doesn't enforce XOR.
      for (const pair of exclusivePairs) {
        const provided = pair.filter((k) => Object.prototype.hasOwnProperty.call(sanitizedArgs, k));
        if (provided.length >= 2) {
          return createErrorResponse(
            'Parameter validation failed',
            `Invalid parameters:\nMutually exclusive parameters provided: ${provided.join(
              ', ',
            )}. Provide only one.`,
          );
        }
      }

      // Start with session defaults merged with explicit args (args override session)
      const merged: Record<string, unknown> = { ...sessionStore.getAll(), ...sanitizedArgs };

      // Apply exclusive pair pruning: only when caller provided a concrete (non-null/undefined) value
      // for any key in the pair. When activated, drop other keys in the pair coming from session defaults.
      for (const pair of exclusivePairs) {
        const userProvidedConcrete = pair.some((k) =>
          Object.prototype.hasOwnProperty.call(sanitizedArgs, k),
        );
        if (!userProvidedConcrete) continue;

        for (const k of pair) {
          if (!Object.prototype.hasOwnProperty.call(sanitizedArgs, k) && k in merged) {
            delete merged[k];
          }
        }
      }

      for (const req of requirements) {
        if ('allOf' in req) {
          const missing = missingFromMerged(req.allOf, merged);
          if (missing.length > 0) {
            return createErrorResponse(
              'Missing required session defaults',
              `${req.message ?? `Required: ${req.allOf.join(', ')}`}\n` +
                `Set with: session-set-defaults { ${missing
                  .map((k) => `"${k}": "..."`)
                  .join(', ')} }`,
            );
          }
        } else if ('oneOf' in req) {
          const satisfied = req.oneOf.some((k) => merged[k] != null);
          if (!satisfied) {
            const options = req.oneOf.join(', ');
            const setHints = req.oneOf
              .map((k) => `session-set-defaults { "${k}": "..." }`)
              .join(' OR ');
            return createErrorResponse(
              'Missing required session defaults',
              `${req.message ?? `Provide one of: ${options}`}\nSet with: ${setHints}`,
            );
          }
        }
      }

      const validated = internalSchema.parse(merged);
      return await logicFunction(validated, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((e) => {
          const path = e.path.length > 0 ? `${e.path.join('.')}` : 'root';
          return `${path}: ${e.message}`;
        });

        return createErrorResponse(
          'Parameter validation failed',
          `Invalid parameters:\n${errorMessages.join('\n')}\nTip: set session defaults via session-set-defaults`,
        );
      }
      throw error;
    }
  };
}
