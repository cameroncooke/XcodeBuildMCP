#!/usr/bin/env node

/**
 * XcodeBuildMCP Diagnostic CLI
 *
 * This standalone script runs the diagnostic tool and outputs the results
 * to the console. It's designed to be run directly via npx or mise.
 */

import { version } from './version.js';
import type { ToolResponse } from './types/common.js';

// Set the debug environment variable
process.env.XCODEBUILDMCP_DEBUG = 'true';

async function runDiagnostic(): Promise<void> {
  try {
    // Using console.error to avoid linting issues as it's allowed by the project's linting rules
    console.error(`Running XcodeBuildMCP Diagnostic Tool (v${version})...`);
    console.error('Collecting system information and checking dependencies...\n');

    // Import the diagnostic plugin from the correct path
    const diagnosticPlugin = await import('./mcp/tools/diagnostics/diagnostic.js');
    const runDiagnosticTool = diagnosticPlugin.default?.handler;

    if (!runDiagnosticTool) {
      console.error('Error: Diagnostic tool handler not found');
      process.exit(1);
    }

    // Run the diagnostic tool (plugin handler expects params object)
    const result = (await runDiagnosticTool({})) as ToolResponse;

    // Output the diagnostic information
    if (result.content && result.content.length > 0) {
      const textContent = result.content.find((item) => item.type === 'text');
      if (textContent && textContent.type === 'text') {
        // eslint-disable-next-line no-console
        console.log(textContent.text);
      } else {
        console.error('Error: Unexpected diagnostic result format');
      }
    } else {
      console.error('Error: No diagnostic information returned');
    }

    console.error('\nDiagnostic complete. Please include this output when reporting issues.');
  } catch (error) {
    console.error('Error running diagnostic:', error);
    process.exit(1);
  }
}

// Run the diagnostic
runDiagnostic().catch((error) => {
  console.error('Unhandled exception:', error);
  process.exit(1);
});
