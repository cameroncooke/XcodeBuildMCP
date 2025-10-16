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
import { sessionStore } from './session-store.ts';

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

/**
 * Converts Zod validation errors to user-friendly ToolResponse with session hints.
 */
function createSessionAwareError(zodError: z.ZodError): ToolResponse {
  const errorMessages = zodError.errors.map((err) => {
    const field = err.path.join('.');
    let message = `${field || 'root'}: ${err.message}`;

    // Add session-set-defaults hint for missing required fields
    if (err.code === 'invalid_type' && err.received === 'undefined') {
      message += `\n  Tip: Set via session-set-defaults({ "${field}": "value" })`;
    }

    return message;
  });

  return createErrorResponse(
    'Parameter validation failed',
    `Invalid parameters:\n${errorMessages.join('\n\n')}\n\nTip: set session defaults via session-set-defaults or provide explicitly`,
  );
}

/**
 * Creates a session-aware tool that automatically merges session defaults with explicit parameters.
 * Explicit parameters always take precedence over session defaults.
 *
 * @param schema - Zod schema for validation (should include all validation rules via .refine())
 * @param logicFunction - Tool logic function
 * @param getExecutor - Function to get command executor
 * @param exclusivePairs - Optional array of mutually exclusive parameter pairs (e.g., [['projectPath', 'workspacePath']])
 *                         When an explicit parameter is provided, its counterpart is removed from session defaults
 */
export function createSessionAwareTool<TParams>(
  schema: z.ZodType<TParams>,
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>,
  getExecutor: () => CommandExecutor,
  exclusivePairs?: Array<[string, string]>,
): (args: Record<string, unknown>) => Promise<ToolResponse> {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Filter out null/undefined from args to avoid overriding session defaults
      const cleanedArgs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== null && value !== undefined) {
          cleanedArgs[key] = value;
        }
      }

      // Get session defaults as mutable record for pruning
      const sessionDefaults: Record<string, unknown> = { ...sessionStore.getAll() };

      // Prune conflicting session defaults when explicit args provided
      // This ensures "explicit overrides session" for XOR fields
      if (exclusivePairs) {
        for (const [field1, field2] of exclusivePairs) {
          if (cleanedArgs[field1] !== undefined && sessionDefaults[field2] !== undefined) {
            delete sessionDefaults[field2];
          }
          if (cleanedArgs[field2] !== undefined && sessionDefaults[field1] !== undefined) {
            delete sessionDefaults[field1];
          }
        }
      }

      // Merge: explicit args override session defaults
      const merged = { ...sessionDefaults, ...cleanedArgs };

      // Let Zod handle all validation (including XOR constraints)
      const validated = schema.parse(merged);

      return await logicFunction(validated, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createSessionAwareError(error);
      }
      // Don't re-throw - convert all errors to ToolResponse
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Unexpected error occurred', errorMessage);
    }
  };
}
