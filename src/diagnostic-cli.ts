#!/usr/bin/env node

/**
 * XcodeBuildMCP Diagnostic CLI
 *
 * This standalone script runs the diagnostic tool and outputs the results
 * to the console. It's designed to be run directly via npx or mise.
 */

import { version } from './version.js';

// Set the debug environment variable
process.env.XCODEBUILDMCP_DEBUG = 'true';

async function runDiagnostic(): Promise<void> {
  try {
    // Using console.error to avoid linting issues as it's allowed by the project's linting rules
    console.error(`Running XcodeBuildMCP Diagnostic Tool (v${version})...`);
    console.error('Collecting system information and checking dependencies...\n');

    // Import the diagnostic plugin
    const diagnosticPlugin = (await import('../plugins/diagnostics/diagnostic.js')) as any;
    const runDiagnosticTool = diagnosticPlugin.default?.handler;

    // Run the diagnostic tool (plugin handler expects params object)
    const result = await runDiagnosticTool({});

    // Output the diagnostic information
    if (result.content && result.content.length > 0) {
      const textContent = result.content.find((item: { type: string }) => item.type === 'text');
      if (textContent && 'text' in textContent) {
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
