import {
  launchAppDeviceToolName,
  launchAppDeviceToolDescription,
  launchAppDeviceToolSchema,
  launchAppDeviceToolHandler,
} from '../../src/tools/device/index.js';

export default {
  name: launchAppDeviceToolName,
  description: launchAppDeviceToolDescription,
  schema: launchAppDeviceToolSchema,
  handler: launchAppDeviceToolHandler,
};