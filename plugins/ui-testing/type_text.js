/**
 * UI Testing Plugin: Type Text
 * 
 * Types text into the iOS Simulator using keyboard input.
 * Supports standard US keyboard characters.
 */

import {
  typeTextToolName,
  typeTextToolDescription,
  typeTextToolSchema,
  typeTextToolHandler,
} from '../../src/tools/axe/index.js';

export default {
  name: typeTextToolName,
  description: typeTextToolDescription,
  schema: typeTextToolSchema,
  handler: typeTextToolHandler,
};