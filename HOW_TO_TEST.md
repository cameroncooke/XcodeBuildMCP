# Running XcodeBuildMCP Progress Update Tests

This document provides instructions for testing the new progress update system for XcodeBuildMCP.

## Prerequisites

Make sure you have:
1. Node.js installed (v16 or newer)
2. Built the latest version of the XcodeBuildMCP project

To build the project:
```bash
npm run build
```

## Running the Test

The test script provides a user-friendly way to see progress updates in action:

1. Open a terminal in the project root directory
2. Run the test script:
   ```bash
   node test-progress.mjs
   ```
3. Watch the terminal for color-coded progress messages
   - Progress updates are highlighted based on completion percentage
   - New operations are clearly marked with headers
   - The test automatically runs a clean and build operation on the example project
   - Test automatically exits after completion (about 15 seconds)

### Example Output

```
===================================================
 XcodeBuildMCP Progress Update Test 
===================================================

Testing with project: ./example_projects/macOS/MCPTest.xcodeproj, scheme: MCPTest

Waiting for server initialization...
[2025-05-04T20:37:43.532Z] [INFO] Server initialized (version 1.1.0)
[2025-05-04T20:37:43.534Z] [INFO] Progress service initialized

===== EXECUTING CLEAN OPERATION =====

--- New Operation Started: 550e8400-e29b-41d4-a716-446655440000 ---
>> Operation [550e8400-e29b-41d4-a716-446655440000]: RUNNING - Starting clean operation... (0%)
>> Operation [550e8400-e29b-41d4-a716-446655440000]: RUNNING - Cleaning build files... (50%)
>> Operation [550e8400-e29b-41d4-a716-446655440000]: COMPLETED - Clean completed successfully (100%)

===== EXECUTING BUILD OPERATION =====

--- New Operation Started: a67890bc-d12e-4f56-ga7b-8927ea1cde0b ---
>> Operation [a67890bc-d12e-4f56-ga7b-8927ea1cde0b]: RUNNING - Starting Xcode build... (0%)
>> Operation [a67890bc-d12e-4f56-ga7b-8927ea1cde0b]: RUNNING - CompileSwift phase... (25%)
>> Operation [a67890bc-d12e-4f56-ga7b-8927ea1cde0b]: RUNNING - Processing file 10 of 20 (50%)
>> Operation [a67890bc-d12e-4f56-ga7b-8927ea1cde0b]: RUNNING - Linking phase... (75%)
>> Operation [a67890bc-d12e-4f56-ga7b-8927ea1cde0b]: COMPLETED - Build completed successfully (100%)

===== TEST COMPLETE =====
```

## Testing Individual Operations

If you want to test with your own projects or specific operations:

1. Start the server in one terminal:
   ```bash
   node build/index.js
   ```

2. In a second terminal, use the MCP CLI tool to call specific operations:
   ```bash
   npx @modelcontextprotocol/cli call-tool --server-command="node build/index.js" macos_build_project '{"projectPath": "./path/to/your/project.xcodeproj", "scheme": "YourScheme"}'
   ```

3. Watch for progress updates in the server terminal

## Troubleshooting

If you don't see progress updates:

1. Make sure you've built the latest version:
   ```bash
   npm run build
   ```

2. Check that the project exists and is accessible:
   ```bash
   ls -la example_projects/macOS/MCPTest.xcodeproj
   ```

3. Verify that Xcode command line tools are installed:
   ```bash
   xcode-select --install
   ```

4. Try modifying the test script to use a different project if needed:
   - Edit `test-progress.mjs`
   - Update the `PROJECT_PATH` and `SCHEME` constants
