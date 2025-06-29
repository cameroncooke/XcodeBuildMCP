/**
 * Touch Plugin - Perform touch down/up events at specific coordinates
 * 
 * Allows precise touch control with optional down/up states and timing delays.
 * Validates that at least one of down or up is specified.
 */

import {
  touchToolName,
  touchToolDescription,
  touchToolSchema,
  touchToolHandler,
} from '../../src/tools/axe/index.js';

export default {
  name: touchToolName,
  description: touchToolDescription,
  schema: touchToolSchema,
  handler: touchToolHandler,
};