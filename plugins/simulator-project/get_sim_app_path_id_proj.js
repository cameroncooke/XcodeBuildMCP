/**
 * Plugin: get_sim_app_path_id_proj
 * Gets the app bundle path for a simulator by UUID using a project file
 */

import {
  getSimAppPathIdProjToolName,
  getSimAppPathIdProjToolDescription,
  getSimAppPathIdProjToolSchema,
  getSimAppPathIdProjToolHandler,
} from '../../src/tools/app-path/index.js';

export default {
  name: getSimAppPathIdProjToolName,
  description: getSimAppPathIdProjToolDescription,
  schema: getSimAppPathIdProjToolSchema,
  handler: getSimAppPathIdProjToolHandler,
};