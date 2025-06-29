/**
 * Plugin: get_device_app_path_ws
 * Gets the app bundle path for a physical device application using a workspace
 */

import {
  getDeviceAppPathWsToolName,
  getDeviceAppPathWsToolDescription,
  getDeviceAppPathWsToolSchema,
  getDeviceAppPathWsToolHandler,
} from '../../src/tools/app-path/index.js';

export default {
  name: getDeviceAppPathWsToolName,
  description: getDeviceAppPathWsToolDescription,
  schema: getDeviceAppPathWsToolSchema,
  handler: getDeviceAppPathWsToolHandler,
};