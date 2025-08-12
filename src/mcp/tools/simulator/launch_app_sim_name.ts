import { z } from 'zod';
import { getDefaultCommandExecutor } from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { launch_app_simLogic } from './launch_app_sim.js';

// Define schema for name-based launch
const launchAppSimNameSchema = z.object({
  simulatorName: z.string().describe("Name of the simulator to use (e.g., 'iPhone 16')"),
  bundleId: z
    .string()
    .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
});

// Use z.infer for type safety
type LaunchAppSimNameParams = z.infer<typeof launchAppSimNameSchema>;

export default {
  name: 'launch_app_sim_name',
  description:
    "Launches an app in an iOS simulator by simulator name. If simulator window isn't visible, use open_sim() first. IMPORTANT: You MUST provide both the simulatorName and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim_name({ simulatorName: 'iPhone 16', bundleId: 'com.example.MyApp' })",
  schema: launchAppSimNameSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    launchAppSimNameSchema,
    async (params: LaunchAppSimNameParams) =>
      launch_app_simLogic(params, getDefaultCommandExecutor()),
    getDefaultCommandExecutor,
  ),
};
