<file_map>
/Volumes/Developer/XcodeBuildMCP
├── docs
│   ├── dev
│   │   ├── CLI_CONVERSION_PLAN.md *
│   │   ├── ARCHITECTURE.md
│   │   ├── CODE_QUALITY.md
│   │   ├── CONTRIBUTING.md
│   │   ├── ESLINT_TYPE_SAFETY.md
│   │   ├── MANUAL_TESTING.md
│   │   ├── NODEJS_2025.md
│   │   ├── PLUGIN_DEVELOPMENT.md
│   │   ├── PROJECT_CONFIG_PLAN.md
│   │   ├── README.md
│   │   ├── RELEASE_PROCESS.md
│   │   ├── RELOADEROO.md
│   │   ├── RELOADEROO_FOR_XCODEBUILDMCP.md
│   │   ├── RELOADEROO_XCODEBUILDMCP_PRIMER.md
│   │   ├── SMITHERY.md
│   │   ├── SMITHERY_PACKAGING_CONTEXT.md
│   │   ├── TESTING.md
│   │   ├── TEST_RUNNER_ENV_IMPLEMENTATION_PLAN.md
│   │   ├── ZOD_MIGRATION_GUIDE.md
│   │   ├── session-aware-migration-todo.md
│   │   ├── session_management_plan.md
│   │   ├── tools_cli_schema_audit_plan.md
│   │   └── tools_schema_redundancy.md
│   ├── investigations
│   │   ├── issue-154-screenshot-downscaling.md
│   │   ├── issue-163.md
│   │   ├── issue-debugger-attach-stopped.md
│   │   └── issue-describe-ui-empty-after-debugger-resume.md
│   ├── CLI.md
│   ├── CONFIGURATION.md
│   ├── DAP_BACKEND_IMPLEMENTATION_PLAN.md
│   ├── DEBUGGING_ARCHITECTURE.md
│   ├── DEMOS.md
│   ├── DEVICE_CODE_SIGNING.md
│   ├── GETTING_STARTED.md
│   ├── OVERVIEW.md
│   ├── PRIVACY.md
│   ├── README.md
│   ├── SESSION_DEFAULTS.md
│   ├── SKILLS.md
│   ├── TOOLS.md
│   └── TROUBLESHOOTING.md
├── src
│   ├── cli
│   │   ├── commands
│   │   │   ├── daemon.ts * +
│   │   │   └── tools.ts +
│   │   ├── daemon-client.ts * +
│   │   ├── register-tool-commands.ts * +
│   │   ├── yargs-app.ts * +
│   │   ├── output.ts +
│   │   └── schema-to-yargs.ts +
│   ├── daemon
│   │   ├── daemon-server.ts * +
│   │   ├── socket-path.ts * +
│   │   ├── framing.ts +
│   │   └── protocol.ts +
│   ├── runtime
│   │   ├── naming.ts * +
│   │   ├── tool-catalog.ts * +
│   │   ├── tool-invoker.ts * +
│   │   ├── types.ts * +
│   │   └── bootstrap-runtime.ts +
│   ├── core
│   │   ├── __tests__
│   │   │   └── resources.test.ts +
│   │   ├── generated-plugins.ts +
│   │   ├── generated-resources.ts +
│   │   ├── plugin-registry.ts +
│   │   ├── plugin-types.ts +
│   │   └── resources.ts +
│   ├── mcp
│   │   ├── resources
│   │   │   ├── __tests__
│   │   │   │   └── ...
│   │   │   ├── devices.ts +
│   │   │   ├── doctor.ts +
│   │   │   ├── session-status.ts +
│   │   │   └── simulators.ts +
│   │   └── tools
│   │       ├── debugging
│   │       │   └── ...
│   │       ├── device
│   │       │   └── ...
│   │       ├── doctor
│   │       │   └── ...
│   │       ├── logging
│   │       │   └── ...
│   │       ├── macos
│   │       │   └── ...
│   │       ├── project-discovery
│   │       │   └── ...
│   │       ├── project-scaffolding
│   │       │   └── ...
│   │       ├── session-management
│   │       │   └── ...
│   │       ├── simulator
│   │       │   └── ...
│   │       ├── simulator-management
│   │       │   └── ...
│   │       ├── swift-package
│   │       │   └── ...
│   │       ├── ui-automation
│   │       │   └── ...
│   │       ├── utilities
│   │       │   └── ...
│   │       └── workflow-discovery
│   │           └── ...
│   ├── server
│   │   ├── bootstrap.ts +
│   │   ├── server-state.ts +
│   │   └── server.ts +
│   ├── test-utils
│   │   └── mock-executors.ts +
│   ├── types
│   │   └── common.ts +
│   ├── utils
│   │   ├── __tests__
│   │   │   ├── build-utils-suppress-warnings.test.ts +
│   │   │   ├── build-utils.test.ts +
│   │   │   ├── config-store.test.ts +
│   │   │   ├── debugger-simctl.test.ts +
│   │   │   ├── environment.test.ts +
│   │   │   ├── log_capture.test.ts +
│   │   │   ├── project-config.test.ts +
│   │   │   ├── session-aware-tool-factory.test.ts +
│   │   │   ├── session-store.test.ts +
│   │   │   ├── simulator-utils.test.ts +
│   │   │   ├── test-runner-env-integration.test.ts +
│   │   │   ├── typed-tool-factory.test.ts +
│   │   │   └── workflow-selection.test.ts +
│   │   ├── axe
│   │   │   └── index.ts +
│   │   ├── build
│   │   │   └── index.ts +
│   │   ├── debugger
│   │   │   ├── __tests__
│   │   │   │   └── ...
│   │   │   ├── backends
│   │   │   │   └── ...
│   │   │   ├── dap
│   │   │   │   └── ...
│   │   │   ├── debugger-manager.ts +
│   │   │   ├── index.ts +
│   │   │   ├── simctl.ts +
│   │   │   ├── tool-context.ts +
│   │   │   ├── types.ts +
│   │   │   └── ui-automation-guard.ts +
│   │   ├── execution
│   │   │   ├── index.ts +
│   │   │   └── interactive-process.ts +
│   │   ├── log-capture
│   │   │   ├── device-log-sessions.ts +
│   │   │   └── index.ts +
│   │   ├── logging
│   │   │   └── index.ts +
│   │   ├── plugin-registry
│   │   │   └── index.ts +
│   │   ├── responses
│   │   │   └── index.ts +
│   │   ├── template
│   │   │   └── index.ts +
│   │   ├── test
│   │   │   └── index.ts +
│   │   ├── validation
│   │   │   └── index.ts +
│   │   ├── version
│   │   │   └── index.ts +
│   │   ├── video-capture
│   │   │   └── index.ts +
│   │   ├── xcodemake
│   │   │   └── index.ts +
│   │   ├── CommandExecutor.ts +
│   │   ├── FileSystemExecutor.ts +
│   │   ├── axe-helpers.ts +
│   │   ├── build-utils.ts +
│   │   ├── capabilities.ts
│   │   ├── command.ts +
│   │   ├── config-store.ts +
│   │   ├── environment.ts +
│   │   ├── errors.ts +
│   │   ├── log_capture.ts +
│   │   ├── logger.ts +
│   │   ├── project-config.ts +
│   │   ├── remove-undefined.ts +
│   │   ├── runtime-config-schema.ts +
│   │   ├── runtime-config-types.ts +
│   │   ├── schema-helpers.ts +
│   │   ├── sentry.ts +
│   │   ├── session-defaults-schema.ts +
│   │   ├── session-status.ts +
│   │   ├── session-store.ts +
│   │   ├── simulator-utils.ts +
│   │   ├── template-manager.ts +
│   │   ├── test-common.ts +
│   │   ├── tool-registry.ts +
│   │   ├── typed-tool-factory.ts +
│   │   ├── validation.ts +
│   │   ├── video_capture.ts +
│   │   ├── workflow-selection.ts +
│   │   ├── xcode.ts +
│   │   └── xcodemake.ts +
│   ├── cli.ts * +
│   ├── daemon.ts * +
│   ├── doctor-cli.ts +
│   ├── index.ts +
│   ├── smithery.ts +
│   └── version.ts +
├── .claude
│   ├── agents
│   │   └── xcodebuild-mcp-qa-tester.md
│   └── commands
│       ├── rp-build-cli.md
│       ├── rp-investigate-cli.md
│       ├── rp-oracle-export-cli.md
│       ├── rp-refactor-cli.md
│       ├── rp-reminder-cli.md
│       └── rp-review-cli.md
├── .cursor
│   ├── BUGBOT.md
│   └── environment.json
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows
│   │   ├── README.md
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   ├── sentry.yml
│   │   └── stale.yml
│   └── FUNDING.yml
├── build-plugins
│   ├── plugin-discovery.js +
│   ├── plugin-discovery.ts +
│   └── tsconfig.json
├── example_projects
│   ├── iOS
│   │   ├── .cursor
│   │   │   └── rules
│   │   │       └── ...
│   │   ├── .xcodebuildmcp
│   │   │   └── config.yaml
│   │   ├── MCPTest
│   │   │   ├── Assets.xcassets
│   │   │   │   └── ...
│   │   │   ├── Preview Content
│   │   │   │   └── ...
│   │   │   ├── ContentView.swift +
│   │   │   └── MCPTestApp.swift +
│   │   ├── MCPTest.xcodeproj
│   │   │   ├── xcshareddata
│   │   │   │   └── ...
│   │   │   └── project.pbxproj
│   │   └── MCPTestUITests
│   │       └── MCPTestUITests.swift +
│   ├── iOS_Calculator
│   │   ├── .xcodebuildmcp
│   │   │   └── config.yaml
│   │   ├── CalculatorApp
│   │   │   ├── Assets.xcassets
│   │   │   │   └── ...
│   │   │   ├── CalculatorApp.swift +
│   │   │   └── CalculatorApp.xctestplan
│   │   ├── CalculatorApp.xcodeproj
│   │   │   ├── xcshareddata
│   │   │   │   └── ...
│   │   │   └── project.pbxproj
│   │   ├── CalculatorApp.xcworkspace
│   │   │   └── contents.xcworkspacedata
│   │   ├── CalculatorAppPackage
│   │   │   ├── Sources
│   │   │   │   └── ...
│   │   │   ├── Tests
│   │   │   │   └── ...
│   │   │   ├── .gitignore
│   │   │   └── Package.swift +
│   │   ├── CalculatorAppTests
│   │   │   └── CalculatorAppTests.swift +
│   │   ├── Config
│   │   │   ├── Debug.xcconfig
│   │   │   ├── Release.xcconfig
│   │   │   ├── Shared.xcconfig
│   │   │   └── Tests.xcconfig
│   │   └── .gitignore
│   ├── macOS
│   │   ├── MCPTest
│   │   │   ├── Assets.xcassets
│   │   │   │   └── ...
│   │   │   ├── Preview Content
│   │   │   │   └── ...
│   │   │   ├── ContentView.swift +
│   │   │   ├── MCPTest.entitlements
│   │   │   └── MCPTestApp.swift +
│   │   ├── MCPTest.xcodeproj
│   │   │   ├── xcshareddata
│   │   │   │   └── ...
│   │   │   └── project.pbxproj
│   │   └── MCPTestTests
│   │       └── MCPTestTests.swift +
│   └── spm
│       ├── Sources
│       │   ├── TestLib
│       │   │   └── ...
│       │   ├── long-server
│       │   │   └── ...
│       │   ├── quick-task
│       │   │   └── ...
│       │   └── spm
│       │       └── ...
│       ├── Tests
│       │   └── TestLibTests
│       │       └── ...
│       ├── .gitignore
│       ├── Package.resolved
│       └── Package.swift +
├── scripts
│   ├── analysis
│   │   ├── tools-analysis.ts +
│   │   └── tools-schema-audit.ts +
│   ├── bundle-axe.sh
│   ├── check-code-patterns.js +
│   ├── generate-loaders.ts +
│   ├── generate-version.ts +
│   ├── install-skill.sh
│   ├── release.sh
│   ├── tools-cli.ts +
│   ├── update-tools-docs.ts +
│   └── verify-smithery-bundle.sh
├── skills
│   └── xcodebuildmcp
│       └── SKILL.md
├── .axe-version
├── .gitignore
├── .prettierignore
├── .prettierrc.js
├── .repomix-output.txt
├── AGENTS.md
├── CHANGELOG.md
├── CLAUDE.md
├── CODE_OF_CONDUCT.md
├── LICENSE
├── README.md
├── XcodeBuildMCP.code-workspace
├── banner.png
├── config.example.yaml
├── eslint.config.js +
├── mcp-install-dark.png
├── package-lock.json
├── package.json
├── server.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.test.json
├── tsconfig.tests.json
├── tsup.config.ts +
└── vitest.config.ts +

/Users/cameroncooke/.codex/skills
├── .claude
│   └── commands
│       ├── rp-build-cli.md
│       ├── rp-investigate-cli.md
│       ├── rp-oracle-export-cli.md
│       ├── rp-refactor-cli.md
│       ├── rp-reminder-cli.md
│       └── rp-review-cli.md
├── .system
│   ├── skill-creator
│   │   ├── scripts
│   │   │   ├── init_skill.py +
│   │   │   ├── package_skill.py +
│   │   │   └── quick_validate.py +
│   │   ├── SKILL.md
│   │   └── license.txt
│   ├── skill-installer
│   │   ├── scripts
│   │   │   ├── github_utils.py +
│   │   │   ├── install-skill-from-github.py +
│   │   │   └── list-curated-skills.py +
│   │   ├── LICENSE.txt
│   │   └── SKILL.md
│   └── .codex-system-skills.marker
└── public
    ├── agent-browser
    │   └── SKILL.md
    ├── agents-md
    │   └── SKILL.md
    ├── app-store-changelog
    │   ├── references
    │   │   └── release-notes-guidelines.md
    │   ├── scripts
    │   │   └── collect_release_changes.sh
    │   └── SKILL.md
    ├── brand-guidelines
    │   └── SKILL.md
    ├── claude-settings-audit
    │   └── SKILL.md
    ├── code-review
    │   └── SKILL.md
    ├── code-simplifier
    │   └── SKILL.md
    ├── commit
    │   └── SKILL.md
    ├── create-pr
    │   └── SKILL.md
    ├── doc-coauthoring
    │   └── SKILL.md
    ├── find-bugs
    │   └── SKILL.md
    ├── gh-issue-fix-flow
    │   └── SKILL.md
    ├── ios-debugger-agent
    │   └── SKILL.md
    ├── iterate-pr
    │   └── SKILL.md
    ├── macos-spm-app-packaging
    │   ├── assets
    │   │   └── templates
    │   │       └── ...
    │   ├── references
    │   │   ├── packaging.md
    │   │   ├── release.md
    │   │   └── scaffold.md
    │   └── SKILL.md
    ├── swift-concurrency-expert
    │   ├── references
    │   │   ├── approachable-concurrency.md
    │   │   ├── swift-6-2-concurrency.md
    │   │   └── swiftui-concurrency-tour-wwdc.md
    │   └── SKILL.md
    ├── swiftui-liquid-glass
    │   ├── references
    │   │   └── liquid-glass.md
    │   └── SKILL.md
    ├── swiftui-performance-audit
    │   ├── references
    │   │   ├── demystify-swiftui-performance-wwdc23.md
    │   │   ├── optimizing-swiftui-performance-instruments.md
    │   │   ├── understanding-hangs-in-your-app.md
    │   │   └── understanding-improving-swiftui-performance.md
    │   └── SKILL.md
    ├── swiftui-ui-patterns
    │   ├── references
    │   │   ├── app-wiring.md
    │   │   ├── components-index.md
    │   │   ├── controls.md
    │   │   ├── deeplinks.md
    │   │   ├── focus.md
    │   │   ├── form.md
    │   │   ├── grids.md
    │   │   ├── haptics.md
    │   │   ├── input-toolbar.md
    │   │   ├── lightweight-clients.md
    │   │   ├── list.md
    │   │   ├── loading-placeholders.md
    │   │   ├── macos-settings.md
    │   │   ├── matched-transitions.md
    │   │   ├── media.md
    │   │   ├── menu-bar.md
    │   │   ├── navigationstack.md
    │   │   ├── overlay.md
    │   │   ├── scrollview.md
    │   │   ├── searchable.md
    │   │   ├── sheets.md
    │   │   ├── split-views.md
    │   │   ├── tabview.md
    │   │   ├── theming.md
    │   │   ├── title-menus.md
    │   │   └── top-bar.md
    │   └── SKILL.md
    ├── swiftui-view-refactor
    │   ├── references
    │   │   └── mv-patterns.md
    │   └── SKILL.md
    └── xcodebuildmcp
        └── SKILL.md

/Users/cameroncooke/Developer/AGENT
├── ideas
│   ├── XcodeBuildMCP-installer.md
│   └── XcodeBuildMCP.md
└── improvements
    ├── MCPLI.md
    ├── Peekaboo.md
    ├── Poltergeist.md
    ├── XcodeBuildMCP.md
    ├── macos-spm-app-packaging.md
    ├── update_skills.md
    ├── update_skills.sh.md
    └── xcodebuildmcp-debugger-attach-stop.md


(* denotes selected files)
(+ denotes code-map available)
Config: depth cap 3.
</file_map>
<file_contents>
File: /Volumes/Developer/XcodeBuildMCP/docs/dev/CLI_CONVERSION_PLAN.md
```md
# XcodeBuildMCP CLI Conversion Plan

This document outlines the architectural plan to convert XcodeBuildMCP into a first-class CLI tool (`xcodebuildcli`) while maintaining full MCP server compatibility.

## Overview

### Goals

1. **First-class CLI**: Separate CLI binary (`xcodebuildcli`) that invokes tools and exits
2. **MCP server unchanged**: `xcodebuildmcp` remains the long-lived stdio MCP server
3. **Shared tool logic**: All three runtimes (MCP, CLI, daemon) invoke the same underlying tool handlers
4. **Session defaults parity**: Identical behavior in all modes
5. **Stateful operation support**: Full daemon architecture for log capture, video recording, debugging, SwiftPM background

### Non-Goals

- Breaking existing MCP client integrations
- Changing the MCP protocol or tool schemas
- Wrapping MCP inside CLI (architecturally wrong)

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CLI Framework | yargs | Better dynamic command generation, strict validation, array support |
| Stateful Support | Full daemon | Unix domain socket for complete multi-step stateful operations |
| Daemon Communication | Unix domain socket | macOS only, simple protocol, reliable |
| Stateful Tools Priority | All equally | Logging, video, debugging, SwiftPM all route to daemon |
| Tool Name Format | kebab-case | CLI-friendly, disambiguated when collisions exist |
| CLI Binary Name | `xcodebuildcli` | Distinct from MCP server binary |

---

## Target Runtime Model

### Entry Points

| Binary | Entry Point | Description |
|--------|-------------|-------------|
| `xcodebuildmcp` | `src/index.ts` | MCP server (stdio, long-lived) - unchanged |
| `xcodebuildcli` | `src/cli.ts` | CLI (short-lived, exits after action) |
| Internal | `src/daemon.ts` | Daemon (Unix socket server, long-lived) |

### Execution Modes

- **Stateless tools**: CLI runs tools **in-process** by default (fast path)
- **Stateful tools** (log capture, video, debugging, SwiftPM background): CLI routes to **daemon** over Unix domain socket

### Naming Rules

- CLI tool names are **kebab-case**
- Internal MCP tool names remain **unchanged** (e.g., `build_sim`, `start_sim_log_cap`)
- CLI tool names are **derived** from MCP tool names, **disambiguated** when duplicates exist

**Disambiguation rule:**
- If a tool's kebab-name is unique across enabled workflows: use it (e.g., `build-sim`)
- If duplicated across workflows (e.g., `clean` exists in multiple): CLI name becomes `<workflow>-<tool>` (e.g., `simulator-clean`, `device-clean`)

---

## Directory Structure

### New Files

```
src/
  cli.ts                           # xcodebuildcli entry point (yargs)
  daemon.ts                        # daemon entry point (unix socket server)
  runtime/
    bootstrap-runtime.ts           # shared runtime bootstrap (config + session defaults)
    naming.ts                      # kebab-case + disambiguation + arg key transforms
    tool-catalog.ts                # loads workflows/tools, builds ToolCatalog with cliName mapping
    tool-invoker.ts                # shared "invoke tool by cliName" implementation
    types.ts                       # shared core interfaces (ToolDefinition, ToolCatalog, Invoker)
  daemon/
    protocol.ts                    # daemon protocol types (request/response, errors)
    framing.ts                     # length-prefixed framing helpers for net.Socket
    socket-path.ts                 # resolves default socket path + ensures dirs + cleanup
    daemon-server.ts               # Unix socket server + request router
  cli/
    yargs-app.ts                   # builds yargs instance, registers commands
    daemon-client.ts               # CLI -> daemon client (unix socket, protocol)
    commands/
      daemon.ts                    # yargs commands: daemon start/stop/status/restart
      tools.ts                     # yargs command: tools (list available tool commands)
    register-tool-commands.ts      # auto-register tool commands from schemas
    schema-to-yargs.ts             # converts Zod schema shape -> yargs options
    output.ts                      # prints ToolResponse to terminal
```

### Modified Files

- `src/server/bootstrap.ts` - Refactor to use shared runtime bootstrap
- `src/core/plugin-types.ts` - Extend `PluginMeta` with optional CLI metadata
- `tsup.config.ts` - Add `cli` and `daemon` entries
- `package.json` - Add `xcodebuildcli` bin, add yargs dependency

---

## Core Interfaces

### Tool Definition and Catalog

**File:** `src/runtime/types.ts`

```typescript
import type * as z from 'zod';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types/common.ts';
import type { ToolSchemaShape, PluginMeta } from '../core/plugin-types.ts';

export type RuntimeKind = 'cli' | 'daemon' | 'mcp';

export interface ToolDefinition {
  /** Stable CLI command name (kebab-case, disambiguated) */
  cliName: string;

  /** Original MCP tool name as declared today (unchanged) */
  mcpName: string;

  /** Workflow directory name (e.g., "simulator", "device", "logging") */
  workflow: string;

  description?: string;
  annotations?: ToolAnnotations;

  /**
   * Schema shape used to generate yargs flags for CLI.
   * Must include ALL parameters (not the session-default-hidden version).
   */
  cliSchema: ToolSchemaShape;

  /**
   * Schema shape used for MCP registration (what you already have).
   */
  mcpSchema: ToolSchemaShape;

  /**
   * Whether CLI MUST route this tool to the daemon (stateful operations).
   */
  stateful: boolean;

  /**
   * Shared handler (same used by MCP today). No duplication.
   */
  handler: PluginMeta['handler'];
}

export interface ToolCatalog {
  tools: ToolDefinition[];
  getByCliName(name: string): ToolDefinition | null;
  resolve(input: string): { tool?: ToolDefinition; ambiguous?: string[]; notFound?: boolean };
}

export interface InvokeOptions {
  runtime: RuntimeKind;
  enabledWorkflows?: string[];
  forceDaemon?: boolean;
  socketPath?: string;
}

export interface ToolInvoker {
  invoke(toolName: string, args: Record<string, unknown>, opts: InvokeOptions): Promise<ToolResponse>;
}
```

### Plugin CLI Metadata Extension

**File:** `src/core/plugin-types.ts` (modify)

```typescript
export interface PluginCliMeta {
  /** Optional override of derived CLI name */
  name?: string;
  /** Full schema shape for CLI flag generation (legacy, includes session-managed fields) */
  schema?: ToolSchemaShape;
  /** Mark tool as requiring daemon routing */
  stateful?: boolean;
}

export interface PluginMeta {
  readonly name: string;
  readonly schema: ToolSchemaShape;
  readonly description?: string;
  readonly annotations?: ToolAnnotations;
  readonly cli?: PluginCliMeta;          // NEW (optional)
  handler(params: Record<string, unknown>): Promise<ToolResponse>;
}
```

### Daemon Protocol

**File:** `src/daemon/protocol.ts`

```typescript
export const DAEMON_PROTOCOL_VERSION = 1 as const;

export type DaemonMethod =
  | 'daemon.status'
  | 'daemon.stop'
  | 'tool.list'
  | 'tool.invoke';

export interface DaemonRequest<TParams = unknown> {
  v: typeof DAEMON_PROTOCOL_VERSION;
  id: string;
  method: DaemonMethod;
  params?: TParams;
}

export type DaemonErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'AMBIGUOUS_TOOL'
  | 'TOOL_FAILED'
  | 'INTERNAL';

export interface DaemonError {
  code: DaemonErrorCode;
  message: string;
  data?: unknown;
}

export interface DaemonResponse<TResult = unknown> {
  v: typeof DAEMON_PROTOCOL_VERSION;
  id: string;
  result?: TResult;
  error?: DaemonError;
}

export interface ToolInvokeParams {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolInvokeResult {
  response: unknown;
}

export interface DaemonStatusResult {
  pid: number;
  socketPath: string;
  startedAt: string;
  enabledWorkflows: string[];
  toolCount: number;
}
```

---

## Shared Runtime Bootstrap

**File:** `src/runtime/bootstrap-runtime.ts`

```typescript
import process from 'node:process';
import { initConfigStore, getConfig, type RuntimeConfigOverrides } from '../utils/config-store.ts';
import { sessionStore } from '../utils/session-store.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import type { RuntimeKind } from './types.ts';

export interface BootstrapRuntimeOptions {
  runtime: RuntimeKind;
  cwd?: string;
  fs?: FileSystemExecutor;
  configOverrides?: RuntimeConfigOverrides;
}

export interface BootstrappedRuntime {
  runtime: RuntimeKind;
  cwd: string;
  config: ReturnType<typeof getConfig>;
}

export async function bootstrapRuntime(opts: BootstrapRuntimeOptions): Promise<BootstrappedRuntime> {
  const cwd = opts.cwd ?? process.cwd();
  const fs = opts.fs ?? getDefaultFileSystemExecutor();

  await initConfigStore({ cwd, fs, overrides: opts.configOverrides });

  const config = getConfig();

  const defaults = config.sessionDefaults ?? {};
  if (Object.keys(defaults).length > 0) {
    sessionStore.setDefaults(defaults);
  }

  return { runtime: opts.runtime, cwd, config };
}
```

---

## Tool Catalog

**File:** `src/runtime/tool-catalog.ts`

```typescript
import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { resolveSelectedWorkflows } from '../utils/workflow-selection.ts';
import type { ToolCatalog, ToolDefinition } from './types.ts';
import { toKebabCase, disambiguateCliNames } from './naming.ts';

export async function buildToolCatalog(opts: {
  enabledWorkflows: string[];
}): Promise<ToolCatalog> {
  const workflowGroups = await loadWorkflowGroups();
  const selection = resolveSelectedWorkflows(opts.enabledWorkflows, workflowGroups);

  const tools: ToolDefinition[] = [];

  for (const wf of selection.selectedWorkflows) {
    for (const tool of wf.tools) {
      const baseCliName = tool.cli?.name ?? toKebabCase(tool.name);
      tools.push({
        cliName: baseCliName,
        mcpName: tool.name,
        workflow: wf.directoryName,
        description: tool.description,
        annotations: tool.annotations,
        mcpSchema: tool.schema,
        cliSchema: tool.cli?.schema ?? tool.schema,
        stateful: Boolean(tool.cli?.stateful),
        handler: tool.handler,
      });
    }
  }

  const disambiguated = disambiguateCliNames(tools);

  return {
    tools: disambiguated,
    getByCliName(name) {
      return disambiguated.find((t) => t.cliName === name) ?? null;
    },
    resolve(input) {
      const exact = disambiguated.filter((t) => t.cliName === input);
      if (exact.length === 1) return { tool: exact[0] };

      const aliasMatches = disambiguated.filter((t) => toKebabCase(t.mcpName) === input);
      if (aliasMatches.length === 1) return { tool: aliasMatches[0] };
      if (aliasMatches.length > 1) return { ambiguous: aliasMatches.map((t) => t.cliName) };

      return { notFound: true };
    },
  };
}
```

**File:** `src/runtime/naming.ts`

```typescript
import type { ToolDefinition } from './types.ts';

export function toKebabCase(name: string): string {
  return name
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[A-Z]/g, (m) => m.toLowerCase())
    .toLowerCase();
}

export function disambiguateCliNames(tools: ToolDefinition[]): ToolDefinition[] {
  const groups = new Map<string, ToolDefinition[]>();
  for (const t of tools) {
    groups.set(t.cliName, [...(groups.get(t.cliName) ?? []), t]);
  }

  return tools.map((t) => {
    const same = groups.get(t.cliName) ?? [];
    if (same.length <= 1) return t;
    return { ...t, cliName: `${t.workflow}-${t.cliName}` };
  });
}
```

---

## Daemon Architecture

### Socket Path

**File:** `src/daemon/socket-path.ts`

```typescript
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function defaultSocketPath(): string {
  return join(homedir(), '.xcodebuildcli', 'daemon.sock');
}

export function ensureSocketDir(socketPath: string): void {
  const dir = socketPath.split('/').slice(0, -1).join('/');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function removeStaleSocket(socketPath: string): void {
  if (existsSync(socketPath)) unlinkSync(socketPath);
}
```

### Length-Prefixed Framing

**File:** `src/daemon/framing.ts`

```typescript
import type net from 'node:net';

export function writeFrame(socket: net.Socket, obj: unknown): void {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(json.length, 0);
  socket.write(Buffer.concat([header, json]));
}

export function createFrameReader(onMessage: (msg: unknown) => void) {
  let buffer = Buffer.alloc(0);

  return (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const len = buffer.readUInt32BE(0);
      if (buffer.length < 4 + len) return;

      const payload = buffer.subarray(4, 4 + len);
      buffer = buffer.subarray(4 + len);

      const msg = JSON.parse(payload.toString('utf8'));
      onMessage(msg);
    }
  };
}
```

### Daemon Server

**File:** `src/daemon/daemon-server.ts`

```typescript
import net from 'node:net';
import { writeFrame, createFrameReader } from './framing.ts';
import type { ToolCatalog } from '../runtime/types.ts';
import type { DaemonRequest, DaemonResponse, ToolInvokeParams } from './protocol.ts';
import { DAEMON_PROTOCOL_VERSION } from './protocol.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';

export interface DaemonServerContext {
  socketPath: string;
  startedAt: string;
  enabledWorkflows: string[];
  catalog: ToolCatalog;
}

export function startDaemonServer(ctx: DaemonServerContext): net.Server {
  const invoker = new DefaultToolInvoker(ctx.catalog);

  const server = net.createServer((socket) => {
    const onData = createFrameReader(async (msg) => {
      const req = msg as DaemonRequest;
      const base = { v: DAEMON_PROTOCOL_VERSION, id: req?.id ?? 'unknown' };

      try {
        if (req.v !== DAEMON_PROTOCOL_VERSION) {
          return writeFrame(socket, { ...base, error: { code: 'BAD_REQUEST', message: 'Unsupported protocol version' } });
        }

        switch (req.method) {
          case 'daemon.status':
            return writeFrame(socket, {
              ...base,
              result: {
                pid: process.pid,
                socketPath: ctx.socketPath,
                startedAt: ctx.startedAt,
                enabledWorkflows: ctx.enabledWorkflows,
                toolCount: ctx.catalog.tools.length,
              },
            });

          case 'daemon.stop':
            writeFrame(socket, { ...base, result: { ok: true } });
            server.close(() => process.exit(0));
            return;

          case 'tool.list':
            return writeFrame(socket, {
              ...base,
              result: ctx.catalog.tools.map((t) => ({
                name: t.cliName,
                workflow: t.workflow,
                description: t.description ?? '',
                stateful: t.stateful,
              })),
            });

          case 'tool.invoke': {
            const params = req.params as ToolInvokeParams;
            const response = await invoker.invoke(params.tool, params.args ?? {}, {
              runtime: 'daemon',
              enabledWorkflows: ctx.enabledWorkflows,
            });
            return writeFrame(socket, { ...base, result: { response } });
          }

          default:
            return writeFrame(socket, { ...base, error: { code: 'BAD_REQUEST', message: `Unknown method` } });
        }
      } catch (error) {
        return writeFrame(socket, {
          ...base,
          error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) },
        });
      }
    });

    socket.on('data', onData);
  });

  return server;
}
```

### Daemon Entry Point

**File:** `src/daemon.ts`

```typescript
#!/usr/bin/env node
import net from 'node:net';
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildToolCatalog } from './runtime/tool-catalog.ts';
import { ensureSocketDir, defaultSocketPath, removeStaleSocket } from './daemon/socket-path.ts';
import { startDaemonServer } from './daemon/daemon-server.ts';

async function main(): Promise<void> {
  const runtime = await bootstrapRuntime({ runtime: 'daemon' });
  const socketPath = process.env.XCODEBUILDCLI_SOCKET ?? defaultSocketPath();

  ensureSocketDir(socketPath);

  try {
    await new Promise<void>((resolve, reject) => {
      const s = net.createConnection(socketPath, () => {
        s.end();
        reject(new Error('Daemon already running'));
      });
      s.on('error', () => resolve());
    });
  } catch (e) {
    throw e;
  }

  removeStaleSocket(socketPath);

  const catalog = await buildToolCatalog({ enabledWorkflows: runtime.config.enabledWorkflows });

  const server = startDaemonServer({
    socketPath,
    startedAt: new Date().toISOString(),
    enabledWorkflows: runtime.config.enabledWorkflows,
    catalog,
  });

  server.listen(socketPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## CLI Architecture

### CLI Entry Point

**File:** `src/cli.ts`

```typescript
#!/usr/bin/env node
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildToolCatalog } from './runtime/tool-catalog.ts';
import { buildYargsApp } from './cli/yargs-app.ts';

async function main(): Promise<void> {
  const runtime = await bootstrapRuntime({ runtime: 'cli' });
  const catalog = await buildToolCatalog({ enabledWorkflows: runtime.config.enabledWorkflows });

  const yargsApp = buildYargsApp({ catalog, runtimeConfig: runtime.config });
  await yargsApp.parseAsync();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Yargs App

**File:** `src/cli/yargs-app.ts`

```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ToolCatalog } from '../runtime/types.ts';
import { registerDaemonCommands } from './commands/daemon.ts';
import { registerToolsCommand } from './commands/tools.ts';
import { registerToolCommands } from './register-tool-commands.ts';
import { version } from '../version.ts';

export function buildYargsApp(opts: {
  catalog: ToolCatalog;
  runtimeConfig: { enabledWorkflows: string[] };
}) {
  const app = yargs(hideBin(process.argv))
    .scriptName('xcodebuildcli')
    .strict()
    .recommendCommands()
    .wrap(Math.min(120, yargs.terminalWidth()))
    .parserConfiguration({
      'camel-case-expansion': true,
      'strip-dashed': true,
    })
    .option('socket', {
      type: 'string',
      describe: 'Override daemon unix socket path',
      default: process.env.XCODEBUILDCLI_SOCKET,
    })
    .option('daemon', {
      type: 'boolean',
      describe: 'Force daemon execution even for stateless tools',
      default: false,
    })
    .version(version)
    .help();

  registerDaemonCommands(app);
  registerToolsCommand(app, opts.catalog);
  registerToolCommands(app, opts.catalog);

  return app;
}
```

### Schema to Yargs Conversion

**File:** `src/cli/schema-to-yargs.ts`

```typescript
import * as z from 'zod';

export type YargsOpt =
  | { type: 'string'; array?: boolean; choices?: string[]; describe?: string }
  | { type: 'number'; array?: boolean; describe?: string }
  | { type: 'boolean'; describe?: string };

function unwrap(t: z.ZodTypeAny): z.ZodTypeAny {
  if (t instanceof z.ZodOptional) return unwrap(t.unwrap());
  if (t instanceof z.ZodNullable) return unwrap(t.unwrap());
  if (t instanceof z.ZodDefault) return unwrap(t.removeDefault());
  if (t instanceof z.ZodEffects) return unwrap(t.innerType());
  return t;
}

export function zodToYargsOption(t: z.ZodTypeAny): YargsOpt | null {
  const u = unwrap(t);

  if (u instanceof z.ZodString) return { type: 'string' };
  if (u instanceof z.ZodNumber) return { type: 'number' };
  if (u instanceof z.ZodBoolean) return { type: 'boolean' };

  if (u instanceof z.ZodEnum) return { type: 'string', choices: u.options };
  if (u instanceof z.ZodNativeEnum) return { type: 'string', choices: Object.values(u.enum) as string[] };

  if (u instanceof z.ZodArray) {
    const inner = unwrap(u.element);
    if (inner instanceof z.ZodString) return { type: 'string', array: true };
    if (inner instanceof z.ZodNumber) return { type: 'number', array: true };
    return null;
  }

  return null;
}
```

### Tool Command Registration

**File:** `src/cli/register-tool-commands.ts`

```typescript
import type { Argv } from 'yargs';
import type { ToolCatalog } from '../runtime/types.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';
import { zodToYargsOption } from './schema-to-yargs.ts';
import { toKebabCase } from '../runtime/naming.ts';
import { printToolResponse } from './output.ts';

export function registerToolCommands(app: Argv, catalog: ToolCatalog): void {
  const invoker = new DefaultToolInvoker(catalog);

  for (const tool of catalog.tools) {
    app.command(
      tool.cliName,
      tool.description ?? '',
      (y) => {
        y.option('json', {
          type: 'string',
          describe: 'JSON object of tool args (merged with flags)',
        });

        for (const [key, zt] of Object.entries(tool.cliSchema)) {
          const opt = zodToYargsOption(zt as z.ZodTypeAny);
          if (!opt) continue;

          const flag = toKebabCase(key);
          y.option(flag, {
            type: opt.type,
            array: (opt as { array?: boolean }).array,
            choices: (opt as { choices?: string[] }).choices,
            describe: (opt as { describe?: string }).describe,
          });
        }

        return y;
      },
      async (argv) => {
        const { json, socket, daemon, _, $0, ...rest } = argv as Record<string, unknown>;

        const jsonArgs = json ? (JSON.parse(String(json)) as Record<string, unknown>) : {};
        const flagArgs = rest as Record<string, unknown>;
        const args = { ...flagArgs, ...jsonArgs };

        const response = await invoker.invoke(tool.cliName, args, {
          runtime: 'cli',
          forceDaemon: Boolean(daemon),
          socketPath: socket as string | undefined,
        });

        printToolResponse(response);
      },
    );
  }
}
```

### CLI Output

**File:** `src/cli/output.ts`

```typescript
import type { ToolResponse } from '../types/common.ts';

export function printToolResponse(res: ToolResponse): void {
  for (const item of res.content ?? []) {
    if (item.type === 'text') {
      console.log(item.text);
    } else if (item.type === 'image') {
      console.log(`[image ${item.mimeType}, ${item.data.length} bytes base64]`);
    }
  }
  if (res.isError) process.exitCode = 1;
}
```

---

## Build Configuration

### tsup.config.ts

```typescript
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'doctor-cli': 'src/doctor-cli.ts',
    cli: 'src/cli.ts',
    daemon: 'src/daemon.ts',
  },
  // ...existing config...
});
```

### package.json

```json
{
  "bin": {
    "xcodebuildmcp": "build/cli.js",
    "xcodebuildmcp-doctor": "build/doctor-cli.js",
    "xcodebuildcli": "build/cli.js"
  },
  "dependencies": {
    "yargs": "^17.7.2"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation

1. Add `src/runtime/bootstrap-runtime.ts`
2. Refactor `src/server/bootstrap.ts` to call shared bootstrap
3. Add `src/cli.ts`, `src/daemon.ts` entries to `tsup.config.ts`
4. Add `xcodebuildcli` bin + `yargs` dependency in `package.json`

**Result:** Builds produce `build/cli.js` and `build/daemon.js`, MCP server unchanged.

### Phase 2: Tool Catalog + Direct CLI Invocation (Stateless)

1. Implement `src/runtime/naming.ts`, `src/runtime/tool-catalog.ts`, `src/runtime/tool-invoker.ts`, `src/runtime/types.ts`
2. Implement `src/cli/yargs-app.ts`, `src/cli/schema-to-yargs.ts`, `src/cli/register-tool-commands.ts`, `src/cli/output.ts`
3. Add `xcodebuildcli tools` list command

**Result:** `xcodebuildcli <tool>` works for stateless tools in-process.

### Phase 3: Daemon Protocol + Server + Client

1. Implement `src/daemon/protocol.ts`, `src/daemon/framing.ts`, `src/daemon/socket-path.ts`
2. Implement `src/daemon/daemon-server.ts` and wire into `src/daemon.ts`
3. Implement `src/cli/daemon-client.ts`
4. Implement `xcodebuildcli daemon start|stop|status|restart`

**Result:** Daemon starts, responds to status, can invoke tools.

### Phase 4: Stateful Routing

1. Add `cli.stateful = true` metadata to all stateful tools (logging, video, debugging, swift-package background)
2. Modify `DefaultToolInvoker` to require daemon when `tool.stateful === true`
3. Add CLI auto-start behavior: if daemon required and not running, start it programmatically

**Result:** Stateful commands run through daemon reliably; state persists across CLI invocations.

### Phase 5: Full CLI Schema Coverage

1. For all tools, ensure `tool.cli.schema` is present and complete
2. Ensure schema-to-yargs supports all Zod types used (string/number/boolean/enum/array)
3. Require complex/nested values via `--json` fallback

**Result:** CLI is first-class with full native flags.

---

## Command Examples

```bash
# List available tools
xcodebuildcli tools

# Run stateless tool with native flags
xcodebuildcli build-sim --scheme MyApp --project-path ./App.xcodeproj

# Run tool with JSON input
xcodebuildcli build-sim --json '{"scheme":"MyApp"}'

# Daemon management
xcodebuildcli daemon start
xcodebuildcli daemon status
xcodebuildcli daemon stop

# Stateful tools (automatically route to daemon)
xcodebuildcli start-sim-log-cap --simulator-id ABCD-1234
xcodebuildcli stop-sim-log-cap --session-id xyz

# Force daemon execution for any tool
xcodebuildcli build-sim --daemon --scheme MyApp

# Help
xcodebuildcli --help
xcodebuildcli build-sim --help
```

---

## Invariants

1. **MCP unchanged**: `xcodebuildmcp` continues to work exactly as before
2. **Smithery unchanged**: `src/smithery.ts` continues to work
3. **No code duplication**: CLI invokes same `PluginMeta.handler` functions
4. **Session defaults identical**: All runtimes use `bootstrapRuntime()` → `sessionStore`
5. **Tool logic shared**: `src/mcp/tools/*` remains single source of truth
6. **Daemon is macOS-only**: Uses Unix domain sockets; CLI fails with clear error on non-macOS

```

File: /Volumes/Developer/XcodeBuildMCP/src/daemon/socket-path.ts
```ts
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

/**
 * Get the default socket path for the daemon.
 * Located in ~/.xcodebuildcli/daemon.sock
 */
export function defaultSocketPath(): string {
  return join(homedir(), '.xcodebuildcli', 'daemon.sock');
}

/**
 * Ensure the directory for the socket exists with proper permissions.
 */
export function ensureSocketDir(socketPath: string): void {
  const dir = dirname(socketPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Remove a stale socket file if it exists.
 * Should only be called after confirming no daemon is running.
 */
export function removeStaleSocket(socketPath: string): void {
  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }
}

/**
 * Get the socket path from environment or use default.
 */
export function getSocketPath(): string {
  return process.env.XCODEBUILDCLI_SOCKET ?? defaultSocketPath();
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/runtime/tool-catalog.ts
```ts
import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { resolveSelectedWorkflows } from '../utils/workflow-selection.ts';
import type { ToolCatalog, ToolDefinition, ToolResolution } from './types.ts';
import { toKebabCase, disambiguateCliNames } from './naming.ts';

export async function buildToolCatalog(opts: {
  enabledWorkflows: string[];
}): Promise<ToolCatalog> {
  const workflowGroups = await loadWorkflowGroups();
  const selection = resolveSelectedWorkflows(opts.enabledWorkflows, workflowGroups);

  const tools: ToolDefinition[] = [];

  for (const wf of selection.selectedWorkflows) {
    for (const tool of wf.tools) {
      const baseCliName = tool.cli?.name ?? toKebabCase(tool.name);
      tools.push({
        cliName: baseCliName, // Will be disambiguated below
        mcpName: tool.name,
        workflow: wf.directoryName,
        description: tool.description,
        annotations: tool.annotations,
        mcpSchema: tool.schema,
        cliSchema: tool.cli?.schema ?? tool.schema,
        stateful: Boolean(tool.cli?.stateful),
        handler: tool.handler,
      });
    }
  }

  const disambiguated = disambiguateCliNames(tools);

  return createCatalog(disambiguated);
}

function createCatalog(tools: ToolDefinition[]): ToolCatalog {
  // Build lookup maps for fast resolution
  const byCliName = new Map<string, ToolDefinition>();
  const byMcpKebab = new Map<string, ToolDefinition[]>();

  for (const tool of tools) {
    byCliName.set(tool.cliName, tool);

    // Also index by the kebab-case of MCP name (for aliases)
    const mcpKebab = toKebabCase(tool.mcpName);
    const existing = byMcpKebab.get(mcpKebab) ?? [];
    byMcpKebab.set(mcpKebab, [...existing, tool]);
  }

  return {
    tools,

    getByCliName(name: string): ToolDefinition | null {
      return byCliName.get(name) ?? null;
    },

    resolve(input: string): ToolResolution {
      const normalized = input.toLowerCase().trim();

      // Try exact CLI name match first
      const exact = byCliName.get(normalized);
      if (exact) {
        return { tool: exact };
      }

      // Try kebab-case of MCP name (alias)
      const mcpKebab = toKebabCase(normalized);
      const aliasMatches = byMcpKebab.get(mcpKebab);
      if (aliasMatches && aliasMatches.length === 1) {
        return { tool: aliasMatches[0] };
      }
      if (aliasMatches && aliasMatches.length > 1) {
        return { ambiguous: aliasMatches.map((t) => t.cliName) };
      }

      // Try matching by MCP name directly (for underscore-style names)
      const byMcpDirect = tools.find(
        (t) => t.mcpName.toLowerCase() === normalized,
      );
      if (byMcpDirect) {
        return { tool: byMcpDirect };
      }

      return { notFound: true };
    },
  };
}

/**
 * Get a list of all available tool names for display.
 */
export function listToolNames(catalog: ToolCatalog): string[] {
  return catalog.tools.map((t) => t.cliName).sort();
}

/**
 * Get tools grouped by workflow for display.
 */
export function groupToolsByWorkflow(
  catalog: ToolCatalog,
): Map<string, ToolDefinition[]> {
  const groups = new Map<string, ToolDefinition[]>();

  for (const tool of catalog.tools) {
    const existing = groups.get(tool.workflow) ?? [];
    groups.set(tool.workflow, [...existing, tool]);
  }

  return groups;
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/cli.ts
```ts
#!/usr/bin/env node
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildToolCatalog } from './runtime/tool-catalog.ts';
import { buildYargsApp } from './cli/yargs-app.ts';

async function main(): Promise<void> {
  // CLI mode uses disableSessionDefaults to show all tool parameters as flags
  const result = await bootstrapRuntime({
    runtime: 'cli',
    configOverrides: {
      disableSessionDefaults: true,
    },
  });
  const catalog = await buildToolCatalog({
    enabledWorkflows: result.runtime.config.enabledWorkflows,
  });

  const yargsApp = buildYargsApp({
    catalog,
    runtimeConfig: result.runtime.config,
  });

  await yargsApp.parseAsync();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

```

File: /Volumes/Developer/XcodeBuildMCP/src/runtime/naming.ts
```ts
import type { ToolDefinition } from './types.ts';

/**
 * Convert a tool name to kebab-case for CLI usage.
 * Examples:
 *   build_sim -> build-sim
 *   startSimLogCap -> start-sim-log-cap
 *   BuildSimulator -> build-simulator
 */
export function toKebabCase(name: string): string {
  return name
    .trim()
    // Replace underscores with hyphens
    .replace(/_/g, '-')
    // Insert hyphen before uppercase letters (for camelCase/PascalCase)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Convert to lowercase
    .toLowerCase()
    // Remove any duplicate hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Convert kebab-case CLI flag back to camelCase for tool params.
 * Examples:
 *   project-path -> projectPath
 *   simulator-name -> simulatorName
 */
export function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Disambiguate CLI names when duplicates exist across workflows.
 * If multiple tools have the same kebab-case name, prefix with workflow name.
 */
export function disambiguateCliNames(tools: ToolDefinition[]): ToolDefinition[] {
  // Group tools by their base CLI name
  const groups = new Map<string, ToolDefinition[]>();
  for (const tool of tools) {
    const existing = groups.get(tool.cliName) ?? [];
    groups.set(tool.cliName, [...existing, tool]);
  }

  // Disambiguate tools that share the same CLI name
  return tools.map((tool) => {
    const sameNameTools = groups.get(tool.cliName) ?? [];
    if (sameNameTools.length <= 1) {
      return tool;
    }

    // Prefix with workflow name for disambiguation
    const disambiguatedName = `${tool.workflow}-${tool.cliName}`;
    return { ...tool, cliName: disambiguatedName };
  });
}

/**
 * Convert CLI argv keys (kebab-case) back to tool param keys (camelCase).
 */
export function convertArgvToToolParams(
  argv: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(argv)) {
    // Skip yargs internal keys
    if (key === '_' || key === '$0') continue;
    // Convert kebab-case to camelCase
    const camelKey = toCamelCase(key);
    result[camelKey] = value;
  }
  return result;
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/cli/commands/daemon.ts
```ts
import type { Argv } from 'yargs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { DaemonClient } from '../daemon-client.ts';
import { getSocketPath } from '../../daemon/socket-path.ts';

/**
 * Get the path to the daemon executable.
 */
function getDaemonPath(): string {
  // In the built output, daemon.js is in the same directory as cli.js
  const currentFile = fileURLToPath(import.meta.url);
  const buildDir = dirname(currentFile);
  return resolve(buildDir, 'daemon.js');
}

/**
 * Register daemon management commands.
 */
export function registerDaemonCommands(app: Argv): void {
  app.command(
    'daemon <action>',
    'Manage the xcodebuildcli daemon',
    (yargs) => {
      return yargs
        .positional('action', {
          describe: 'Daemon action',
          choices: ['start', 'stop', 'status', 'restart'] as const,
          demandOption: true,
        })
        .option('foreground', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Run daemon in foreground (for debugging)',
        });
    },
    async (argv) => {
      const action = argv.action as string;
      const socketPath = (argv.socket as string | undefined) ?? getSocketPath();
      const client = new DaemonClient({ socketPath });

      switch (action) {
        case 'status':
          await handleStatus(client);
          break;
        case 'stop':
          await handleStop(client);
          break;
        case 'start':
          await handleStart(socketPath, argv.foreground as boolean);
          break;
        case 'restart':
          await handleRestart(client, socketPath, argv.foreground as boolean);
          break;
      }
    },
  );
}

async function handleStatus(client: DaemonClient): Promise<void> {
  try {
    const status = await client.status();
    console.log('Daemon Status: Running');
    console.log(`  PID: ${status.pid}`);
    console.log(`  Socket: ${status.socketPath}`);
    console.log(`  Started: ${status.startedAt}`);
    console.log(`  Tools: ${status.toolCount}`);
    console.log(`  Workflows: ${status.enabledWorkflows.join(', ') || '(default)'}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not running')) {
      console.log('Daemon Status: Not running');
    } else {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  }
}

async function handleStop(client: DaemonClient): Promise<void> {
  try {
    await client.stop();
    console.log('Daemon stopped');
  } catch (err) {
    if (err instanceof Error && err.message.includes('not running')) {
      console.log('Daemon is not running');
    } else {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  }
}

async function handleStart(
  socketPath: string,
  foreground: boolean,
): Promise<void> {
  const client = new DaemonClient({ socketPath });

  // Check if already running
  const isRunning = await client.isRunning();
  if (isRunning) {
    console.log('Daemon is already running');
    return;
  }

  const daemonPath = getDaemonPath();

  if (foreground) {
    // Run in foreground (useful for debugging)
    console.log('Starting daemon in foreground...');
    console.log(`Socket: ${socketPath}`);
    console.log('Press Ctrl+C to stop\n');

    const child = spawn(process.execPath, [daemonPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        XCODEBUILDCLI_SOCKET: socketPath,
      },
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  } else {
    // Run in background (detached)
    const child = spawn(process.execPath, [daemonPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        XCODEBUILDCLI_SOCKET: socketPath,
      },
    });

    child.unref();

    // Wait a bit and check if it started
    await new Promise((resolve) => setTimeout(resolve, 500));

    const started = await client.isRunning();
    if (started) {
      console.log('Daemon started');
      console.log(`Socket: ${socketPath}`);
    } else {
      console.error('Failed to start daemon');
      process.exitCode = 1;
    }
  }
}

async function handleRestart(
  client: DaemonClient,
  socketPath: string,
  foreground: boolean,
): Promise<void> {
  // Try to stop existing daemon
  try {
    const isRunning = await client.isRunning();
    if (isRunning) {
      console.log('Stopping existing daemon...');
      await client.stop();
      // Wait for it to fully stop
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch {
    // Ignore errors during stop
  }

  // Start new daemon
  await handleStart(socketPath, foreground);
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/daemon/daemon-server.ts
```ts
import net from 'node:net';
import { writeFrame, createFrameReader } from './framing.ts';
import type { ToolCatalog } from '../runtime/types.ts';
import type {
  DaemonRequest,
  DaemonResponse,
  ToolInvokeParams,
  DaemonStatusResult,
  ToolListItem,
} from './protocol.ts';
import { DAEMON_PROTOCOL_VERSION } from './protocol.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';
import { log } from '../utils/logger.ts';

export interface DaemonServerContext {
  socketPath: string;
  startedAt: string;
  enabledWorkflows: string[];
  catalog: ToolCatalog;
}

/**
 * Start the daemon server listening on a Unix domain socket.
 */
export function startDaemonServer(ctx: DaemonServerContext): net.Server {
  const invoker = new DefaultToolInvoker(ctx.catalog);

  const server = net.createServer((socket) => {
    log('info', '[Daemon] Client connected');

    const onData = createFrameReader(
      async (msg) => {
        const req = msg as DaemonRequest;
        const base: Pick<DaemonResponse, 'v' | 'id'> = {
          v: DAEMON_PROTOCOL_VERSION,
          id: req?.id ?? 'unknown',
        };

        try {
          if (!req || typeof req !== 'object') {
            return writeFrame(socket, {
              ...base,
              error: { code: 'BAD_REQUEST', message: 'Invalid request format' },
            });
          }

          if (req.v !== DAEMON_PROTOCOL_VERSION) {
            return writeFrame(socket, {
              ...base,
              error: {
                code: 'BAD_REQUEST',
                message: `Unsupported protocol version: ${req.v}`,
              },
            });
          }

          switch (req.method) {
            case 'daemon.status': {
              const result: DaemonStatusResult = {
                pid: process.pid,
                socketPath: ctx.socketPath,
                startedAt: ctx.startedAt,
                enabledWorkflows: ctx.enabledWorkflows,
                toolCount: ctx.catalog.tools.length,
              };
              return writeFrame(socket, { ...base, result });
            }

            case 'daemon.stop': {
              log('info', '[Daemon] Stop requested');
              writeFrame(socket, { ...base, result: { ok: true } });
              // Close server and exit after a short delay to allow response to be sent
              setTimeout(() => {
                server.close(() => {
                  log('info', '[Daemon] Server closed, exiting');
                  process.exit(0);
                });
              }, 100);
              return;
            }

            case 'tool.list': {
              const result: ToolListItem[] = ctx.catalog.tools.map((t) => ({
                name: t.cliName,
                workflow: t.workflow,
                description: t.description ?? '',
                stateful: t.stateful,
              }));
              return writeFrame(socket, { ...base, result });
            }

            case 'tool.invoke': {
              const params = req.params as ToolInvokeParams;
              if (!params?.tool) {
                return writeFrame(socket, {
                  ...base,
                  error: { code: 'BAD_REQUEST', message: 'Missing tool parameter' },
                });
              }

              log('info', `[Daemon] Invoking tool: ${params.tool}`);
              const response = await invoker.invoke(params.tool, params.args ?? {}, {
                runtime: 'daemon',
                enabledWorkflows: ctx.enabledWorkflows,
              });

              return writeFrame(socket, { ...base, result: { response } });
            }

            default:
              return writeFrame(socket, {
                ...base,
                error: { code: 'BAD_REQUEST', message: `Unknown method: ${req.method}` },
              });
          }
        } catch (error) {
          log('error', `[Daemon] Error handling request: ${error}`);
          return writeFrame(socket, {
            ...base,
            error: {
              code: 'INTERNAL',
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      },
      (err) => {
        log('error', `[Daemon] Frame parse error: ${err.message}`);
      },
    );

    socket.on('data', onData);
    socket.on('close', () => {
      log('info', '[Daemon] Client disconnected');
    });
    socket.on('error', (err) => {
      log('error', `[Daemon] Socket error: ${err.message}`);
    });
  });

  server.on('error', (err) => {
    log('error', `[Daemon] Server error: ${err.message}`);
  });

  return server;
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/cli/yargs-app.ts
```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ToolCatalog } from '../runtime/types.ts';
import type { ResolvedRuntimeConfig } from '../utils/config-store.ts';
import { registerDaemonCommands } from './commands/daemon.ts';
import { registerToolsCommand } from './commands/tools.ts';
import { registerToolCommands } from './register-tool-commands.ts';
import { version } from '../version.ts';

export interface YargsAppOptions {
  catalog: ToolCatalog;
  runtimeConfig: ResolvedRuntimeConfig;
}

/**
 * Build the main yargs application with all commands registered.
 */
export function buildYargsApp(opts: YargsAppOptions): ReturnType<typeof yargs> {
  const app = yargs(hideBin(process.argv))
    .scriptName('xcodebuildcli')
    .strict()
    .recommendCommands()
    .wrap(Math.min(120, yargs().terminalWidth()))
    .parserConfiguration({
      // Accept --derived-data-path -> derivedDataPath
      'camel-case-expansion': true,
      // Support kebab-case flags cleanly
      'strip-dashed': true,
    })
    .option('socket', {
      type: 'string',
      describe: 'Override daemon unix socket path',
      global: true,
      hidden: true,
    })
    .option('daemon', {
      type: 'boolean',
      describe: 'Force daemon execution even for stateless tools',
      default: false,
      global: true,
      hidden: true,
    })
    .version(version)
    .help()
    .alias('h', 'help')
    .alias('v', 'version')
    .epilogue(
      `Run 'xcodebuildcli tools' to see all available tools.\n` +
        `Run 'xcodebuildcli <tool> --help' for tool-specific help.`,
    );

  // Register command groups
  registerDaemonCommands(app);
  registerToolsCommand(app, opts.catalog);
  registerToolCommands(app, opts.catalog);

  return app;
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/cli/register-tool-commands.ts
```ts
import type { Argv } from 'yargs';
import type { ToolCatalog } from '../runtime/types.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';
import { schemaToYargsOptions, getUnsupportedSchemaKeys } from './schema-to-yargs.ts';
import { convertArgvToToolParams } from '../runtime/naming.ts';
import { printToolResponse, type OutputFormat } from './output.ts';

/**
 * Register all tool commands from the catalog with yargs.
 */
export function registerToolCommands(
  app: Argv,
  catalog: ToolCatalog,
): void {
  const invoker = new DefaultToolInvoker(catalog);

  for (const tool of catalog.tools) {
    const yargsOptions = schemaToYargsOptions(tool.cliSchema);
    const unsupportedKeys = getUnsupportedSchemaKeys(tool.cliSchema);

    app.command(
      tool.cliName,
      tool.description ?? `Run the ${tool.mcpName} tool`,
      (yargs) => {
        // Add --json option for complex args or full override
        yargs.option('json', {
          type: 'string',
          describe: 'JSON object of tool args (merged with flags)',
        });

        // Add --output option for format control
        yargs.option('output', {
          type: 'string',
          choices: ['text', 'json'] as const,
          default: 'text',
          describe: 'Output format',
        });

        // Register schema-derived options
        for (const [flagName, config] of yargsOptions) {
          yargs.option(flagName, config);
        }

        // Add note about unsupported keys if any
        if (unsupportedKeys.length > 0) {
          yargs.epilogue(
            `Note: Complex parameters (${unsupportedKeys.join(', ')}) must be passed via --json`,
          );
        }

        return yargs;
      },
      async (argv) => {
        // Extract our options
        const jsonArg = argv.json as string | undefined;
        const outputFormat = (argv.output as OutputFormat) ?? 'text';
        const socketPath = argv.socket as string | undefined;
        const forceDaemon = argv.daemon as boolean | undefined;

        // Parse JSON args if provided
        let jsonArgs: Record<string, unknown> = {};
        if (jsonArg) {
          try {
            jsonArgs = JSON.parse(jsonArg) as Record<string, unknown>;
          } catch {
            console.error(`Error: Invalid JSON in --json argument`);
            process.exitCode = 1;
            return;
          }
        }

        // Convert CLI argv to tool params (kebab-case -> camelCase)
        // Remove our internal options first
        const { json, output, socket, daemon, _, $0, ...flagArgs } = argv as Record<string, unknown>;
        const toolParams = convertArgvToToolParams(flagArgs);

        // Merge: flag args first, then JSON overrides
        const args = { ...toolParams, ...jsonArgs };

        // Invoke the tool
        const response = await invoker.invoke(tool.cliName, args, {
          runtime: 'cli',
          forceDaemon: Boolean(forceDaemon),
          socketPath,
        });

        printToolResponse(response, outputFormat);
      },
    );
  }
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/cli/daemon-client.ts
```ts
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { writeFrame, createFrameReader } from '../daemon/framing.ts';
import {
  DAEMON_PROTOCOL_VERSION,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonMethod,
  type ToolInvokeParams,
  type DaemonStatusResult,
  type ToolListItem,
} from '../daemon/protocol.ts';
import type { ToolResponse } from '../types/common.ts';
import { getSocketPath } from '../daemon/socket-path.ts';

export interface DaemonClientOptions {
  socketPath?: string;
  timeout?: number;
}

export class DaemonClient {
  private socketPath: string;
  private timeout: number;

  constructor(opts: DaemonClientOptions = {}) {
    this.socketPath = opts.socketPath ?? getSocketPath();
    this.timeout = opts.timeout ?? 30000;
  }

  /**
   * Send a request to the daemon and wait for a response.
   */
  async request<TResult>(
    method: DaemonMethod,
    params?: unknown,
  ): Promise<TResult> {
    const id = randomUUID();
    const req: DaemonRequest = {
      v: DAEMON_PROTOCOL_VERSION,
      id,
      method,
      params,
    };

    return new Promise<TResult>((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
        }
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Daemon request timed out after ${this.timeout}ms`));
      }, this.timeout);

      socket.on('error', (err) => {
        clearTimeout(timeoutId);
        cleanup();
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOENT')) {
          reject(new Error('Daemon is not running. Start it with: xcodebuildcli daemon start'));
        } else {
          reject(err);
        }
      });

      const onData = createFrameReader(
        (msg) => {
          const res = msg as DaemonResponse<TResult>;
          if (res.id !== id) return;

          clearTimeout(timeoutId);
          resolved = true;
          socket.end();

          if (res.error) {
            reject(new Error(`${res.error.code}: ${res.error.message}`));
          } else {
            resolve(res.result as TResult);
          }
        },
        (err) => {
          clearTimeout(timeoutId);
          cleanup();
          reject(err);
        },
      );

      socket.on('data', onData);
      socket.on('connect', () => {
        writeFrame(socket, req);
      });
    });
  }

  /**
   * Get daemon status.
   */
  async status(): Promise<DaemonStatusResult> {
    return this.request<DaemonStatusResult>('daemon.status');
  }

  /**
   * Stop the daemon.
   */
  async stop(): Promise<void> {
    await this.request<{ ok: boolean }>('daemon.stop');
  }

  /**
   * List available tools.
   */
  async listTools(): Promise<ToolListItem[]> {
    return this.request<ToolListItem[]>('tool.list');
  }

  /**
   * Invoke a tool.
   */
  async invokeTool(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<ToolResponse> {
    const result = await this.request<{ response: ToolResponse }>(
      'tool.invoke',
      { tool, args } satisfies ToolInvokeParams,
    );
    return result.response;
  }

  /**
   * Check if daemon is running by attempting to connect.
   */
  async isRunning(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const socket = net.createConnection(this.socketPath);

      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });
    });
  }
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/runtime/tool-invoker.ts
```ts
import type { ToolCatalog, ToolInvoker, InvokeOptions } from './types.ts';
import type { ToolResponse } from '../types/common.ts';
import { createErrorResponse } from '../utils/responses/index.ts';
import { DaemonClient } from '../cli/daemon-client.ts';

export class DefaultToolInvoker implements ToolInvoker {
  constructor(private catalog: ToolCatalog) {}

  async invoke(
    toolName: string,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    const resolved = this.catalog.resolve(toolName);

    if (resolved.ambiguous) {
      return createErrorResponse(
        'Ambiguous tool name',
        `Multiple tools match '${toolName}'. Use one of:\n- ${resolved.ambiguous.join('\n- ')}`,
      );
    }

    if (resolved.notFound || !resolved.tool) {
      return createErrorResponse(
        'Tool not found',
        `Unknown tool '${toolName}'. Run 'xcodebuildcli tools' to see available tools.`,
      );
    }

    const tool = resolved.tool;

    // Check if tool requires daemon routing
    const mustUseDaemon = tool.stateful || Boolean(opts.forceDaemon);

    if (mustUseDaemon && opts.runtime === 'cli') {
      // Route through daemon
      const client = new DaemonClient({ socketPath: opts.socketPath });

      // Check if daemon is running
      const isRunning = await client.isRunning();
      if (!isRunning) {
        return createErrorResponse(
          'Daemon not running',
          `Tool '${tool.cliName}' requires the daemon for stateful operations.\n` +
            `Start the daemon with: xcodebuildcli daemon start`,
        );
      }

      try {
        return await client.invokeTool(tool.cliName, args);
      } catch (error) {
        return createErrorResponse(
          'Daemon invocation failed',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Direct invocation (CLI stateless or daemon internal)
    try {
      return await tool.handler(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Tool execution failed', message);
    }
  }
}

```

File: /Volumes/Developer/XcodeBuildMCP/src/daemon.ts
```ts
#!/usr/bin/env node
import net from 'node:net';
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildToolCatalog } from './runtime/tool-catalog.ts';
import {
  ensureSocketDir,
  removeStaleSocket,
  getSocketPath,
} from './daemon/socket-path.ts';
import { startDaemonServer } from './daemon/daemon-server.ts';
import { log } from './utils/logger.ts';
import { version } from './version.ts';

async function checkExistingDaemon(socketPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection(socketPath);

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  log('info', `[Daemon] xcodebuildcli daemon ${version} starting...`);

  const socketPath = getSocketPath();
  ensureSocketDir(socketPath);

  // Check if daemon is already running
  const isRunning = await checkExistingDaemon(socketPath);
  if (isRunning) {
    log('error', '[Daemon] Another daemon is already running');
    console.error('Error: Daemon is already running');
    process.exit(1);
  }

  // Remove stale socket file
  removeStaleSocket(socketPath);

  // Bootstrap runtime with full schema (disableSessionDefaults)
  const result = await bootstrapRuntime({
    runtime: 'daemon',
    configOverrides: {
      disableSessionDefaults: true,
    },
  });

  // Build tool catalog
  const catalog = await buildToolCatalog({
    enabledWorkflows: result.runtime.config.enabledWorkflows,
  });

  log('info', `[Daemon] Loaded ${catalog.tools.length} tools`);

  // Start server
  const server = startDaemonServer({
    socketPath,
    startedAt: new Date().toISOString(),
    enabledWorkflows: result.runtime.config.enabledWorkflows,
    catalog,
  });

  server.listen(socketPath, () => {
    log('info', `[Daemon] Listening on ${socketPath}`);
    console.log(`Daemon started (PID: ${process.pid})`);
    console.log(`Socket: ${socketPath}`);
    console.log(`Tools: ${catalog.tools.length}`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    log('info', '[Daemon] Shutting down...');
    server.close(() => {
      removeStaleSocket(socketPath);
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Daemon error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

```

File: /Volumes/Developer/XcodeBuildMCP/src/runtime/types.ts
```ts
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types/common.ts';
import type { ToolSchemaShape, PluginMeta } from '../core/plugin-types.ts';

export type RuntimeKind = 'cli' | 'daemon' | 'mcp';

export interface ToolDefinition {
  /** Stable CLI command name (kebab-case, disambiguated) */
  cliName: string;

  /** Original MCP tool name as declared (unchanged) */
  mcpName: string;

  /** Workflow directory name (e.g., "simulator", "device", "logging") */
  workflow: string;

  description?: string;
  annotations?: ToolAnnotations;

  /**
   * Schema shape used to generate yargs flags for CLI.
   * Must include ALL parameters (not the session-default-hidden version).
   */
  cliSchema: ToolSchemaShape;

  /**
   * Schema shape used for MCP registration.
   */
  mcpSchema: ToolSchemaShape;

  /**
   * Whether CLI MUST route this tool to the daemon (stateful operations).
   */
  stateful: boolean;

  /**
   * Shared handler (same used by MCP). No duplication.
   */
  handler: PluginMeta['handler'];
}

export interface ToolResolution {
  tool?: ToolDefinition;
  ambiguous?: string[];
  notFound?: boolean;
}

export interface ToolCatalog {
  tools: ToolDefinition[];

  /** Exact match on cliName */
  getByCliName(name: string): ToolDefinition | null;

  /** Resolve user input, supporting aliases + ambiguity reporting */
  resolve(input: string): ToolResolution;
}

export interface InvokeOptions {
  runtime: RuntimeKind;
  /** If present, overrides enabled workflows */
  enabledWorkflows?: string[];
  /** If true, route even stateless tools to daemon */
  forceDaemon?: boolean;
  /** Socket path override */
  socketPath?: string;
}

export interface ToolInvoker {
  invoke(
    toolName: string,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse>;
}

```
</file_contents>
<user_instructions>
<taskname=Per-workspace daemons/>
<task>Create a detailed implementation plan for per-workspace daemon architecture with auto-start by default for xcodebuildcli. Use current daemon/CLI implementation to propose where to change socket-path derivation, auto-start logic, new daemon list command, and --no-daemon opt-out behavior. Include design decisions (socket path strategy, timeout, lifecycle) and how manual daemon commands remain.</task>
<architecture>
- CLI entry: xcodebuildcli uses `src/cli.ts` -> `buildYargsApp` and `registerToolCommands`.
- Tool invocation: `DefaultToolInvoker` routes to daemon when tool is stateful or forceDaemon is set; currently errors if daemon not running.
- Daemon control: `registerDaemonCommands` provides start/stop/status/restart and uses `getSocketPath` from `src/daemon/socket-path.ts`.
- Daemon runtime: `src/daemon.ts` sets up socket path, checks for existing daemon, removes stale socket, starts `startDaemonServer`.
- Daemon client: `DaemonClient` connects to socket path, provides status/stop/isRunning/invokeTool.
- Socket path: `getSocketPath` reads XCODEBUILDCLI_SOCKET env or defaults to `~/.xcodebuildcli/daemon.sock`.</architecture>
<selected_context>
XcodeBuildMCP/src/daemon/socket-path.ts: global socket path helpers (default path, ensure dir, remove stale, env override).
XcodeBuildMCP/src/runtime/tool-invoker.ts: daemon routing for stateful tools; current error path when daemon not running.
XcodeBuildMCP/src/cli.ts: CLI bootstrap.
XcodeBuildMCP/src/cli/commands/daemon.ts: start/stop/status/restart; spawn daemon.js, uses XCODEBUILDCLI_SOCKET; 500ms startup wait.
XcodeBuildMCP/src/daemon.ts: daemon entry point, checks existing daemon, removes stale socket, starts server.
XcodeBuildMCP/src/daemon/daemon-server.ts: daemon request router, status/stop/tool.list/tool.invoke.
XcodeBuildMCP/src/cli/daemon-client.ts: request protocol, isRunning, timeouts, error messages.
XcodeBuildMCP/src/cli/yargs-app.ts: global hidden flags --socket and --daemon.
XcodeBuildMCP/src/cli/register-tool-commands.ts: constructs args, passes forceDaemon + socketPath to invoker.
XcodeBuildMCP/src/runtime/naming.ts: argv conversion utilities.
XcodeBuildMCP/src/runtime/tool-catalog.ts: tool catalog with stateful flag from plugin metadata.
XcodeBuildMCP/src/runtime/types.ts: ToolDefinition/InvokeOptions.
XcodeBuildMCP/docs/dev/CLI_CONVERSION_PLAN.md: historical plan; includes phase 4 auto-start note and overall architecture context.
</selected_context>
<relationships>
- CLI command -> `register-tool-commands` -> `DefaultToolInvoker.invoke()` -> `DaemonClient` for stateful tools in CLI runtime.
- `registerDaemonCommands` + `DaemonClient` + `daemon.ts` all rely on `getSocketPath()` (global path unless env override).
- Auto-start would be triggered from `DefaultToolInvoker` when daemon required, or earlier in CLI handler.
- `--daemon` (forceDaemon) and `--socket` flags are passed into `DefaultToolInvoker` and `DaemonClient`.</relationships>
<ambiguities>
- Socket path strategy not decided (hash of cwd vs encoded path vs registry); need to choose and document.
- Auto-start timeout and readiness detection not defined (currently hardcoded 500ms in daemon start command).
- Daemon lifecycle/idle shutdown policy not defined.
</ambiguities>

Notes: Potentially relevant but not selected: `src/daemon/protocol.ts`, `src/daemon/framing.ts`, `src/cli/commands/tools.ts`, `src/utils/config-store.ts`, `src/utils/session-store.ts` if plan needs broader runtime config or tool listing behaviors.
</user_instructions>
