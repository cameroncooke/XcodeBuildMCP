/**
 * Hardware Button Plugin
 * 
 * Press hardware buttons on iOS simulator including apple-pay, home, lock, side-button, and siri.
 * Supports optional duration parameter for extended button presses.
 */

import {
  buttonToolName,
  buttonToolDescription,
  buttonToolSchema,
  buttonToolHandler,
} from '../../src/tools/axe/index.js';

export default {
  name: buttonToolName,
  description: buttonToolDescription,
  schema: buttonToolSchema,
  handler: buttonToolHandler,
};