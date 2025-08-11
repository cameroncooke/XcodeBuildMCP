import { z } from 'zod';
import { getDefaultCommandExecutor } from '../../../utils/index.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { stop_app_simLogic } from './stop_app_sim.js';

// Define schema for name-based stop
const stopAppSimNameSchema = z.object({
  simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16')"),
  bundleId: z.string().describe("Bundle identifier of the app to stop (e.g., 'com.example.MyApp')"),
});

// Use z.infer for type safety
type StopAppSimNameParams = z.infer<typeof stopAppSimNameSchema>;

export default {
  name: 'stop_app_sim_name',
  description:
    'Stops an app running in an iOS simulator by simulator name. IMPORTANT: You MUST provide both the simulatorName and bundleId parameters.',
  schema: stopAppSimNameSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    stopAppSimNameSchema,
    async (params: StopAppSimNameParams) => stop_app_simLogic(params, getDefaultCommandExecutor()),
    getDefaultCommandExecutor,
  ),
};
