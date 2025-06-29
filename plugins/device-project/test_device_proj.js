import {
  testDeviceProjToolName,
  testDeviceProjToolDescription,
  testDeviceProjToolSchema,
  testDeviceProjToolHandler
} from '../../src/tools/test-ios-device/index.js';

export default {
  name: testDeviceProjToolName,
  description: testDeviceProjToolDescription,
  schema: testDeviceProjToolSchema,
  handler: testDeviceProjToolHandler,
};