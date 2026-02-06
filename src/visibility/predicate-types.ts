/**
 * Predicate context and type definitions for visibility filtering.
 * Predicates are named functions that determine tool/workflow visibility
 * based on runtime context.
 */

import type { ResolvedRuntimeConfig } from '../utils/config-store.ts';

/**
 * Runtime kind for predicate evaluation.
 */
export type RuntimeKind = 'cli' | 'mcp' | 'daemon';

/**
 * Context passed to predicate functions for visibility evaluation.
 */
export interface PredicateContext {
  /** Current runtime mode */
  runtime: RuntimeKind;

  /** Resolved runtime configuration */
  config: ResolvedRuntimeConfig;

  /** Whether running under Xcode agent environment */
  runningUnderXcode: boolean;

  /** Whether Xcode Tools bridge is active (MCP only; false otherwise) */
  xcodeToolsActive: boolean;

  /** Whether the Xcode Tools bridge binary is available on this system */
  xcodeToolsAvailable?: boolean;
}

/**
 * Predicate function type.
 * Returns true if the tool/workflow should be visible, false to hide.
 */
export type PredicateFn = (ctx: PredicateContext) => boolean;
