import {
  buildSimIdWsToolName,
  buildSimIdWsToolDescription,
  buildSimIdWsToolSchema,
  buildSimIdWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimIdWsToolName,
  description: buildSimIdWsToolDescription,
  schema: buildSimIdWsToolSchema,
  handler: buildSimIdWsToolHandler,
};