/**
 * Focused responses facade.
 * Prefer importing from 'utils/responses/index.js' instead of the legacy utils barrel.
 */
export { createTextResponse } from '../validation.ts';
export {
  createErrorResponse,
  DependencyError,
  AxeError,
  SystemError,
  ValidationError,
} from '../errors.ts';

// Types
export type { ToolResponse } from '../../types/common.ts';
