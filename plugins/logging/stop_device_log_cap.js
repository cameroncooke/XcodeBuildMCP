import {
  stopDeviceLogCapToolName,
  stopDeviceLogCapToolDescription,
  stopDeviceLogCapToolSchema,
  stopDeviceLogCapToolHandler
} from '../../src/tools/device-log/index.js';

export default {
  name: stopDeviceLogCapToolName,
  description: stopDeviceLogCapToolDescription,
  schema: stopDeviceLogCapToolSchema,
  handler: stopDeviceLogCapToolHandler,
};