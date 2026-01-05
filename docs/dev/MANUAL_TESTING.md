# XcodeBuildMCP Manual Testing Guidelines

This document provides comprehensive guidelines for manual black-box testing of XcodeBuildMCP using Reloaderoo inspect commands. This is the authoritative guide for validating all tools through the Model Context Protocol interface.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Black Box Testing via Reloaderoo](#black-box-testing-via-reloaderoo)
3. [Testing Psychology & Bias Prevention](#testing-psychology--bias-prevention)
4. [Tool Dependency Graph Testing Strategy](#tool-dependency-graph-testing-strategy)
5. [Prerequisites](#prerequisites)
6. [Step-by-Step Testing Process](#step-by-step-testing-process)
7. [Error Testing](#error-testing)
8. [Testing Report Generation](#testing-report-generation)
9. [Troubleshooting](#troubleshooting)

## Testing Philosophy

### 🚨 CRITICAL: THOROUGHNESS OVER EFFICIENCY - NO SHORTCUTS ALLOWED

**ABSOLUTE PRINCIPLE: EVERY TOOL MUST BE TESTED INDIVIDUALLY**

**🚨 MANDATORY TESTING SCOPE - NO EXCEPTIONS:**
- **EVERY SINGLE TOOL** - All tools must be tested individually, one by one
- **NO REPRESENTATIVE SAMPLING** - Testing similar tools does NOT validate other tools
- **NO PATTERN RECOGNITION SHORTCUTS** - Similar-looking tools may have different behaviors
- **NO EFFICIENCY OPTIMIZATIONS** - Thoroughness is more important than speed
- **NO TIME CONSTRAINTS** - This is a long-running task with no deadline pressure

**❌ FORBIDDEN EFFICIENCY SHORTCUTS:**
- **NEVER** assume testing `build_sim_id_proj` validates `build_sim_name_proj`
- **NEVER** skip tools because they "look similar" to tested ones
- **NEVER** use representative sampling instead of complete coverage
- **NEVER** stop testing due to time concerns or perceived redundancy
- **NEVER** group tools together for batch testing
- **NEVER** make assumptions about untested tools based on tested patterns

**✅ REQUIRED COMPREHENSIVE APPROACH:**
1. **Individual Tool Testing**: Each tool gets its own dedicated test execution
2. **Complete Documentation**: Every tool result must be recorded, regardless of outcome
3. **Systematic Progress**: Use TodoWrite to track every single tool as tested/untested
4. **Failure Documentation**: Test tools that cannot work and mark them as failed/blocked
5. **No Assumptions**: Treat each tool as potentially unique requiring individual validation

**TESTING COMPLETENESS VALIDATION:**
- **Start Count**: Record exact number of tools discovered using `npm run tools`
- **End Count**: Verify same number of tools have been individually tested
- **Missing Tools = Testing Failure**: If any tools remain untested, the testing is incomplete
- **TodoWrite Tracking**: Every tool must appear in todo list and be marked completed

## Black Box Testing via Reloaderoo

### 🚨 CRITICAL: Black Box Testing via Reloaderoo Inspect

**DEFINITION: Black Box Testing**
Black Box Testing means testing ONLY through external interfaces without any knowledge of internal implementation. For XcodeBuildMCP, this means testing exclusively through the Model Context Protocol (MCP) interface using Reloaderoo as the MCP client.

**🚨 MANDATORY: RELOADEROO INSPECT IS THE ONLY ALLOWED TESTING METHOD**

**ABSOLUTE TESTING RULES - NO EXCEPTIONS:**

1. **✅ ONLY ALLOWED: Reloaderoo Inspect Commands**
   - `npx reloaderoo@latest inspect call-tool "TOOL_NAME" --params 'JSON' -- node build/index.js`
   - `npx reloaderoo@latest inspect list-tools -- node build/index.js`
   - `npx reloaderoo@latest inspect read-resource "URI" -- node build/index.js`
   - `npx reloaderoo@latest inspect server-info -- node build/index.js`
   - `npx reloaderoo@latest inspect ping -- node build/index.js`

2. **❌ COMPLETELY FORBIDDEN ACTIONS:**
   - **NEVER** call `mcp__XcodeBuildMCP__tool_name()` functions directly
   - **NEVER** use MCP server tools as if they were native functions
   - **NEVER** access internal server functionality
   - **NEVER** read source code to understand how tools work
   - **NEVER** examine implementation files during testing
   - **NEVER** diagnose internal server issues or registration problems
   - **NEVER** suggest code fixes or implementation changes

3. **🚨 CRITICAL VIOLATION EXAMPLES:**
   ```typescript
   // ❌ FORBIDDEN - Direct MCP tool calls
   await mcp__XcodeBuildMCP__list_devices();
   await mcp__XcodeBuildMCP__build_sim_id_proj({ ... });
   
   // ❌ FORBIDDEN - Using tools as native functions
   const devices = await list_devices();
   const result = await doctor();
   
   // ✅ CORRECT - Only through Reloaderoo inspect
   npx reloaderoo@latest inspect call-tool "list_devices" --params '{}' -- node build/index.js
   npx reloaderoo@latest inspect call-tool "doctor" --params '{}' -- node build/index.js
   ```

**WHY RELOADEROO INSPECT IS MANDATORY:**
- **Higher Fidelity**: Provides clear input/output visibility for each tool call
- **Real-world Simulation**: Tests exactly how MCP clients interact with the server
- **Interface Validation**: Ensures MCP protocol compliance and proper JSON formatting
- **Black Box Enforcement**: Prevents accidental access to internal implementation details
- **Clean State**: Each tool call runs with a fresh MCP server instance, preventing cross-contamination

**IMPORTANT: STATEFUL TOOL LIMITATIONS**

**Reloaderoo Inspect Behavior:**
Reloaderoo starts a fresh MCP server instance for each individual tool call and terminates it immediately after the response. This ensures:
- ✅ **Clean Testing Environment**: No state contamination between tool calls
- ✅ **Isolated Testing**: Each tool test is independent and repeatable
- ✅ **Real-world Accuracy**: Simulates how most MCP clients interact with servers

**Expected False Negatives:**
Some tools rely on in-memory state within the MCP server and will fail when tested via Reloaderoo inspect. These failures are **expected and acceptable** as false negatives:

- **`swift_package_stop`** - Requires in-memory process tracking from `swift_package_run`
- **`stop_app_device`** - Requires in-memory process tracking from `launch_app_device`  
- **`stop_app_sim`** - Requires in-memory process tracking from `launch_app_sim`
- **`stop_device_log_cap`** - Requires in-memory session tracking from `start_device_log_cap`
- **`stop_sim_log_cap`** - Requires in-memory session tracking from `start_sim_log_cap`
- **`stop_mac_app`** - Requires in-memory process tracking from `launch_mac_app`

**Testing Protocol for Stateful Tools:**
1. **Test the tool anyway** - Execute the Reloaderoo inspect command
2. **Expect failure** - Tool will likely fail due to missing state
3. **Mark as false negative** - Document the failure as expected due to stateful limitations
4. **Continue testing** - Do not attempt to fix or investigate the failure
5. **Report as finding** - Note in testing report that stateful tools failed as expected

**COMPLETE COVERAGE REQUIREMENTS:**
- ✅ **Test ALL tools individually** - No exceptions, every tool gets manual verification
- ✅ **Follow dependency graphs** - Test tools in correct order based on data dependencies
- ✅ **Capture key outputs** - Record UUIDs, paths, schemes needed by dependent tools
- ✅ **Test real workflows** - Complete end-to-end workflows from discovery to execution
- ✅ **Use tool-summary.js script** - Accurate tool/resource counting and discovery
- ✅ **Document all observations** - Record exactly what you see via testing
- ✅ **Report discrepancies as findings** - Note unexpected results without investigation

**MANDATORY INDIVIDUAL TOOL TESTING PROTOCOL:**

**Step 1: Create Complete Tool Inventory**
```bash
# Use the official tool summary script to get accurate tool count and list
npm run tools > /tmp/summary_output.txt
TOTAL_TOOLS=$(grep "Tools:" /tmp/summary_output.txt | awk '{print $2}')
echo "TOTAL TOOLS TO TEST: $TOTAL_TOOLS"

# Generate detailed tool list and extract tool names
npm run tools:list > /tmp/tools_detailed.txt
grep "^   • " /tmp/tools_detailed.txt | sed 's/^   • //' > /tmp/tool_names.txt
```

**Step 2: Create TodoWrite Task List for Every Tool**
```bash
# Create individual todo items for each tool discovered
# Use the actual tool count from step 1
# Example for first few tools:
# 1. [ ] Test tool: doctor  
# 2. [ ] Test tool: list_devices
# 3. [ ] Test tool: list_sims
# ... (continue for ALL $TOTAL_TOOLS tools)
```

**Step 3: Test Each Tool Individually**
For EVERY tool in the list:
```bash
# Test each tool individually - NO BATCHING
npx reloaderoo@latest inspect call-tool "TOOL_NAME" --params 'APPROPRIATE_PARAMS' -- node build/index.js

# Mark tool as completed in TodoWrite IMMEDIATELY after testing
# Record result (success/failure/blocked) for each tool
```

**Step 4: Validate Complete Coverage**
```bash
# Verify all tools tested
COMPLETED_TOOLS=$(count completed todo items)
if [ $COMPLETED_TOOLS -ne $TOTAL_TOOLS ]; then
    echo "ERROR: Testing incomplete. $COMPLETED_TOOLS/$TOTAL_TOOLS tested"
    exit 1
fi
```

**CRITICAL: NO TOOL LEFT UNTESTED**
- **Every tool name from the JSON list must be individually tested**
- **Every tool must have a TodoWrite entry that gets marked completed**
- **Tools that fail due to missing parameters should be tested anyway and marked as blocked**
- **Tools that require setup (like running processes) should be tested and documented as requiring dependencies**
- **NO ASSUMPTIONS**: Test tools even if they seem redundant or similar to others

**BLACK BOX TESTING ENFORCEMENT:**
- ✅ **Test only through Reloaderoo MCP interface** - Simulates real-world MCP client usage
- ✅ **Use task lists** - Track progress with TodoWrite tool for every single tool
- ✅ **Tick off each tool** - Mark completed in task list after manual verification
- ✅ **Manual oversight** - Human verification of each tool's input and output
- ❌ **Never examine source code** - No reading implementation files during testing
- ❌ **Never diagnose internal issues** - No investigation of build processes or tool registration
- ❌ **Never suggest implementation fixes** - Report issues as findings, don't solve them
- ❌ **Never use scripts for tool testing** - Each tool must be manually executed and verified

## Testing Psychology & Bias Prevention

**COMMON ANTI-PATTERNS TO AVOID:**

**1. Efficiency Bias (FORBIDDEN)**
- **Symptom**: "These tools look similar, I'll test one to validate the others"
- **Correction**: Every tool is unique and must be tested individually
- **Enforcement**: Count tools at start, verify same count tested at end

**2. Pattern Recognition Override (FORBIDDEN)**  
- **Symptom**: "I see the pattern, the rest will work the same way"
- **Correction**: Patterns may hide edge cases, bugs, or different implementations
- **Enforcement**: No assumptions allowed, test every tool regardless of apparent similarity

**3. Time Pressure Shortcuts (FORBIDDEN)**
- **Symptom**: "This is taking too long, let me speed up by sampling"
- **Correction**: This is explicitly a long-running task with no time constraints
- **Enforcement**: Thoroughness is the ONLY priority, efficiency is irrelevant

**4. False Confidence (FORBIDDEN)**
- **Symptom**: "The architecture is solid, so all tools must work"
- **Correction**: Architecture validation does not guarantee individual tool functionality
- **Enforcement**: Test tools to discover actual issues, not to confirm assumptions

**MANDATORY MINDSET:**
- **Every tool is potentially broken** until individually tested
- **Every tool may have unique edge cases** not covered by similar tools
- **Every tool deserves individual attention** regardless of apparent redundancy
- **Testing completion means EVERY tool tested**, not "enough tools to validate patterns"
- **The goal is discovering problems**, not confirming everything works

**TESTING COMPLETENESS CHECKLIST:**
- [ ] Generated complete tool list using `npm run tools:list`
- [ ] Created TodoWrite entry for every single tool
- [ ] Tested every tool individually via Reloaderoo inspect
- [ ] Marked every tool as completed in TodoWrite
- [ ] Verified tool count: tested_count == total_count
- [ ] Documented all results, including failures and blocked tools
- [ ] Created final report covering ALL tools, not just successful ones

## Tool Dependency Graph Testing Strategy

**CRITICAL: Tools must be tested in dependency order:**

1. **Foundation Tools** (provide data for other tools):
   - `doctor` - System info
   - `list_devices` - Device UUIDs
   - `list_sims` - Simulator UUIDs  
   - `discover_projs` - Project/workspace paths

2. **Discovery Tools** (provide metadata for build tools):
   - `list_schemes` - Scheme names
   - `show_build_settings` - Build settings

3. **Build Tools** (create artifacts for install tools):
   - `build_*` tools - Create app bundles
   - `get_*_app_path_*` tools - Locate built app bundles
   - `get_*_bundle_id` tools - Extract bundle IDs

4. **Installation Tools** (depend on built artifacts):
   - `install_app_*` tools - Install built apps
   - `launch_app_*` tools - Launch installed apps

5. **Testing Tools** (depend on projects/schemes):
   - `test_*` tools - Run test suites

6. **UI Automation Tools** (depend on running apps):
   - `describe_ui`, `screenshot`, `tap`, etc.

**MANDATORY: Record Key Outputs**

Must capture and document these values for dependent tools:
- **Device UUIDs** from `list_devices`
- **Simulator UUIDs** from `list_sims`
- **Project/workspace paths** from `discover_projs`
- **Scheme names** from `list_schems_*`
- **App bundle paths** from `get_*_app_path_*`
- **Bundle IDs** from `get_*_bundle_id`

## Prerequisites

1. **Build the server**: `npm run build`
2. **Install jq**: `brew install jq` (required for JSON parsing)
3. **System Requirements**: macOS with Xcode installed, connected devices/simulators optional
4. **AXe video capture (optional)**: run `npm run bundle:axe` before using `record_sim_video` in local tests (not required for unit tests)

## Step-by-Step Testing Process

**Note**: All tool and resource discovery now uses the official `tool-summary.js` script (available as `npm run tools`, `npm run tools:list`, and `npm run tools:all`) instead of direct reloaderoo calls. This ensures accurate counts and lists without hardcoded values.

### Step 1: Programmatic Discovery and Official Testing Lists

#### Generate Official Tool and Resource Lists using tool-summary.js

```bash
# Use the official tool summary script to get accurate counts and lists
npm run tools > /tmp/summary_output.txt

# Extract tool and resource counts from summary
TOOL_COUNT=$(grep "Tools:" /tmp/summary_output.txt | awk '{print $2}')
RESOURCE_COUNT=$(grep "Resources:" /tmp/summary_output.txt | awk '{print $2}')
echo "Official tool count: $TOOL_COUNT"
echo "Official resource count: $RESOURCE_COUNT"

# Generate detailed tool list for testing checklist
npm run tools:list > /tmp/tools_detailed.txt

# Extract tool names from the detailed output
grep "^   • " /tmp/tools_detailed.txt | sed 's/^   • //' > /tmp/tool_names.txt
echo "Tool names saved to /tmp/tool_names.txt"

# Generate detailed resource list for testing checklist  
npm run tools:all > /tmp/tools_and_resources.txt

# Extract resource URIs from the detailed output
sed -n '/📚 Available Resources:/,/✅ Tool summary complete!/p' /tmp/tools_and_resources.txt | grep "^   • " | sed 's/^   • //' | cut -d' ' -f1 > /tmp/resource_uris.txt
echo "Resource URIs saved to /tmp/resource_uris.txt"
```

#### Create Tool Testing Checklist

```bash
# Generate markdown checklist from actual tool list
echo "# Official Tool Testing Checklist" > /tmp/tool_testing_checklist.md
echo "" >> /tmp/tool_testing_checklist.md
echo "Total Tools: $TOOL_COUNT" >> /tmp/tool_testing_checklist.md
echo "" >> /tmp/tool_testing_checklist.md

# Add each tool as unchecked item
while IFS= read -r tool_name; do
    echo "- [ ] $tool_name" >> /tmp/tool_testing_checklist.md
done < /tmp/tool_names.txt

echo "Tool testing checklist created at /tmp/tool_testing_checklist.md"
```

#### Create Resource Testing Checklist

```bash
# Generate markdown checklist from actual resource list
echo "# Official Resource Testing Checklist" > /tmp/resource_testing_checklist.md
echo "" >> /tmp/resource_testing_checklist.md
echo "Total Resources: $RESOURCE_COUNT" >> /tmp/resource_testing_checklist.md
echo "" >> /tmp/resource_testing_checklist.md

# Add each resource as unchecked item
while IFS= read -r resource_uri; do
    echo "- [ ] $resource_uri" >> /tmp/resource_testing_checklist.md
done < /tmp/resource_uris.txt

echo "Resource testing checklist created at /tmp/resource_testing_checklist.md"
```

### Step 2: Tool Schema Discovery for Parameter Testing

#### Extract Tool Schema Information

```bash
# Get schema for specific tool to understand required parameters
TOOL_NAME="list_devices"
jq --arg tool "$TOOL_NAME" '.tools[] | select(.name == $tool) | .inputSchema' /tmp/tools.json

# Get tool description for usage guidance
jq --arg tool "$TOOL_NAME" '.tools[] | select(.name == $tool) | .description' /tmp/tools.json

# Generate parameter template for tool testing
jq --arg tool "$TOOL_NAME" '.tools[] | select(.name == $tool) | .inputSchema.properties // {}' /tmp/tools.json
```

#### Batch Schema Extraction

```bash
# Create schema reference file for all tools
echo "# Tool Schema Reference" > /tmp/tool_schemas.md
echo "" >> /tmp/tool_schemas.md

while IFS= read -r tool_name; do
    echo "## $tool_name" >> /tmp/tool_schemas.md
    echo "" >> /tmp/tool_schemas.md
    
    # Get description
    description=$(jq -r --arg tool "$tool_name" '.tools[] | select(.name == $tool) | .description' /tmp/tools.json)
    echo "**Description:** $description" >> /tmp/tool_schemas.md
    echo "" >> /tmp/tool_schemas.md
    
    # Get required parameters
    required=$(jq -r --arg tool "$tool_name" '.tools[] | select(.name == $tool) | .inputSchema.required // [] | join(", ")' /tmp/tools.json)
    if [ "$required" != "" ]; then
        echo "**Required Parameters:** $required" >> /tmp/tool_schemas.md
    else
        echo "**Required Parameters:** None" >> /tmp/tool_schemas.md
    fi
    echo "" >> /tmp/tool_schemas.md
    
    # Get all parameters
    echo "**All Parameters:**" >> /tmp/tool_schemas.md
    jq --arg tool "$tool_name" '.tools[] | select(.name == $tool) | .inputSchema.properties // {} | keys[]' /tmp/tools.json | while read param; do
        echo "- $param" >> /tmp/tool_schemas.md
    done
    echo "" >> /tmp/tool_schemas.md
    
done < /tmp/tool_names.txt

echo "Tool schema reference created at /tmp/tool_schemas.md"
```

### Step 3: Manual Tool-by-Tool Testing

#### 🚨 CRITICAL: STEP-BY-STEP BLACK BOX TESTING PROCESS

**ABSOLUTE RULE: ALL TESTING MUST BE DONE MANUALLY, ONE TOOL AT A TIME USING RELOADEROO INSPECT**

**SYSTEMATIC TESTING PROCESS:**

1. **Create TodoWrite Task List**
   - Add all tools (from `npm run tools` count) to task list before starting
   - Mark each tool as "pending" initially
   - Update status to "in_progress" when testing begins
   - Mark "completed" only after manual verification

2. **Test Each Tool Individually**
   - Execute ONLY via `npx reloaderoo@latest inspect call-tool "TOOL_NAME" --params 'JSON' -- node build/index.js`
   - Wait for complete response before proceeding to next tool
   - Read and verify each tool's output manually
   - Record key outputs (UUIDs, paths, schemes) for dependent tools

3. **Manual Verification Requirements**
   - ✅ **Read each response** - Manually verify tool output makes sense
   - ✅ **Check for errors** - Identify any tool failures or unexpected responses  
   - ✅ **Record UUIDs/paths** - Save outputs needed for dependent tools
   - ✅ **Update task list** - Mark each tool complete after verification
   - ✅ **Document issues** - Record any problems found during testing

4. **FORBIDDEN SHORTCUTS:**
   - ❌ **NO SCRIPTS** - Scripts hide what's happening and prevent proper verification
   - ❌ **NO AUTOMATION** - Every tool call must be manually executed and verified
   - ❌ **NO BATCHING** - Cannot test multiple tools simultaneously
   - ❌ **NO MCP DIRECT CALLS** - Only Reloaderoo inspect commands allowed

#### Phase 1: Infrastructure Validation

**Manual Commands (execute individually):**

```bash
# Test server connectivity
npx reloaderoo@latest inspect ping -- node build/index.js

# Get server information  
npx reloaderoo@latest inspect server-info -- node build/index.js

# Verify tool count manually
npx reloaderoo@latest inspect list-tools -- node build/index.js 2>/dev/null | jq '.tools | length'

# Verify resource count manually
npx reloaderoo@latest inspect list-resources -- node build/index.js 2>/dev/null | jq '.resources | length'
```

#### Phase 2: Resource Testing

```bash
# Test each resource systematically
while IFS= read -r resource_uri; do
    echo "Testing resource: $resource_uri"
    npx reloaderoo@latest inspect read-resource "$resource_uri" -- node build/index.js 2>/dev/null
    echo "---"
done < /tmp/resource_uris.txt
```

#### Phase 3: Foundation Tools (Data Collection)

**CRITICAL: Capture ALL key outputs for dependent tools**

```bash
echo "=== FOUNDATION TOOL TESTING & DATA COLLECTION ==="

# 1. Test doctor (no dependencies)
echo "Testing doctor..."
npx reloaderoo@latest inspect call-tool "doctor" --params '{}' -- node build/index.js 2>/dev/null

# 2. Collect device data
echo "Collecting device UUIDs..."
npx reloaderoo@latest inspect call-tool "list_devices" --params '{}' -- node build/index.js 2>/dev/null > /tmp/devices_output.json
DEVICE_UUIDS=$(jq -r '.content[0].text' /tmp/devices_output.json | grep -E "UDID: [A-F0-9-]+" | sed 's/.*UDID: //' | head -2)
echo "Device UUIDs captured: $DEVICE_UUIDS"

# 3. Collect simulator data  
echo "Collecting simulator UUIDs..."
npx reloaderoo@latest inspect call-tool "list_sims" --params '{}' -- node build/index.js 2>/dev/null > /tmp/sims_output.json
SIMULATOR_UUIDS=$(jq -r '.content[0].text' /tmp/sims_output.json | grep -E "\([A-F0-9-]+\)" | sed 's/.*(\([A-F0-9-]*\)).*/\1/' | head -3)
echo "Simulator UUIDs captured: $SIMULATOR_UUIDS"

# 4. Collect project data
echo "Collecting project paths..."
npx reloaderoo@latest inspect call-tool "discover_projs" --params '{"workspaceRoot": "/Volumes/Developer/XcodeBuildMCP"}' -- node build/index.js 2>/dev/null > /tmp/projects_output.json
PROJECT_PATHS=$(jq -r '.content[1].text' /tmp/projects_output.json | grep -E "\.xcodeproj$" | sed 's/.*- //' | head -3)
WORKSPACE_PATHS=$(jq -r '.content[2].text' /tmp/projects_output.json | grep -E "\.xcworkspace$" | sed 's/.*- //' | head -2)
echo "Project paths captured: $PROJECT_PATHS"
echo "Workspace paths captured: $WORKSPACE_PATHS"

# Save key data for dependent tools
echo "$DEVICE_UUIDS" > /tmp/device_uuids.txt
echo "$SIMULATOR_UUIDS" > /tmp/simulator_uuids.txt  
echo "$PROJECT_PATHS" > /tmp/project_paths.txt
echo "$WORKSPACE_PATHS" > /tmp/workspace_paths.txt
```

#### Phase 4: Discovery Tools (Metadata Collection)

```bash
echo "=== DISCOVERY TOOL TESTING & METADATA COLLECTION ==="

# Collect schemes for each project
while IFS= read -r project_path; do
    if [ -n "$project_path" ]; then
        echo "Getting schemes for: $project_path"
        npx reloaderoo@latest inspect call-tool "list_schems_proj" --params "{\"projectPath\": \"$project_path\"}" -- node build/index.js 2>/dev/null > /tmp/schemes_$$.json
        SCHEMES=$(jq -r '.content[1].text' /tmp/schemes_$$.json 2>/dev/null || echo "NoScheme")
        echo "$project_path|$SCHEMES" >> /tmp/project_schemes.txt
        echo "Schemes captured for $project_path: $SCHEMES"
    fi
done < /tmp/project_paths.txt

# Collect schemes for each workspace
while IFS= read -r workspace_path; do
    if [ -n "$workspace_path" ]; then
        echo "Getting schemes for: $workspace_path"
        npx reloaderoo@latest inspect call-tool "list_schemes" --params "{\"workspacePath\": \"$workspace_path\"}" -- node build/index.js 2>/dev/null > /tmp/ws_schemes_$$.json
        SCHEMES=$(jq -r '.content[1].text' /tmp/ws_schemes_$$.json 2>/dev/null || echo "NoScheme")
        echo "$workspace_path|$SCHEMES" >> /tmp/workspace_schemes.txt
        echo "Schemes captured for $workspace_path: $SCHEMES"
    fi
done < /tmp/workspace_paths.txt
```

#### Phase 5: Manual Individual Tool Testing (All Tools)

**CRITICAL: Test every single tool manually, one at a time**

**Manual Testing Process:**

1. **Create task list** with TodoWrite tool for all tools (using count from `npm run tools`)
2. **Test each tool individually** with proper parameters
3. **Mark each tool complete** in task list after manual verification
4. **Record results** and observations for each tool
5. **NO SCRIPTS** - Each command executed manually

**STEP-BY-STEP MANUAL TESTING COMMANDS:**

```bash
# STEP 1: Test foundation tools (no parameters required)
# Execute each command individually, wait for response, verify manually
npx reloaderoo@latest inspect call-tool "doctor" --params '{}' -- node build/index.js
# [Wait for response, read output, mark tool complete in task list]

npx reloaderoo@latest inspect call-tool "list_devices" --params '{}' -- node build/index.js
# [Record device UUIDs from response for dependent tools]

npx reloaderoo@latest inspect call-tool "list_sims" --params '{}' -- node build/index.js
# [Record simulator UUIDs from response for dependent tools]

# STEP 2: Test project discovery (use discovered project paths)
npx reloaderoo@latest inspect call-tool "list_schems_proj" --params '{"projectPath": "/actual/path/from/discover_projs.xcodeproj"}' -- node build/index.js
# [Record scheme names from response for build tools]

# STEP 3: Test workspace tools (use discovered workspace paths)  
npx reloaderoo@latest inspect call-tool "list_schemes" --params '{"workspacePath": "/actual/path/from/discover_projs.xcworkspace"}' -- node build/index.js
# [Record scheme names from response for build tools]

# STEP 4: Test simulator tools (use captured simulator UUIDs from step 1)
npx reloaderoo@latest inspect call-tool "boot_sim" --params '{"simulatorUuid": "ACTUAL_UUID_FROM_LIST_SIMS"}' -- node build/index.js
# [Verify simulator boots successfully]

# STEP 5: Test build tools (requires project + scheme + simulator from previous steps)
npx reloaderoo@latest inspect call-tool "build_sim_id_proj" --params '{"projectPath": "/actual/project.xcodeproj", "scheme": "ActualSchemeName", "simulatorId": "ACTUAL_SIMULATOR_UUID"}' -- node build/index.js
# [Verify build succeeds and record app bundle path]
```

**CRITICAL: EACH COMMAND MUST BE:**
1. **Executed individually** - One command at a time, manually typed or pasted
2. **Verified manually** - Read the complete response before continuing
3. **Tracked in task list** - Mark tool complete only after verification
4. **Use real data** - Replace placeholder values with actual captured data
5. **Wait for completion** - Allow each command to finish before proceeding

### TESTING VIOLATIONS AND ENFORCEMENT

**🚨 CRITICAL VIOLATIONS THAT WILL TERMINATE TESTING:**

1. **Direct MCP Tool Usage Violation:**
   ```typescript
   // ❌ IMMEDIATE TERMINATION - Using MCP tools directly
   await mcp__XcodeBuildMCP__list_devices();
   const result = await list_sims();
   ```

2. **Script-Based Testing Violation:**
   ```bash
   # ❌ IMMEDIATE TERMINATION - Using scripts to test tools
   for tool in $(cat tool_list.txt); do
     npx reloaderoo inspect call-tool "$tool" --params '{}' -- node build/index.js
   done
   ```

3. **Batching/Automation Violation:**
   ```bash
   # ❌ IMMEDIATE TERMINATION - Testing multiple tools simultaneously
   npx reloaderoo inspect call-tool "list_devices" & npx reloaderoo inspect call-tool "list_sims" &
   ```

4. **Source Code Examination Violation:**
   ```typescript
   // ❌ IMMEDIATE TERMINATION - Reading implementation during testing
   const toolImplementation = await Read('/src/mcp/tools/device-shared/list_devices.ts');
   ```

**ENFORCEMENT PROCEDURE:**
1. **First Violation**: Immediate correction and restart of testing process
2. **Documentation Update**: Add explicit prohibition to prevent future violations  
3. **Method Validation**: Ensure all future testing uses only Reloaderoo inspect commands
4. **Progress Reset**: Restart testing from foundation tools if direct MCP usage detected

**VALID TESTING SEQUENCE EXAMPLE:**
```bash
# ✅ CORRECT - Step-by-step manual execution via Reloaderoo
# Tool 1: Test doctor
npx reloaderoo@latest inspect call-tool "doctor" --params '{}' -- node build/index.js
# [Read response, verify, mark complete in TodoWrite]

# Tool 2: Test list_devices  
npx reloaderoo@latest inspect call-tool "list_devices" --params '{}' -- node build/index.js
# [Read response, capture UUIDs, mark complete in TodoWrite]

# Tool 3: Test list_sims
npx reloaderoo@latest inspect call-tool "list_sims" --params '{}' -- node build/index.js
# [Read response, capture UUIDs, mark complete in TodoWrite]

# Tool X: Test stateful tool (expected to fail)
npx reloaderoo@latest inspect call-tool "swift_package_stop" --params '{"pid": 12345}' -- node build/index.js
# [Tool fails as expected - no in-memory state available]
# [Mark as "false negative - stateful tool limitation" in TodoWrite]
# [Continue to next tool without investigation]

# Continue individually for all tools (use count from npm run tools)...
```

**HANDLING STATEFUL TOOL FAILURES:**
```bash
# ✅ CORRECT Response to Expected Stateful Tool Failure
# Tool fails with "No process found" or similar state-related error
# Response: Mark tool as "tested - false negative (stateful)" in task list
# Do NOT attempt to diagnose, fix, or investigate the failure
# Continue immediately to next tool in sequence
```

## Error Testing

```bash
# Test error handling systematically
echo "=== Error Testing ==="

# Test with invalid JSON parameters
echo "Testing invalid parameter types..."
npx reloaderoo@latest inspect call-tool list_schems_proj --params '{"projectPath": 123}' -- node build/index.js 2>/dev/null

# Test with non-existent paths
echo "Testing non-existent paths..."
npx reloaderoo@latest inspect call-tool list_schems_proj --params '{"projectPath": "/nonexistent/path.xcodeproj"}' -- node build/index.js 2>/dev/null

# Test with invalid UUIDs
echo "Testing invalid UUIDs..."
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorUuid": "invalid-uuid"}' -- node build/index.js 2>/dev/null
```

## Testing Report Generation

```bash
# Create comprehensive testing session report
cat > TESTING_SESSION_$(date +%Y-%m-%d).md << EOF
# Manual Testing Session - $(date +%Y-%m-%d)

## Environment
- macOS Version: $(sw_vers -productVersion)
- XcodeBuildMCP Version: $(jq -r '.version' package.json 2>/dev/null || echo "unknown")
- Testing Method: Reloaderoo @latest via npx

## Official Counts (Programmatically Verified)
- Total Tools: $TOOL_COUNT
- Total Resources: $RESOURCE_COUNT

## Test Results
[Document test results here]

## Issues Found
[Document any discrepancies or failures]

## Performance Notes
[Document response times and performance observations]
EOF

echo "Testing session template created: TESTING_SESSION_$(date +%Y-%m-%d).md"
```

### Key Commands Reference

```bash
# Essential testing commands
npx reloaderoo@latest inspect ping -- node build/index.js
npx reloaderoo@latest inspect server-info -- node build/index.js
npx reloaderoo@latest inspect list-tools -- node build/index.js | jq '.tools | length'
npx reloaderoo@latest inspect list-resources -- node build/index.js | jq '.resources | length'
npx reloaderoo@latest inspect call-tool TOOL_NAME --params '{}' -- node build/index.js
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://RESOURCE" -- node build/index.js

# Schema extraction
jq --arg tool "TOOL_NAME" '.tools[] | select(.name == $tool) | .inputSchema' /tmp/tools.json
jq --arg tool "TOOL_NAME" '.tools[] | select(.name == $tool) | .description' /tmp/tools.json
```

## Troubleshooting

### Common Issues

#### 1. Reloaderoo Command Timeouts
**Symptoms**: Commands hang or timeout after extended periods
**Cause**: Server startup issues or MCP protocol communication problems
**Resolution**: 
- Verify server builds successfully: `npm run build`
- Test direct server startup: `node build/index.js`
- Check for TypeScript compilation errors

#### 2. Tool Parameter Validation Errors
**Symptoms**: Tools return parameter validation errors
**Cause**: Missing or incorrect required parameters
**Resolution**:
- Check tool schema: `jq --arg tool "TOOL_NAME" '.tools[] | select(.name == $tool) | .inputSchema' /tmp/tools.json`
- Verify parameter types and required fields
- Use captured dependency data (UUIDs, paths, schemes)

#### 3. "No Such Tool" Errors
**Symptoms**: Reloaderoo reports tool not found
**Cause**: Tool name mismatch or server registration issues
**Resolution**:
- Verify tool exists in list: `npx reloaderoo@latest inspect list-tools -- node build/index.js | jq '.tools[].name'`
- Check exact tool name spelling and case sensitivity
- Ensure server built successfully

#### 4. Empty or Malformed Responses
**Symptoms**: Tools return empty responses or JSON parsing errors
**Cause**: Tool implementation issues or server errors
**Resolution**:
- Document as testing finding - do not investigate implementation
- Mark tool as "failed - empty response" in task list
- Continue with next tool in sequence

This systematic approach ensures comprehensive, accurate testing using programmatic discovery and validation of all XcodeBuildMCP functionality through the MCP interface exclusively.
