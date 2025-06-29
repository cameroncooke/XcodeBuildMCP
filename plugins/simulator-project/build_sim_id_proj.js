import {
  buildSimIdProjToolName,
  buildSimIdProjToolDescription,
  buildSimIdProjToolSchema,
  buildSimIdProjToolHandler,
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimIdProjToolName,
  description: buildSimIdProjToolDescription,
  schema: buildSimIdProjToolSchema,
  handler: buildSimIdProjToolHandler,
};