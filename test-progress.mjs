// XcodeBuildMCP Progress Update Test
// This script tests the progress update functionality
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

// Color formatting for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  highlight: '\x1b[1;36m'
};

// Project path configuration
const PROJECT_PATH = './example_projects/macOS/MCPTest.xcodeproj';
const SCHEME = 'MCPTest';

// Print header
console.log(`${colors.cyan}===================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bright} XcodeBuildMCP Progress Update Test ${colors.reset}`);
console.log(`${colors.cyan}===================================================${colors.reset}`);
console.log(`\nTesting with project: ${colors.yellow}${PROJECT_PATH}${colors.reset}, scheme: ${colors.yellow}${SCHEME}${colors.reset}`);
console.log(`\n${colors.dim}Progress updates will appear below with operation IDs and percentages${colors.reset}`);

// Create our requests
const cleanRequest = JSON.stringify({
  jsonrpc: '2.0',
  id: 'clean-request',
  method: 'tools/call',
  params: {
    name: 'clean_project',
    arguments: {
      projectPath: PROJECT_PATH,
      scheme: SCHEME
    }
  }
}) + '\n';

const buildRequest = JSON.stringify({
  jsonrpc: '2.0',
  id: 'build-request',
  method: 'tools/call',
  params: {
    name: 'macos_build_project',
    arguments: {
      projectPath: PROJECT_PATH,
      scheme: SCHEME
    }
  }
}) + '\n';

// Start the server with stdio configuration that captures both stdout and stderr
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'] // We'll manually process both stdout and stderr
});

// Forward server stdout to our process stdout
server.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
});

// Track operation IDs to highlight progress messages
const operationIds = new Set();

// Parse and highlight server output
server.stderr?.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Extract operation IDs and highlight progress updates
    const operationMatch = line.match(/Operation \[([a-f0-9-]+)\]/);
    
    if (operationMatch) {
      const opId = operationMatch[1];
      
      // Register new operations when first seen
      if (!operationIds.has(opId)) {
        operationIds.add(opId);
        console.log(`\n${colors.bright}${colors.green}--- New Operation Started: ${opId} ---${colors.reset}`);
      }
      
      // Highlight progress messages
      if (line.includes('RUNNING') || line.includes('COMPLETED') || line.includes('FAILED')) {
        // Extract progress percentage if present
        const percentMatch = line.match(/\((\d+)%\)/);
        const percent = percentMatch ? parseInt(percentMatch[1]) : null;
        
        // Format based on status and percentage
        if (line.includes('COMPLETED')) {
          console.log(`${colors.green}>> ${line}${colors.reset}`);
        } else if (line.includes('FAILED')) {
          console.log(`${colors.red}>> ${line}${colors.reset}`);
        } else if (percent !== null) {
          // Color gradient based on progress percentage
          if (percent < 25) {
            console.log(`${colors.yellow}>> ${line}${colors.reset}`);
          } else if (percent < 50) {
            console.log(`${colors.cyan}>> ${line}${colors.reset}`);
          } else if (percent < 75) {
            console.log(`${colors.blue}>> ${line}${colors.reset}`);
          } else {
            console.log(`${colors.magenta}>> ${line}${colors.reset}`);
          }
        } else {
          console.log(`${colors.yellow}>> ${line}${colors.reset}`);
        }
      } else {
        console.log(line);
      }
    } else {
      console.log(line);
    }
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Test interrupted, stopping server...${colors.reset}`);
  server.kill();
  process.exit(0);
});

// Wait for server to initialize
console.log(`\n${colors.blue}Waiting for server initialization...${colors.reset}`);
await wait(2000);

// Execute the clean operation first
console.log(`\n${colors.green}===== EXECUTING CLEAN OPERATION =====${colors.reset}`);
server.stdin.write(cleanRequest);

// Wait for clean to complete
await wait(3000);

// Execute the build operation
console.log(`\n${colors.green}===== EXECUTING BUILD OPERATION =====${colors.reset}`);
server.stdin.write(buildRequest);

// Wait for build to complete - increased from 10s to 20s
await wait(20000);

// Test complete
console.log(`\n${colors.bright}${colors.green}===== TEST COMPLETE =====${colors.reset}`);
server.kill();
process.exit(0);
