import {
  buildSimNameProjToolName,
  buildSimNameProjToolDescription,
  buildSimNameProjToolSchema,
  buildSimNameProjToolHandler,
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimNameProjToolName,
  description: buildSimNameProjToolDescription,
  schema: buildSimNameProjToolSchema,
  handler: buildSimNameProjToolHandler,
};