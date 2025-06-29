/**
 * Primary implementation of get_sim_app_path_name_proj tool
 * Gets the app bundle path for a simulator by name using a project file
 */

import {
  getSimAppPathNameProjToolName,
  getSimAppPathNameProjToolDescription,
  getSimAppPathNameProjToolSchema,
  getSimAppPathNameProjToolHandler,
} from '../../src/tools/app-path/index.js';

export default {
  name: getSimAppPathNameProjToolName,
  description: getSimAppPathNameProjToolDescription,
  schema: getSimAppPathNameProjToolSchema,
  handler: getSimAppPathNameProjToolHandler,
};