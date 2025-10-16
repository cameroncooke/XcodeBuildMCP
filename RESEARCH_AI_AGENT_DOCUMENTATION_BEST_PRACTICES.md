# AI Agent Documentation Best Practices Research

**Research Date:** 2025-10-12
**Focus:** Creating documentation that AI agents can successfully follow
**Context:** MCP (Model Context Protocol) tool documentation and agent usage patterns

---

## Executive Summary

AI agents in 2025 require fundamentally different documentation than humans. While humans can infer context, browse multiple pages, and tolerate ambiguity, agents need **explicit, structured, and self-contained documentation** with clear boundaries and verifiable examples. This research synthesizes best practices from Anthropic, GitHub, Microsoft, and the broader MCP ecosystem to provide actionable guidance for agent-friendly documentation.

---

## 1. Agent-Friendly Documentation: Core Principles

### 1.1 Human-Readable vs Agent-Readable Documentation

| Aspect | Human Documentation | Agent Documentation |
|--------|-------------------|-------------------|
| **Context** | Can browse multiple pages | Must be self-contained per page |
| **Ambiguity** | Can infer meaning | Requires explicit instructions |
| **Examples** | Conceptual examples OK | Must have exact, runnable commands |
| **Structure** | Flexible narrative | Strict hierarchical structure |
| **Navigation** | Visual cues, menus | Semantic headings, clear hierarchy |
| **Verification** | Implicit trust | Explicit verification markers |

**Key Insight:** "Unlike human readers who browse through multiple pages, LLM-powered assistants often process individual pages or sections without the broader navigation context, so each page must stand on its own." (Source: kapa.ai)

### 1.2 The Three Pillars of Agent-Friendly Documentation

1. **Self-Contained Pages**: Every page must provide complete context without requiring external navigation
2. **Explicit Instructions**: No inference required - spell out every step, parameter, and expected outcome
3. **Verifiable Examples**: Include exact commands, parameters, and expected outputs that can be tested

### 1.3 Structure and Chunking

**Problem:** LLMs break documentation into small chunks (passage-level indexing) for vector similarity matching.

**Solution:**
- Use clear, descriptive headings (not vague titles like "Overview")
- Replace generic titles with specific ones: `AuthenticationFlow`, `API Rate Limits`, `iOS Simulator Testing`
- Create semantic coherence within chunks - each section should be independently meaningful
- Use hierarchical structure: H1 → H2 → H3 with clear parent-child relationships

**Example Structure:**
```markdown
# iOS Simulator Development Workflow

## Building for Simulator
### Prerequisites
- Xcode 15.4+ installed
- iOS Simulator booted and running

### Build Command Pattern
build_sim_name_ws({ workspacePath, scheme, simulatorName, platform })

### Expected Output
✅ Build succeeded
Next: Use install_app_sim to install the app
```

---

## 2. MCP Tool Documentation Standards

### 2.1 Tool Definition Structure

Every MCP tool must have:

```typescript
{
  name: string;              // Unique identifier (must match usage)
  description: string;       // Critical for agent selection
  inputSchema: {             // JSON Schema for parameters
    type: "object",
    properties: {
      param: {
        type: "string",
        description: "Explicit parameter purpose"  // Required!
      }
    },
    required: ["param"]      // Explicit required list
  }
}
```

### 2.2 Tool Description Best Practices

**From Anthropic's "Writing Tools for Agents":**

> "Write descriptions as if explaining to a new team member"

**Critical Elements:**

1. **Purpose Statement** (1 sentence)
   - What the tool does in plain language
   - Example: "Builds an iOS app for simulator using workspace file"

2. **Usage Pattern** (1 line)
   - Exact call signature with parameter names
   - Example: `build_sim_name_ws({ workspacePath: "/path/to/app.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16" })`

3. **Parameter Requirements** (bullet list)
   - Each parameter with type and purpose
   - Explicit about required vs optional
   - Example:
     ```
     - workspacePath (string, required): Absolute path to .xcworkspace file
     - scheme (string, required): Xcode scheme name to build
     - simulatorName (string, required): Simulator name like "iPhone 16"
     - configuration (string, optional): Build configuration, defaults to "Debug"
     ```

4. **Prerequisites** (if any)
   - System state requirements
   - Example: "Simulator must be booted before calling this tool"

5. **Expected Behavior** (brief)
   - What happens on success
   - What happens on failure
   - Example: "Returns build status. On success, provides next steps for installation."

### 2.3 Real-World Tool Description Examples

**Example 1: GitHub MCP Server**
```
Tool: cancel_workflow_run
Description: Cancels a workflow run
Parameters:
  - owner (string, required): Repository owner
  - repo (string, required): Repository name
  - run_id (number, required): Unique workflow run identifier
```

**Example 2: iOS Simulator Tool (Ideal Pattern)**
```
Tool: build_sim_name_ws
Description: Builds an iOS app for simulator using a workspace file. Use this when you have a .xcworkspace file and want to build for a simulator identified by name (e.g., "iPhone 16").
Usage: build_sim_name_ws({ workspacePath: "/path/to/app.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16", platform: "iOS Simulator" })
Parameters:
  - workspacePath (string, required): Absolute path to .xcworkspace file
  - scheme (string, required): Xcode scheme name to build
  - simulatorName (string, required): Simulator name like "iPhone 16 Pro"
  - platform (string, optional): Defaults to "iOS Simulator"
  - configuration (string, optional): Build configuration, defaults to "Debug"
Prerequisites:
  - Xcode installed and licensed
  - Simulator booted (use boot_sim if needed)
Expected Output:
  ✅ Build succeeded → Provides app path for next step (install_app_sim)
  ❌ Build failed → Returns detailed error with suggested fixes
```

### 2.4 Parameter Schema Best Practices

**From MCP Specification:**

1. **Use JSON Schema** for all parameter definitions
2. **Include descriptions** for every parameter (not optional for agents!)
3. **Mark required fields** explicitly in `required` array
4. **Use enums** for constrained values:
   ```typescript
   platform: {
     type: "string",
     enum: ["iOS Simulator", "tvOS Simulator", "watchOS Simulator"],
     description: "Target simulator platform"
   }
   ```

5. **Provide defaults** when applicable:
   ```typescript
   configuration: {
     type: "string",
     default: "Debug",
     description: "Build configuration (Debug or Release)"
   }
   ```

---

## 3. Testing and Verification Documentation

### 3.1 The Verification Crisis

**Problem:** Agents hallucinate capabilities when documentation lacks verification markers.

**Root Causes:**
1. **Assumed Working**: Documentation describes features that were never tested
2. **Outdated Examples**: Commands that worked in v1.0 but fail in v2.0
3. **Missing Prerequisites**: Undocumented system requirements
4. **Platform Confusion**: iOS examples mixed with macOS without clear separation

### 3.2 Verification Markers

Use explicit markers to indicate testing status:

**Verified Working:**
```markdown
## Build iOS Simulator App (✅ Verified 2025-10-12)

**Platform:** iOS Simulator
**Xcode Version:** 15.4
**Tested With:** iPhone 16 Pro simulator, iOS 18.2

**Command:**
npx reloaderoo inspect call-tool build_sim_name_ws --params '{
  "workspacePath": "/path/to/MyApp.xcworkspace",
  "scheme": "MyApp",
  "simulatorName": "iPhone 16 Pro"
}' -- node build/index.js

**Expected Output:**
✅ Build succeeded
App path: /Users/.../MyApp.app
Next: Use install_app_sim to install
```

**Untested/Theoretical:**
```markdown
## Build watchOS Simulator App (⚠️ Untested)

**Note:** This workflow is implemented but has not been verified with a real watchOS project.

**Expected Usage:**
build_sim_name_ws({
  workspacePath: "/path/to/WatchApp.xcworkspace",
  scheme: "WatchApp",
  simulatorName: "Apple Watch Series 9 (45mm)",
  platform: "watchOS Simulator"
})

**Status:** Needs verification with actual watchOS project
```

### 3.3 Test-Driven Documentation Pattern

**Structure:**
1. **Prerequisites Section** (explicit system state)
2. **Exact Command** (copy-paste ready)
3. **Expected Output** (literal output, not paraphrased)
4. **Verification Date** (when was this last tested?)
5. **Known Issues** (current limitations)

**Example:**
```markdown
### Prerequisites
- ✅ Xcode 15.4 installed
- ✅ iPhone 16 Pro simulator created
- ✅ Simulator booted (run boot_sim first)
- ✅ Valid .xcworkspace file exists

### Command
npx reloaderoo inspect call-tool build_sim_name_ws --params '{
  "workspacePath": "/Users/dev/MyApp/MyApp.xcworkspace",
  "scheme": "MyApp",
  "simulatorName": "iPhone 16 Pro",
  "platform": "iOS Simulator"
}' -- node build/index.js

### Expected Output (Verified 2025-10-12)
{
  "success": true,
  "data": {
    "content": [{
      "type": "text",
      "text": "✅ Build succeeded\nApp path: /Users/dev/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug-iphonesimulator/MyApp.app\n\nNext: Use install_app_sim to install the app on the simulator."
    }],
    "isError": false
  }
}

### Known Issues
- None (as of 2025-10-12)
```

### 3.4 Multi-Platform Documentation Pattern

**Problem:** Mixing iOS, macOS, visionOS examples causes agent confusion.

**Solution:** Use clear platform headers and separate sections:

```markdown
# Build Workflows

## iOS Simulator Workflow
**Platform:** iOS Simulator
**Project Type:** Workspace
**Tools:** build_sim_name_ws → install_app_sim → launch_app_sim

### Complete Example
[iOS-specific commands here]

---

## macOS Native Workflow
**Platform:** macOS
**Project Type:** Workspace
**Tools:** build_macos → launch_mac_app

### Complete Example
[macOS-specific commands here]

---

## visionOS Simulator Workflow
**Platform:** visionOS Simulator
**Project Type:** Workspace
**Tools:** build_sim_name_ws → install_app_sim → launch_app_sim

### Complete Example
[visionOS-specific commands here]
```

**Key Pattern:** Each section is independently complete - no cross-references to "see iOS example above"

---

## 4. Common Agent Failure Patterns

### 4.1 Tool Selection Failures

**Problem:** Agent calls wrong tool when multiple similar tools exist.

**Example Confusion:**
- `build_sim_id_ws` vs `build_sim_name_ws` vs `build_sim_id_proj` vs `build_sim_name_proj`

**Why Agents Fail:**
1. **Vague Descriptions**: "Build for simulator" doesn't clarify workspace vs project
2. **Missing Context**: Description doesn't explain when to use ID vs name
3. **No Decision Tree**: No guidance on "if X, use tool A; if Y, use tool B"

**Solution: Disambiguation Headers**

```markdown
# Choosing the Right Build Tool

## Decision Tree

1. **What are you building for?**
   - Physical device → Use device tools
   - Simulator → Continue to step 2
   - macOS native → Use macos tools

2. **What project type?**
   - .xcworkspace file → Use _ws tools
   - .xcodeproj file → Use _proj tools

3. **How do you identify the simulator?**
   - By UUID (from list_sims) → Use _id tools
   - By name (e.g., "iPhone 16") → Use _name tools

## Result
- Workspace + Simulator + By Name → `build_sim_name_ws`
- Project + Simulator + By UUID → `build_sim_id_proj`
- etc.
```

### 4.2 Namespacing and Tool Disambiguation

**From Anthropic Research:**

> "Namespacing (grouping related tools under common prefixes) can help delineate boundaries between lots of tools... selecting between prefix- and suffix-based namespacing has non-trivial effects on tool-use evaluations, with effects varying by LLM."

**Best Practices:**

1. **Consistent Naming Pattern**
   - Format: `{action}_{target}_{specifier}_{projectType}`
   - Example: `build_sim_name_ws` = build + simulator + by-name + workspace

2. **Glossary in Documentation**
   - Always include a glossary section
   - Define every abbreviation: `_ws` = workspace, `_proj` = project, `_sim` = simulator, `_dev` = device

3. **Explicit Tool Boundaries**
   - Document what each tool does NOT do
   - Example: "Note: build_sim_name_ws does NOT install the app. After building, use install_app_sim."

### 4.3 Parameter Confusion

**Common Failures:**

1. **Ambiguous Names**
   - Bad: `path` (path to what?)
   - Good: `workspacePath`, `appPath`, `derivedDataPath`

2. **Missing Type Information**
   - Bad: `simulatorName` with no examples
   - Good: `simulatorName (string): Simulator name like "iPhone 16 Pro" or "iPad Pro (12.9-inch)"`

3. **Optional vs Required Confusion**
   - Bad: Description doesn't clarify required vs optional
   - Good: Explicit `(required)` or `(optional, defaults to X)` in every parameter description

### 4.4 Workflow Assumption Failures

**Problem:** Agent assumes tool A completes entire workflow, but it only does step 1 of 3.

**Example:**
```
User: "Build and run my iOS app"
Agent: [Calls build_sim_name_ws]
Agent: "Done! Your app is running."
Reality: App was built but never installed or launched.
```

**Solution: Explicit Workflow Documentation**

```markdown
# Complete iOS Simulator Development Workflow

## Step 1: Build (build_sim_name_ws)
Compiles the app for simulator.

**Output:** Provides app path
**Next Step:** Install the app (Step 2)

## Step 2: Install (install_app_sim)
Installs the built app on the simulator.

**Prerequisites:**
- App built (Step 1 completed)
- Simulator booted

**Output:** Confirms installation
**Next Step:** Launch the app (Step 3)

## Step 3: Launch (launch_app_sim)
Launches the installed app on the simulator.

**Prerequisites:**
- App installed (Step 2 completed)
- Simulator booted and visible

**Output:** App launches, logs begin streaming
**Next Step:** Interact with the app or capture logs
```

---

## 5. Project-Specific Documentation Patterns

### 5.1 Multiple Projects Without Confusion

**Problem:** Documentation references "MyApp" and "ExampleProject" interchangeably, causing agents to confuse different projects.

**Solution: Project-Specific Sections**

```markdown
# XcodeBuildMCP Example Projects

## Project 1: iOS Simulator Demo (Verified)
**Location:** `/examples/ios-simulator-demo`
**Type:** .xcworkspace
**Platform:** iOS Simulator
**Purpose:** Demonstrates complete simulator workflow

### Build This Project
npx reloaderoo inspect call-tool build_sim_name_ws --params '{
  "workspacePath": "/examples/ios-simulator-demo/Demo.xcworkspace",
  "scheme": "Demo",
  "simulatorName": "iPhone 16"
}' -- node build/index.js

---

## Project 2: macOS Native Demo (Verified)
**Location:** `/examples/macos-native-demo`
**Type:** .xcworkspace
**Platform:** macOS
**Purpose:** Demonstrates macOS native build and launch

### Build This Project
[macOS-specific commands]
```

**Key Pattern:** Each project is in its own section with complete, self-contained examples.

### 5.2 Platform-Specific Workflow Documentation

**Pattern: One Workflow Per Platform**

```markdown
# Platform Workflows

## iOS Simulator Workflow

### Overview
Build → Install → Launch → Test → Debug → Capture Logs

### Tools in Order
1. `list_sims` - Find available simulators
2. `boot_sim` - Boot the target simulator
3. `build_sim_name_ws` - Build the app
4. `install_app_sim` - Install on simulator
5. `launch_app_sim` - Launch the app
6. `start_sim_log_cap` - Start capturing logs
7. `screenshot` - Capture UI state
8. `stop_sim_log_cap` - Stop and retrieve logs

### Complete Example (Copy-Paste Ready)
# Step 1: List simulators
npx reloaderoo inspect call-tool list_sims --params '{}' -- node build/index.js

# Step 2: Boot simulator
npx reloaderoo inspect call-tool boot_sim --params '{
  "simulatorUuid": "PASTE_UUID_FROM_STEP_1"
}' -- node build/index.js

# [Continue with steps 3-8]

---

## macOS Workflow

### Overview
Build → Launch → Test → Debug

### Tools in Order
1. `build_macos` - Build the macOS app
2. `get_mac_app_path` - Get app bundle path
3. `launch_mac_app` - Launch the app
4. `stop_mac_app` - Stop the app

### Complete Example (Copy-Paste Ready)
[macOS-specific sequence]
```

---

## 6. Preventing Agent Hallucination

### 6.1 Root Causes of Hallucination

From research findings:

1. **Ambiguous Documentation**: LLMs fill gaps with plausible but incorrect information
2. **Missing Verification**: No way to validate if a command actually works
3. **Outdated Examples**: Commands that worked in older versions
4. **Scope Creep**: Documentation implies capabilities that don't exist

### 6.2 Hallucination Prevention Strategies

**Strategy 1: Retrieval-Augmented Generation (RAG)**
- Provide documentation via MCP resources
- Agents retrieve exact documentation before generating responses
- No inference required - everything is explicitly stated

**Strategy 2: Bounded Capabilities**
- Document what tools DON'T do
- Provide explicit "Out of Scope" sections

**Example:**
```markdown
## build_sim_name_ws

### What This Tool Does
- Compiles iOS app for simulator
- Validates workspace and scheme exist
- Returns app path on success

### What This Tool Does NOT Do
- ❌ Does NOT install the app (use install_app_sim)
- ❌ Does NOT launch the app (use launch_app_sim)
- ❌ Does NOT work with physical devices (use build_device)
- ❌ Does NOT work with .xcodeproj files (use build_sim_name_proj)
```

**Strategy 3: Explicit Error Scenarios**
- Document known failure modes
- Provide exact error messages
- Suggest fixes for common errors

**Example:**
```markdown
## Common Errors

### Error: "Workspace not found"
**Cause:** workspacePath points to non-existent file
**Fix:** Verify path with `ls /path/to/workspace`
**Example:**
workspacePath: "/Users/dev/MyApp/MyApp.xcworkspace" (correct)
NOT: "MyApp.xcworkspace" (relative paths not supported)

### Error: "Scheme not found"
**Cause:** Scheme name doesn't match Xcode project
**Fix:** List available schemes with list_schemes tool
**Example:**
scheme: "MyApp" (correct)
NOT: "MyApp iOS" (spaces not supported)
```

**Strategy 4: Verification Checkpoints**
- Include verification commands after each step
- Agents can validate state before proceeding

**Example:**
```markdown
## Workflow with Verification

### Step 1: Build App
[build command]

### Verify Build Success
**Check 1:** Response contains "✅ Build succeeded"
**Check 2:** App path is provided in response
**If Failed:** Do not proceed to Step 2. Debug build errors first.

### Step 2: Install App (Only if Step 1 Verified)
[install command]
```

### 6.3 Human Oversight Patterns

**Critical Checkpoints:**
```markdown
## Build and Deploy to Production

**⚠️ REQUIRES HUMAN APPROVAL**

This workflow will:
1. Build the app with Release configuration
2. Archive and sign the app
3. Upload to App Store Connect

**Before proceeding:**
- [ ] Confirm version number is correct
- [ ] Verify release notes are updated
- [ ] Ensure all tests pass
- [ ] Get manual approval from team lead

**Approval Required:** Type "APPROVED" to continue
```

---

## 7. AGENTS.md and Project Instructions

### 7.1 AGENTS.md Standard (2025)

**Purpose:** Single source of truth for AI agents working on a codebase

**Key Components:**

1. **Project Overview** (2-3 sentences)
2. **Setup and Build Steps** (exact commands)
3. **Test Commands and CI Notes** (verification process)
4. **Code Style and Formatting Rules** (linting, formatting)
5. **Commit and PR Guidelines** (branch naming, commit message format)
6. **Security and Dependency Policies** (approval process)

**Example AGENTS.md:**
```markdown
# AGENTS.md

## Project: XcodeBuildMCP
MCP server providing Xcode build tools for AI agents. TypeScript/Node.js project with 80+ MCP tools.

## Build
npm run build        # Compile TypeScript
npm run typecheck    # MUST pass before commit
npm run lint         # Fix linting issues
npm run test         # Run test suite

## Testing
- All tools must have tests in __tests__/ directories
- Use dependency injection pattern (NO Vitest mocking)
- Tests must pass before PR merge

## Commits
- Format: `feat: add simulator boot tool` or `fix: handle null UUID`
- Run `npm run typecheck && npm run lint && npm run test` before commit
- NEVER commit with TypeScript errors

## PRs
- Use `gh pr create` command
- Include Summary, Background, Solution, Testing sections
- Add "Cursor review" comment after creation
- Squash and merge or rebase and merge only

## Security
- Never commit credentials or API keys
- Get approval before adding new dependencies
```

### 7.2 Tool-Specific Instructions

**Pattern: Scope to File/Directory**

```markdown
## File-Scoped Commands

### For src/mcp/tools/simulator-workspace/
npx vitest src/mcp/tools/simulator-workspace/__tests__/  # Run tests
npm run lint -- src/mcp/tools/simulator-workspace/       # Lint this dir
npm run typecheck                                         # Check types (project-wide)

### For Adding New Tools
1. Create tool file: src/mcp/tools/[workflow]/tool_name.ts
2. Create test file: src/mcp/tools/[workflow]/__tests__/tool_name.test.ts
3. Export from workflow: src/mcp/tools/[workflow]/index.ts
4. Run: npm run build && npm run test
```

---

## 8. Documentation Quality Checklist

Use this checklist for every documentation page:

### Content Quality
- [ ] Every page is self-contained (no required external navigation)
- [ ] Clear, descriptive headings (no vague "Overview" titles)
- [ ] Explicit parameter descriptions with types and examples
- [ ] Verification status clearly marked (✅ Verified or ⚠️ Untested)
- [ ] Platform explicitly stated (iOS Simulator, macOS, etc.)
- [ ] Prerequisites listed before commands
- [ ] Expected outputs included (literal, not paraphrased)

### Structure Quality
- [ ] Hierarchical heading structure (H1 → H2 → H3)
- [ ] Semantic chunking (each section is independently meaningful)
- [ ] Copy-paste ready commands (exact syntax, no placeholders)
- [ ] Workflow ordering (Step 1 → Step 2 → Step 3)
- [ ] Glossary for all abbreviations

### Agent-Specific Quality
- [ ] Decision trees for tool selection
- [ ] Explicit "What This Tool Does NOT Do" sections
- [ ] Common error scenarios documented
- [ ] Verification checkpoints after critical steps
- [ ] Human approval points for destructive actions

### Verification Quality
- [ ] Testing date included (✅ Verified 2025-10-12)
- [ ] Exact command that was tested
- [ ] Literal expected output (copy-pasted from actual run)
- [ ] Known issues documented
- [ ] Prerequisites verified before testing

---

## 9. Tools Documentation Template

Use this template for documenting MCP tools:

```markdown
# Tool Name: {tool_name}

## Overview
{One sentence: what this tool does}

**Platform:** {iOS Simulator | macOS | Physical Device | etc.}
**Project Type:** {Workspace | Project | Swift Package | etc.}
**Status:** {✅ Verified YYYY-MM-DD | ⚠️ Untested | ⚠️ Deprecated}

## Usage Pattern
{tool_name}({ param1: "value1", param2: "value2" })

## Parameters

### Required Parameters
- **param1** (`string`): {Explicit description with example}
  - Example: `/Users/dev/MyApp/MyApp.xcworkspace`
- **param2** (`string`): {Explicit description with example}
  - Example: `MyApp`

### Optional Parameters
- **param3** (`string`, optional): {Description, including default}
  - Default: `"Debug"`
  - Example: `"Release"`

## Prerequisites
- {System requirement 1}
- {System requirement 2}
- {State requirement (e.g., "Simulator must be booted")}

## Expected Behavior

### Success Case
✅ {What happens on success}
**Output:** {Literal output text or structure}
**Next Step:** {What to do next}

### Failure Cases

#### Error: "{Exact error message}"
**Cause:** {Why this error occurs}
**Fix:** {How to resolve it}
**Example Fix Command:** `{exact command}`

## Complete Example (Verified YYYY-MM-DD)

### Step 1: {First prerequisite or verification step}
```bash
{Exact command}
```

**Expected Output:**
```
{Literal output}
```

### Step 2: Call the Tool
```bash
npx reloaderoo inspect call-tool {tool_name} --params '{
  "param1": "/actual/path/to/file",
  "param2": "ActualValue"
}' -- node build/index.js
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "content": [{
      "type": "text",
      "text": "{Literal output text}"
    }],
    "isError": false
  }
}
```

## What This Tool Does NOT Do
- ❌ Does NOT {common misconception 1}
- ❌ Does NOT {common misconception 2}
- Use {alternative_tool} for {alternative use case}

## See Also
- {Related tool 1}: {One-sentence description}
- {Related tool 2}: {One-sentence description}
```

---

## 10. Key Takeaways

### For Tool Descriptions
1. **Be Explicit**: Write as if explaining to a new team member who can't ask follow-up questions
2. **Provide Examples**: Every parameter should have an example value
3. **State Prerequisites**: Don't assume agents know system requirements
4. **Define Scope**: Explicitly state what the tool does AND doesn't do

### For Documentation Pages
1. **Self-Contained**: Each page must be independently complete
2. **Hierarchical**: Clear H1 → H2 → H3 structure for LLM chunking
3. **Verified**: Mark testing status with dates
4. **Platform-Specific**: Separate iOS/macOS/visionOS clearly

### For Multi-Tool Workflows
1. **Decision Trees**: Help agents choose the right tool
2. **Sequential Steps**: Number steps explicitly (Step 1 → Step 2 → Step 3)
3. **Verification Checkpoints**: Validate state before proceeding
4. **Error Recovery**: Document how to recover from common failures

### For Preventing Hallucination
1. **Bounded Capabilities**: Document what tools DON'T do
2. **Explicit Errors**: List exact error messages and fixes
3. **Verification Markers**: ✅ Verified vs ⚠️ Untested
4. **Human Checkpoints**: Require approval for destructive actions

---

## 11. Sources and References

### Primary Sources
- **Anthropic**: "Writing effective tools for AI agents" (anthropic.com/engineering/writing-tools-for-agents)
- **Model Context Protocol**: Official specification and examples (modelcontextprotocol.io)
- **GitHub**: "Building your first MCP server" (github.blog)
- **Microsoft**: "Write effective instructions for declarative agents" (learn.microsoft.com)
- **kapa.ai**: "Optimizing technical docs for LLMs" (kapa.ai/blog, docs.kapa.ai)

### Key Research Papers/Articles
- "Spec-driven development: Using Markdown as a programming language when building with AI" (GitHub Blog, 2025)
- "AI Documentation Trends: What's Changing in 2025" (Mintlify, 2025)
- "Best Practices for Mitigating Hallucinations in Large Language Models" (Microsoft, 2025)
- "AGENTS.md: The README Your AI Coding Agents Actually Read" (builder.io, 2025)

### MCP Ecosystem
- Official MCP Servers: github.com/modelcontextprotocol/servers
- GitHub MCP Server: github.com/github/github-mcp-server
- Awesome MCP Servers: github.com/punkpeye/awesome-mcp-servers
- MCP for Beginners: github.com/microsoft/mcp-for-beginners

### Testing and Verification
- "Automated Markdown Testing: Two Options" (DEV Community)
- "Markdown Code Reviews" (Microsoft Engineering Playbook)
- Reloaderoo CLI Testing Framework (npmjs.com/package/reloaderoo)

---

## 12. Glossary

**Agent**: An AI system that can interact with tools and make decisions autonomously

**Chunking**: Breaking documentation into small, semantically coherent pieces for vector similarity search

**Hallucination**: When an AI generates plausible but incorrect information not grounded in actual documentation

**MCP**: Model Context Protocol - standard for connecting AI systems to external tools and data

**Passage-Level Indexing**: Modern approach where LLMs break documents into small chunks for retrieval

**RAG**: Retrieval-Augmented Generation - using retrieved documentation to ground AI responses

**Self-Contained**: Documentation that provides complete context without requiring external navigation

**Tool**: An executable function exposed to AI agents via MCP for performing actions

**Verification Marker**: Explicit indicator of whether documentation/examples have been tested (✅/⚠️)

**Workflow**: A multi-step process involving multiple tool calls in sequence to achieve a goal

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Maintained By:** XcodeBuildMCP Project
**License:** MIT
