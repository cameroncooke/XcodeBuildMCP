import {
  startDeviceLogCapToolName,
  startDeviceLogCapToolDescription,
  startDeviceLogCapToolSchema,
  startDeviceLogCapToolHandler
} from '../../src/tools/device-log/index.js';

export default {
  name: startDeviceLogCapToolName,
  description: startDeviceLogCapToolDescription,
  schema: startDeviceLogCapToolSchema,
  handler: startDeviceLogCapToolHandler,
};