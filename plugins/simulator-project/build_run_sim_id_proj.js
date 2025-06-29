import {
  buildRunSimIdProjToolName,
  buildRunSimIdProjToolDescription,
  buildRunSimIdProjToolSchema,
  buildRunSimIdProjToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildRunSimIdProjToolName,
  description: buildRunSimIdProjToolDescription,
  schema: buildRunSimIdProjToolSchema,
  handler: buildRunSimIdProjToolHandler,
};