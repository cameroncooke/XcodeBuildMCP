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
export {
  processToolResponse,
  renderNextStep,
  renderNextStepsSection,
} from './next-steps-renderer.ts';

// Types
export type { ToolResponse, NextStep, OutputStyle } from '../../types/common.ts';
