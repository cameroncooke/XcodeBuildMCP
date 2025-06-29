import {
  buildRunSimIdWsToolName,
  buildRunSimIdWsToolDescription,
  buildRunSimIdWsToolSchema,
  buildRunSimIdWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildRunSimIdWsToolName,
  description: buildRunSimIdWsToolDescription,
  schema: buildRunSimIdWsToolSchema,
  handler: buildRunSimIdWsToolHandler,
};