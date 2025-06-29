/**
 * Screenshot plugin - Re-exports screenshot tool for plugin architecture
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