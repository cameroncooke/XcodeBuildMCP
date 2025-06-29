/**
 * Screenshot tool plugin - Capture screenshots from iOS Simulator
 */
import {
  screenshotToolName,
  screenshotToolDescription,
  screenshotToolSchema,
  screenshotToolHandler,
} from '../../src/tools/screenshot/index.js';

export default {
  name: screenshotToolName,
  description: screenshotToolDescription,
  schema: screenshotToolSchema,
  handler: screenshotToolHandler,
};