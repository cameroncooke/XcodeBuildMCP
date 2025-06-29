/**
 * Plugin wrapper for stop_app_sim tool
 * Stops an app running in an iOS simulator
 */

import {
  stopAppSimToolName,
  stopAppSimToolDescription,
  stopAppSimToolSchema,
  stopAppSimToolHandler,
} from '../../src/tools/simulator/index.js';

export default {
  name: stopAppSimToolName,
  description: stopAppSimToolDescription,
  schema: stopAppSimToolSchema,
  handler: stopAppSimToolHandler,
};