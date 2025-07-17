#!/usr/bin/env node

/**
 * Direct JSON-RPC test script for scaffold_macos_project
 * This replicates the exact calls that Claude makes through the MCP client
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

// JSON-RPC message for calling scaffold_macos_project
const testCall = {
  jsonrpc: "2.0",
  id: randomUUID(),
  method: "tools/call",
  params: {
    name: "scaffold_macos_project",
    arguments: {
      projectName: "DirectTest",
      outputPath: "/tmp/direct-test"
    }
  }
};

console.log('🧪 Testing scaffold_macos_project via direct JSON-RPC call');
console.log('📤 Sending request:');
console.log(JSON.stringify(testCall, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

// Start the MCP server directly
const server = spawn('node', ['/Volumes/Developer/XcodeBuildMCP/build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON-RPC responses
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line.trim());
        if (response.id === testCall.id) {
          console.log('📥 Received response:');
          console.log(JSON.stringify(response, null, 2));
          server.kill();
          process.exit(0);
        }
      } catch (e) {
        // Ignore parse errors for non-JSON lines
      }
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('❌ Server stderr:', data.toString());
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

// Send the initialize request first
const initRequest = {
  jsonrpc: "2.0",
  id: randomUUID(),
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
};

// Send initialize first, then the actual test call
setTimeout(() => {
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  
  setTimeout(() => {
    server.stdin.write(JSON.stringify(testCall) + '\n');
  }, 100);
}, 100);

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test timed out after 10 seconds');
  server.kill();
  process.exit(1);
}, 10000);