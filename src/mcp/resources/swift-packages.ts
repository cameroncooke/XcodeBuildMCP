/**
 * Swift Packages Resource Plugin
 *
 * Provides access to running Swift Package processes through MCP resource system.
 * This resource reuses the existing swift_package_list tool logic to maintain consistency.
 */

import { log, getDefaultCommandExecutor, CommandExecutor } from '../../utils/index.js';
import { swift_package_listLogic } from '../tools/swift-package/swift_package_list.js';

export default {
  uri: 'xcodebuildmcp://swift-packages',
  name: 'swift-packages',
  description: 'Currently running Swift Package processes with their PIDs and execution status',
  mimeType: 'text/plain',
  async handler(
    uri: URL,
diff --git a/src/mcp/resources/swift-packages.ts b/src/mcp/resources/swift-packages.ts
index 1234567..89abcde 100644
--- a/src/mcp/resources/swift-packages.ts
+++ b/src/mcp/resources/swift-packages.ts
@@ -15,9 +15,9 @@ export class SwiftPackagesResource implements ResourceHandler {
   async handler(
     uri: URL,
-    _executor: CommandExecutor = getDefaultCommandExecutor(),
+    executor: CommandExecutor = getDefaultCommandExecutor(),
   ): Promise<{ contents: Array<{ text: string }> }> {
     try {
       log('info', 'Processing swift-packages resource request');
-
-      const result = await swift_package_listLogic({});
+      const result = await swift_package_listLogic({}, executor);

       return { contents: result };
     } catch (err) {

      if (result.isError) {
        const errorText = result.content[0]?.text;
        throw new Error(
          typeof errorText === 'string' ? errorText : 'Failed to retrieve Swift Package data',
        );
      }

      // Combine all content text parts into a single response
      const combinedText = result.content
        .map((content) => (typeof content.text === 'string' ? content.text : ''))
        .join('\n');

      return {
        contents: [
          {
            text: combinedText || 'No Swift Package process data available',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error in swift-packages resource handler: ${errorMessage}`);

      return {
        contents: [
          {
            text: `Error retrieving Swift Package data: ${errorMessage}`,
          },
        ],
      };
    }
  },
};
