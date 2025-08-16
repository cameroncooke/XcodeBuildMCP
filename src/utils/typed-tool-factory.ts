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
