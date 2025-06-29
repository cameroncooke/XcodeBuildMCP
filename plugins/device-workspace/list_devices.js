import {
  listDevicesToolName,
  listDevicesToolDescription,
  listDevicesToolSchema,
  listDevicesToolHandler
} from '../../src/tools/device/index.js';

export default {
  name: listDevicesToolName,
  description: listDevicesToolDescription,
  schema: listDevicesToolSchema,
  handler: listDevicesToolHandler,
};