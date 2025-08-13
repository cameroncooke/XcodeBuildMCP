/**
 * Schema Helper Utilities
 * 
 * Shared utility functions for schema validation and preprocessing.
 */

/**
 * Convert empty strings to undefined in an object (shallow transformation)
 * Used for preprocessing Zod schemas with optional fields
 * 
 * @param value - The value to process
 * @returns The processed value with empty strings converted to undefined
 */
export function nullifyEmptyStrings(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const v = copy[key];
      if (typeof v === 'string' && v.trim() === '') copy[key] = undefined;
    }
    return copy;
  }
  return value;
}