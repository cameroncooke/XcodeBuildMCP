/**
 * Focused responses facade.
 * Prefer importing from 'utils/responses/index.js' instead of the legacy utils barrel.
 */
export { createTextResponse } from '../validation.js';
export {
  createErrorResponse,
  DependencyError,
  AxeError,
  SystemError,
  ValidationError,
} from '../errors.js';

// Types
export type { ToolResponse } from '../../types/common.js';
