import {
  installAppDeviceToolName,
  installAppDeviceToolDescription,
  installAppDeviceToolSchema,
  installAppDeviceToolHandler
} from '../../src/tools/device/index.js';

export default {
  name: installAppDeviceToolName,
  description: installAppDeviceToolDescription,
  schema: installAppDeviceToolSchema,
  handler: installAppDeviceToolHandler,
};