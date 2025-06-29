/**
 * Plugin: get_mac_app_path_proj
 * Gets the app bundle path for a macOS application using a project file
 */

import {
  getMacAppPathProjToolName,
  getMacAppPathProjToolDescription,
  getMacAppPathProjToolSchema,
  getMacAppPathProjToolHandler,
} from '../../src/tools/app-path/index.js';

export default {
  name: getMacAppPathProjToolName,
  description: getMacAppPathProjToolDescription,
  schema: getMacAppPathProjToolSchema,
  handler: getMacAppPathProjToolHandler,
};