/**
 * Plugin: get_sim_app_path_name_ws
 * Gets the app bundle path for a simulator by name using a workspace
 * Target: plugins/simulator-workspace/
 */

import {
  getSimAppPathNameWsToolName,
  getSimAppPathNameWsToolDescription,
  getSimAppPathNameWsToolSchema,
  getSimAppPathNameWsToolHandler,
} from '../../src/tools/app-path/index.js';

export default {
  name: getSimAppPathNameWsToolName,
  description: getSimAppPathNameWsToolDescription,
  schema: getSimAppPathNameWsToolSchema,
  handler: getSimAppPathNameWsToolHandler,
};