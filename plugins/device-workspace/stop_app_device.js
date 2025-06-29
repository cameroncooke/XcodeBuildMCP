import {
  stopAppDeviceToolName,
  stopAppDeviceToolDescription,
  stopAppDeviceToolSchema,
  stopAppDeviceToolHandler,
} from '../../src/tools/device/index.js';

export default {
  name: stopAppDeviceToolName,
  description: stopAppDeviceToolDescription,
  schema: stopAppDeviceToolSchema,
  handler: stopAppDeviceToolHandler,
};