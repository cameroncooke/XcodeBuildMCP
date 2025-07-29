#!/usr/bin/env node

/**
 * XcodeBuildMCP Tool Summary CLI
 * 
 * A command-line tool that provides comprehensive information about available
 * tools and resources in the XcodeBuildMCP server.
 * 
 * Usage:
 *   node scripts/tool-summary.js [options]
 * 
 * Options:
 *   --list-tools, -t        List all tool names
 *   --list-resources, -r    List all resource URIs
 *   --runtime-only          Show only tools enabled at runtime (dynamic mode)
 *   --help, -h              Show this help message
 * 
 * Examples:
 *   node scripts/tool-summary.js                    # Show summary counts only
 *   node scripts/tool-summary.js --list-tools       # Show summary + tool names
 *   node scripts/tool-summary.js --list-resources   # Show summary + resource URIs
 *   node scripts/tool-summary.js -t -r              # Show summary + tools + resources
 *   node scripts/tool-summary.js --runtime-only     # Show only runtime-enabled tools
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  listTools: args.includes('--list-tools') || args.includes('-t'),
  listResources: args.includes('--list-resources') || args.includes('-r'),
  runtimeOnly: args.includes('--runtime-only'),
  help: args.includes('--help') || args.includes('-h')
};

// Help text
if (options.help) {
  console.log(`
XcodeBuildMCP Tool Summary CLI

A command-line tool that provides comprehensive information about available
tools and resources in the XcodeBuildMCP server.

Usage:
  node scripts/tool-summary.js [options]

Options:
  --list-tools, -t        List all tool names
  --list-resources, -r    List all resource URIs  
  --runtime-only          Show only tools enabled at runtime (dynamic mode)
  --help, -h              Show this help message

Examples:
  node scripts/tool-summary.js                    # Show summary counts only
  node scripts/tool-summary.js --list-tools       # Show summary + tool names
  node scripts/tool-summary.js --list-resources   # Show summary + resource URIs
  node scripts/tool-summary.js -t -r              # Show summary + tools + resources
  node scripts/tool-summary.js --runtime-only     # Show only runtime-enabled tools

Environment Variables:
  XCODEBUILDMCP_DYNAMIC_TOOLS=true   Enable dynamic tool discovery mode
  `);
  process.exit(0);
}

/**
 * Execute reloaderoo command and parse JSON response
 * @param {string[]} reloaderooArgs - Arguments to pass to reloaderoo
 * @returns {Promise<Object>} Parsed JSON response
 */
async function executeReloaderoo(reloaderooArgs) {
  const buildPath = path.resolve(__dirname, '..', 'build', 'index.js');
  
  // Use temp file - this is the most reliable approach for large JSON output
  const tempFile = `/tmp/reloaderoo-output-${Date.now()}.json`;
  const command = `npx reloaderoo@latest inspect ${reloaderooArgs.join(' ')} -- node "${buildPath}"`;
  
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', `${command} > "${tempFile}"`], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      try {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}`));
          return;
        }

        // Read the complete file
        const content = fs.readFileSync(tempFile, 'utf8');
        
        // Remove stderr log lines and find JSON
        const lines = content.split('\n');
        const cleanLines = [];
        
        // First pass: remove all log lines
        for (const line of lines) {
          // Skip log lines that start with timestamp or contain [INFO], [DEBUG], etc.
          if (line.match(/^\[\d{4}-\d{2}-\d{2}T/) || line.includes('[INFO]') || line.includes('[DEBUG]') || line.includes('[ERROR]')) {
            continue;
          }
          
          const trimmed = line.trim();
          if (trimmed) {
            cleanLines.push(line);
          }
        }
        
        // Find the start of JSON
        let jsonStartIndex = -1;
        for (let i = 0; i < cleanLines.length; i++) {
          if (cleanLines[i].trim().startsWith('{')) {
            jsonStartIndex = i;
            break;
          }
        }
        
        if (jsonStartIndex === -1) {
          reject(new Error(`No JSON response found in output.\nOutput: ${content.substring(0, 500)}...`));
          return;
        }
        
        // Take all lines from JSON start onwards and join them
        const jsonText = cleanLines.slice(jsonStartIndex).join('\n');
        const response = JSON.parse(jsonText);
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse JSON response: ${error.message}`));
      } finally {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn process: ${error.message}`));
    });
  });
}

/**
 * Get server information including tool and resource counts
 * @returns {Promise<Object>} Server info with tools and resources
 */
async function getServerInfo() {
  try {
    console.log('🔍 Gathering server information...\n');
    
    // Get tool list using executeReloaderoo function
    const toolsResponse = await executeReloaderoo(['list-tools']);
    
    let tools = [];
    let toolCount = 0;
    
    if (toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
      toolCount = toolsResponse.tools.length;
      console.log(`Found ${toolCount} tools in response`);
      
      // Extract tool names if requested
      if (options.listTools) {
        tools = toolsResponse.tools.map(tool => ({ name: tool.name }));
      }
    } else {
      console.log('No tools found in response - unexpected format');
      console.log('Response keys:', Object.keys(toolsResponse));
    }
    
    // Get resource list dynamically
    const resourcesResponse = await executeReloaderoo(['list-resources']);
    
    let resources = [];
    let resourceCount = 0;
    
    if (resourcesResponse.resources && Array.isArray(resourcesResponse.resources)) {
      resourceCount = resourcesResponse.resources.length;
      console.log(`Found ${resourceCount} resources in response`);
      
      // Extract resource info
      resources = resourcesResponse.resources.map(resource => ({
        uri: resource.uri,
        description: resource.title || resource.description || 'No description available'
      }));
    } else {
      console.log('No resources found in response - unexpected format');
      console.log('Resource response keys:', Object.keys(resourcesResponse));
    }
    
    return {
      tools: tools,
      resources: resources,
      serverInfo: { name: 'XcodeBuildMCP', version: '1.2.0-beta.3' },
      dynamicMode: process.env.XCODEBUILDMCP_DYNAMIC_TOOLS === 'true',
      toolCount: toolCount,
      resourceCount: resourceCount
    };
  } catch (error) {
    console.error('❌ Error gathering server information:', error.message);
    process.exit(1);
  }
}

/**
 * Display the tool and resource summary
 * @param {Object} data - Server data containing tools, resources, and server info
 */
function displaySummary(data) {
  const { tools, resources, serverInfo, dynamicMode } = data;
  
  console.log('📊 XcodeBuildMCP Tool & Resource Summary');
  console.log('═'.repeat(50));
  
  // Mode information
  console.log(`🔧 Server Mode: ${dynamicMode ? 'Dynamic' : 'Static'}`);
  if (dynamicMode) {
    console.log('   ℹ️  Only enabled workflow tools are shown in dynamic mode');
  }
  console.log();
  
  // Counts
  console.log('📈 Summary Counts:');
  console.log(`   Tools:     ${data.toolCount || tools.length}`);
  console.log(`   Resources: ${data.resourceCount || resources.length}`);
  console.log(`   Total:     ${(data.toolCount || tools.length) + (data.resourceCount || resources.length)}`);
  console.log();
  
  // Server information
  if (serverInfo.name && serverInfo.version) {
    console.log('🖥️  Server Information:');
    console.log(`   Name:    ${serverInfo.name}`);
    console.log(`   Version: ${serverInfo.version}`);
    console.log();
  }
  
  // Runtime filtering note
  if (options.runtimeOnly && !dynamicMode) {
    console.log('⚠️  Note: --runtime-only has no effect in static mode (all tools are enabled)');
    console.log();
  }
}

/**
 * Display tool names in alphabetical order
 * @param {Array} tools - Array of tool objects
 */
function displayTools(tools) {
  if (!options.listTools) return;
  
  console.log('🛠️  Available Tools:');
  console.log('─'.repeat(30));
  
  if (tools.length === 0) {
    console.log('   No tools available');
  } else {
    // Display tools in the order returned by the server
    tools.forEach(tool => {
      console.log(`   • ${tool.name}`);
    });
  }
  
  console.log();
}

/**
 * Display resource URIs
 * @param {Array} resources - Array of resource objects
 */
function displayResources(resources) {
  if (!options.listResources) return;
  
  console.log('📚 Available Resources:');
  console.log('─'.repeat(30));
  
  if (resources.length === 0) {
    console.log('   No resources available');
  } else {
    resources.forEach(resource => {
      console.log(`   • ${resource.uri}`);
      if (resource.description) {
        console.log(`     ${resource.description}`);
      }
    });
  }
  
  console.log();
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Check if build exists
    const buildPath = path.resolve(__dirname, '..', 'build', 'index.js');
    
    if (!fs.existsSync(buildPath)) {
      console.error('❌ Build not found. Please run "npm run build" first.');
      process.exit(1);
    }
    
    // Get server data
    const data = await getServerInfo();
    
    // Display information
    displaySummary(data);
    displayTools(data.tools);
    displayResources(data.resources);
    
    // Final summary for runtime-enabled tools in dynamic mode
    if (options.runtimeOnly && data.dynamicMode) {
      console.log('ℹ️  Runtime Summary (Dynamic Mode):');
      console.log(`   Currently enabled tools: ${data.tools.length}`);
      console.log('   Use discover_tools to enable additional workflow groups');
      console.log();
    }
    
    console.log('✅ Tool summary complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the tool
main();