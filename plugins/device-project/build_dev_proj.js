import {
  buildDevProjName,
  buildDevProjDescription,
  buildDevProjSchema,
  buildDevProjHandler
} from '../../src/tools/build-ios-device/index.js';

export default {
  name: buildDevProjName,
  description: buildDevProjDescription,
  schema: buildDevProjSchema,
  handler: buildDevProjHandler,
};