import {
  testDeviceWsToolName,
  testDeviceWsToolDescription,
  testDeviceWsToolSchema,
  testDeviceWsToolHandler
} from '../../src/tools/test-ios-device/index.js';

export default {
  name: testDeviceWsToolName,
  description: testDeviceWsToolDescription,
  schema: testDeviceWsToolSchema,
  handler: testDeviceWsToolHandler,
};