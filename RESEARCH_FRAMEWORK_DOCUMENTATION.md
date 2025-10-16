# XcodeBuildMCP Framework Documentation Research

**Generated:** 2025-10-12
**Purpose:** Comprehensive analysis of XcodeBuildMCP's actual implementation, capabilities, and verified behavior patterns.

---

## Table of Contents

1. [Actual Tool Capabilities](#1-actual-tool-capabilities)
2. [Session Defaults System](#2-session-defaults-system)
3. [Platform-Specific Behavior](#3-platform-specific-behavior)
4. [Log Capture Implementation](#4-log-capture-implementation)
5. [Swift Package Tools](#5-swift-package-tools)
6. [Test Coverage Analysis](#6-test-coverage-analysis)
7. [Common Agent Failure Patterns](#7-common-agent-failure-patterns)

---

## 1. Actual Tool Capabilities

### 1.1 Tool Organization

XcodeBuildMCP provides **83 total tools** (61 canonical + 22 re-exports) organized into **12 workflow groups**:

```
src/mcp/tools/
├── device/                  # 15 tools - Physical device workflows
├── discovery/               # 1 tool - Dynamic tool discovery
├── doctor/                  # 1 tool - System diagnostics
├── logging/                 # 4 tools - Log capture
├── macos/                   # 12 tools - macOS development
├── project-discovery/       # 6 tools - Project analysis
├── project-scaffolding/     # 2 tools - Project creation
├── session-management/      # 3 tools - Session defaults
├── simulator/               # 23 tools - Simulator workflows
├── simulator-management/    # 9 tools - Simulator control
├── swift-package/           # 6 tools - Swift Package Manager
├── ui-testing/              # 12 tools - UI automation
└── utilities/               # 1 tool - Clean operations
```

**Reference:** `docs/TOOLS.md:1-113`

### 1.2 Tool Structure Pattern

All tools follow a consistent, testable pattern using dependency injection:

```typescript
// Pattern from: src/mcp/tools/simulator/build_sim.ts:1-187
export async function build_simLogic(
  params: BuildSimulatorParams,
  executor: CommandExecutor,  // Injected dependency
): Promise<ToolResponse> {
  // Core business logic here
}

export default {
  name: 'build_sim',
  description: 'Builds an app for a simulator.',
  schema: publicSchemaObject.shape,  // MCP SDK compatibility
  handler: createSessionAwareTool<BuildSimulatorParams>({
    internalSchema: buildSimulatorSchema,
    logicFunction: build_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [...],
    exclusivePairs: [...]
  }),
};
```

**Key Characteristics:**
- Separate `*Logic` function for testability
- Zod schema validation
- Session-aware parameter merging
- CommandExecutor dependency injection

**Reference:** `src/mcp/tools/simulator/build_sim.ts:140-187`

### 1.3 Test Coverage

**Total Test Files:** 78 comprehensive test files

**Test Pattern:** Dependency injection with mock executors (NO Vitest mocking allowed)

```typescript
// Pattern from: src/mcp/tools/simulator/__tests__/build_sim.test.ts:77-99
it('should handle empty workspacePath parameter', async () => {
  const mockExecutor = createMockExecutor({
    success: true,
    output: 'BUILD SUCCEEDED'
  });

  const result = await build_simLogic(
    {
      workspacePath: '',
      scheme: 'MyScheme',
      simulatorName: 'iPhone 16',
    },
    mockExecutor,
  );

  expect(result.content).toEqual([
    { type: 'text', text: '✅ iOS Simulator Build build succeeded...' },
    { type: 'text', text: expect.stringContaining('Next Steps:') },
  ]);
});
```

**Reference:** `src/mcp/tools/simulator/__tests__/build_sim.test.ts:1-684`

---

## 2. Session Defaults System

### 2.1 How Session Defaults Work

Session defaults provide a persistent parameter store that tools can read from, reducing repetitive parameter passing:

```typescript
// Implementation: src/utils/session-store.ts:1-48
export type SessionDefaults = {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
  configuration?: string;
  simulatorName?: string;
  simulatorId?: string;
  deviceId?: string;
  useLatestOS?: boolean;
  arch?: 'arm64' | 'x86_64';
};

class SessionStore {
  private defaults: SessionDefaults = {};

  setDefaults(partial: Partial<SessionDefaults>): void {
    this.defaults = { ...this.defaults, ...partial };
  }

  get<K extends keyof SessionDefaults>(key: K): SessionDefaults[K] {
    return this.defaults[key];
  }

  getAll(): SessionDefaults { return { ...this.defaults }; }
}
```

**Reference:** `src/utils/session-store.ts:3-48`

### 2.2 Setting Session Defaults

```typescript
// Tool definition: src/mcp/tools/session-management/session_set_defaults.ts:1-58
session-set-defaults({
  workspacePath: "/path/to/MyApp.xcworkspace",
  scheme: "MyScheme",
  configuration: "Debug",
  simulatorName: "iPhone 16"
})
```

**Mutual Exclusivity Rules:**
1. `projectPath` ⊕ `workspacePath` - Cannot set both
2. `simulatorId` ⊕ `simulatorName` - Cannot set both

**Automatic Clearing:** Setting one side of a mutually exclusive pair clears the other:

```typescript
// From: src/mcp/tools/session-management/session_set_defaults.ts:31-48
export async function sessionSetDefaultsLogic(params: Params): Promise<ToolResponse> {
  // Clear mutually exclusive counterparts before merging
  const toClear = new Set<keyof SessionDefaults>();
  if (Object.prototype.hasOwnProperty.call(params, 'projectPath'))
    toClear.add('workspacePath');
  if (Object.prototype.hasOwnProperty.call(params, 'workspacePath'))
    toClear.add('projectPath');
  if (Object.prototype.hasOwnProperty.call(params, 'simulatorId'))
    toClear.add('simulatorName');
  if (Object.prototype.hasOwnProperty.call(params, 'simulatorName'))
    toClear.add('simulatorId');

  if (toClear.size > 0) {
    sessionStore.clear(Array.from(toClear));
  }

  sessionStore.setDefaults(params as Partial<SessionDefaults>);
  return { content: [...], isError: false };
}
```

**Reference:** `src/mcp/tools/session-management/session_set_defaults.ts:31-48`

### 2.3 Session-Aware Tool Pattern

Tools use `createSessionAwareTool` to merge session defaults with explicit parameters:

```typescript
// Pattern from: src/utils/typed-tool-factory.ts:74-174
export function createSessionAwareTool<TParams>(opts: {
  internalSchema: z.ZodType<TParams>;
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>;
  getExecutor: () => CommandExecutor;
  requirements?: SessionRequirement[];  // Validation rules
  exclusivePairs?: (keyof SessionDefaults)[][];  // XOR constraints
}) {
  return async (rawArgs: Record<string, unknown>): Promise<ToolResponse> => {
    // 1. Sanitize: treat null/undefined as "not provided"
    const sanitizedArgs = Object.entries(rawArgs)
      .filter(([_, v]) => v !== null && v !== undefined)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    // 2. Merge: session defaults + explicit args (args override)
    const merged = { ...sessionStore.getAll(), ...sanitizedArgs };

    // 3. Apply exclusive pair pruning
    for (const pair of exclusivePairs) {
      const userProvidedConcrete = pair.some(k =>
        Object.prototype.hasOwnProperty.call(sanitizedArgs, k)
      );
      if (userProvidedConcrete) {
        // Drop conflicting session defaults
        for (const k of pair) {
          if (!Object.prototype.hasOwnProperty.call(sanitizedArgs, k)) {
            delete merged[k];
          }
        }
      }
    }

    // 4. Validate requirements
    for (const req of requirements) {
      if ('allOf' in req) {
        const missing = req.allOf.filter(k => merged[k] == null);
        if (missing.length > 0) {
          return createErrorResponse('Missing required session defaults', ...);
        }
      }
      if ('oneOf' in req) {
        const satisfied = req.oneOf.some(k => merged[k] != null);
        if (!satisfied) {
          return createErrorResponse('Missing required session defaults', ...);
        }
      }
    }

    // 5. Execute with merged params
    const validated = internalSchema.parse(merged);
    return await logicFunction(validated, getExecutor());
  };
}
```

**Reference:** `src/utils/typed-tool-factory.ts:74-174`

### 2.4 Parameter Requirements

Example from `build_sim`:

```typescript
// From: src/mcp/tools/simulator/build_sim.ts:172-186
handler: createSessionAwareTool<BuildSimulatorParams>({
  internalSchema: buildSimulatorSchema,
  logicFunction: build_simLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { allOf: ['scheme'], message: 'scheme is required' },
    { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
    { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
  ],
  exclusivePairs: [
    ['projectPath', 'workspacePath'],
    ['simulatorId', 'simulatorName'],
  ],
}),
```

**Validation Behavior:**
- `allOf: ['scheme']` - MUST be provided (either in call or session defaults)
- `oneOf: ['projectPath', 'workspacePath']` - Exactly ONE must be set
- `exclusivePairs` - If user provides one, conflicting session default is dropped

**Reference:** `src/mcp/tools/simulator/build_sim.ts:172-186`

---

## 3. Platform-Specific Behavior

### 3.1 Platform Parameter in Simulator Tools

The `platform` parameter controls which Apple platform simulator to target:

```typescript
// From: src/mcp/tools/simulator/build_sim.ts:21-25
platform: z
  .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
  .optional()
  .default('iOS Simulator')
  .describe('Target simulator platform (defaults to iOS Simulator)')
```

**Key Insight:** `platform` is **NOT session-managed** - it must be specified per-call if different from default:

```typescript
// From: src/mcp/tools/simulator/build_sim.ts:157-166
// Public schema = internal minus session-managed fields
const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
  scheme: true,
  configuration: true,
  simulatorId: true,
  simulatorName: true,
  useLatestOS: true,
  // platform is NOT omitted - it's available for clients to specify
} as const);
```

**Reference:** `src/mcp/tools/simulator/build_sim.ts:21-25, 157-166`

### 3.2 Platform Mapping

```typescript
// From: src/mcp/tools/simulator/build_sim.ts:94-102
const platformMap: Record<string, XcodePlatform> = {
  'iOS Simulator': XcodePlatform.iOSSimulator,
  'watchOS Simulator': XcodePlatform.watchOSSimulator,
  'tvOS Simulator': XcodePlatform.tvOSSimulator,
  'visionOS Simulator': XcodePlatform.visionOSSimulator,
};

const platform = platformMap[params.platform ?? 'iOS Simulator'] ?? XcodePlatform.iOSSimulator;
```

**Reference:** `src/mcp/tools/simulator/build_sim.ts:94-102`

### 3.3 Device vs Simulator Naming

**Device Tools:**
- `build_device` - Physical device build
- `test_device` - Physical device testing
- `start_device_log_cap` - Device log capture
- Required: `deviceId` (UDID from `list_devices`)

**Simulator Tools:**
- `build_sim` - Simulator build
- `test_sim` - Simulator testing
- `start_sim_log_cap` - Simulator log capture
- Required: `simulatorId` OR `simulatorName`

**Simulator Identification:**
```typescript
// From: src/mcp/tools/simulator/build_sim.ts:26-37
simulatorId: z
  .string()
  .optional()
  .describe('UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both'),
simulatorName: z
  .string()
  .optional()
  .describe("Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both"),
```

**Reference:** `src/mcp/tools/simulator/build_sim.ts:26-37`

### 3.4 macOS Platform Distinction

**test_sim Platform Validation:**

```typescript
// From: src/mcp/tools/simulator/test_sim.ts:81-83
.refine((val) => val.platform !== 'macOS', {
  message: 'macOS platform is not supported by test_sim. Use test_macos tool instead for macOS projects.',
})
```

**Separate macOS Tools:**
- `build_macos` - macOS native builds
- `test_macos` - macOS native testing
- `launch_mac_app` - Launch macOS apps
- `stop_mac_app` - Stop macOS apps

**Reference:** `src/mcp/tools/simulator/test_sim.ts:81-83`

---

## 4. Log Capture Implementation

### 4.1 Device Log Capture Architecture

**Session Management:** Log sessions tracked in global Map:

```typescript
// From: src/mcp/tools/logging/start_device_log_cap.ts:31
export const activeDeviceLogSessions = new Map();
```

**Start Capture Process:**

```typescript
// From: src/mcp/tools/logging/start_device_log_cap.ts:38-105
export async function startDeviceLogCapture(
  params: { deviceUuid: string; bundleId: string },
  executor: CommandExecutor,
  fileSystemExecutor?: FileSystemExecutor,
): Promise<{ sessionId: string; error?: string }> {
  // 1. Clean old logs (older than LOG_RETENTION_DAYS)
  await cleanOldDeviceLogs();

  // 2. Generate session ID and log file path
  const logSessionId = uuidv4();
  const logFileName = `${DEVICE_LOG_FILE_PREFIX}${logSessionId}.log`;
  const logFilePath = path.join(os.tmpdir(), logFileName);

  // 3. Create log file
  await fileSystemExecutor.writeFile(logFilePath, '');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  // 4. Launch app with console output
  const result = await executor(
    [
      'xcrun', 'devicectl', 'device', 'process', 'launch',
      '--console',
      '--terminate-existing',
      '--device', deviceUuid,
      bundleId,
    ],
    'Device Log Capture',
    true,
    undefined,
  );

  // 5. Store session
  activeDeviceLogSessions.set(logSessionId, {
    process: result.process,
    logFilePath,
    deviceUuid,
    bundleId,
  });

  return { sessionId: logSessionId };
}
```

**Reference:** `src/mcp/tools/logging/start_device_log_cap.ts:38-105`

**Stop Capture Process:**

```typescript
// From: src/mcp/tools/logging/stop_device_log_cap.ts:54-133
export async function stop_device_log_capLogic(
  params: StopDeviceLogCapParams,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  const { logSessionId } = params;

  // 1. Retrieve session
  const sessionData = activeDeviceLogSessions.get(logSessionId);
  if (!sessionData) {
    return createErrorResponse('Device log capture session not found: ' + logSessionId);
  }

  // 2. Validate session structure
  if (!isValidDeviceLogSession(sessionData)) {
    return createErrorResponse('Invalid session structure');
  }

  // 3. Kill process
  if (!session.process.killed && session.process.exitCode === null) {
    session.process.kill?.('SIGTERM');
  }

  // 4. Remove from active sessions
  activeDeviceLogSessions.delete(logSessionId);

  // 5. Read log file
  const fileContent = await fileSystemExecutor.readFile(logFilePath, 'utf-8');

  // 6. Return captured logs
  return {
    content: [{
      type: 'text',
      text: `✅ Device log capture session stopped successfully

Session ID: ${logSessionId}

--- Captured Logs ---
${fileContent}`,
    }],
  };
}
```

**Reference:** `src/mcp/tools/logging/stop_device_log_cap.ts:54-133`

### 4.2 Why Agents Fail at Log Capture

**Common Failure Pattern:**

1. Agent calls `start_device_log_cap({ deviceId: "...", bundleId: "..." })`
2. Receives session ID in response
3. **FAILS:** Immediately calls `stop_device_log_cap` without waiting for log data
4. Result: Empty or minimal log output

**Root Cause Analysis:**

```typescript
// From: src/mcp/tools/logging/start_device_log_cap.ts:72-87
const result = await executor(
  [
    'xcrun', 'devicectl', 'device', 'process', 'launch',
    '--console',  // <-- Console output is captured continuously
    '--terminate-existing',
    '--device', deviceUuid,
    bundleId,
  ],
  'Device Log Capture',
  true,  // <-- useShell flag
  undefined,
);
```

**The Process:**
1. `xcrun devicectl` launches app and **streams console output continuously**
2. Output is written to log file via `createWriteStream`
3. **Process keeps running** until app is terminated or session is stopped
4. Stopping immediately = capturing only launch logs, not runtime behavior

**Correct Usage Pattern:**

```typescript
// 1. Start capture
const startResult = await start_device_log_cap({
  deviceId: "00008110-001A2C3D4E5F",
  bundleId: "com.example.MyApp"
});
// Response: "Session ID: 550e8400-e29b-41d4-a716-446655440000"

// 2. WAIT for user interaction or test execution
// ... app runs, generates logs, user interacts ...
// Minimum: 5-10 seconds for meaningful log capture

// 3. Stop capture
const stopResult = await stop_device_log_cap({
  logSessionId: "550e8400-e29b-41d4-a716-446655440000"
});
// Now returns substantial captured log data
```

**Reference:** `src/mcp/tools/logging/start_device_log_cap.ts:70-97`

### 4.3 Simulator Log Capture Differences

**Simulator vs Device Differences:**

```typescript
// Note from: src/mcp/tools/logging/start_device_log_cap.ts:26-30
// Note: Device and simulator logging use different approaches due to platform constraints:
// - Simulators use 'xcrun simctl' with console-pty and OSLog stream capabilities
// - Devices use 'xcrun devicectl' with console output only (no OSLog streaming)
// The different command structures and output formats make sharing infrastructure complex.
```

**Simulator Advantages:**
- `xcrun simctl` supports both console output AND structured OSLog streaming
- Can capture system logs alongside app logs
- More granular control over log filtering

**Device Limitations:**
- `xcrun devicectl` only captures console output
- No access to system-level OSLog streams
- Must rely on app's explicit logging

**Reference:** `src/mcp/tools/logging/start_device_log_cap.ts:26-30`

---

## 5. Swift Package Tools

### 5.1 Swift Package Tool Set

Six tools for complete Swift Package Manager workflow:

```typescript
// Workflow group: src/mcp/tools/swift-package/
- swift_package_build   // Build packages
- swift_package_test    // Run tests
- swift_package_run     // Execute targets
- swift_package_clean   // Clean build artifacts
- swift_package_list    // List running processes
- swift_package_stop    // Stop running executables
```

**Reference:** `docs/TOOLS.md:78-86`

### 5.2 swift_package_build

```typescript
// From: src/mcp/tools/swift-package/swift_package_build.ts:11-74
export async function swift_package_buildLogic(
  params: SwiftPackageBuildParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const resolvedPath = path.resolve(params.packagePath);
  const swiftArgs = ['build', '--package-path', resolvedPath];

  if (params.configuration && params.configuration.toLowerCase() === 'release') {
    swiftArgs.push('-c', 'release');
  }

  if (params.targetName) {
    swiftArgs.push('--target', params.targetName);
  }

  if (params.architectures) {
    for (const arch of params.architectures) {
      swiftArgs.push('--arch', arch);
    }
  }

  if (params.parseAsLibrary) {
    swiftArgs.push('-Xswiftc', '-parse-as-library');
  }

  const result = await executor(['swift', ...swiftArgs], 'Swift Package Build', true);

  if (!result.success) {
    return createErrorResponse('Swift package build failed', result.error ?? result.output);
  }

  return {
    content: [
      { type: 'text', text: '✅ Swift package build succeeded.' },
      { type: 'text', text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run' },
      { type: 'text', text: result.output },
    ],
  };
}
```

**Parameters:**
- `packagePath` (required) - Path to Package.swift directory
- `targetName` (optional) - Specific target to build
- `configuration` (optional) - 'debug' or 'release'
- `architectures` (optional) - Array of architectures (e.g., ['arm64', 'x86_64'])
- `parseAsLibrary` (optional) - Add `-parse-as-library` flag for @main support

**Reference:** `src/mcp/tools/swift-package/swift_package_build.ts:25-74`

### 5.3 swift_package_run

```typescript
// From: src/mcp/tools/swift-package/swift_package_run.ts:37-220
export async function swift_package_runLogic(
  params: SwiftPackageRunParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const resolvedPath = path.resolve(params.packagePath);
  const timeout = Math.min(params.timeout ?? 30, 300) * 1000; // Max 5 minutes

  const swiftArgs = ['run', '--package-path', resolvedPath];

  if (params.configuration && params.configuration.toLowerCase() === 'release') {
    swiftArgs.push('-c', 'release');
  }

  if (params.parseAsLibrary) {
    swiftArgs.push('-Xswiftc', '-parse-as-library');
  }

  if (params.executableName) {
    swiftArgs.push(params.executableName);
  }

  // Add double dash before executable arguments
  if (params.arguments && params.arguments.length > 0) {
    swiftArgs.push('--');
    swiftArgs.push(...params.arguments);
  }

  if (params.background) {
    // Background mode: start process and return immediately
    const command = ['swift', ...swiftArgs];
    const result = await executor(command, 'Swift Package Run (Background)', true, cleanEnv, true);

    if (result.process?.pid) {
      addProcess(result.process.pid, {
        process: result.process,
        startedAt: new Date(),
      });

      return {
        content: [
          createTextContent(
            `🚀 Started executable in background (PID: ${result.process.pid})
💡 Process is running independently. Use swift_package_stop with PID ${result.process.pid} to terminate when needed.`
          ),
        ],
      };
    }
  } else {
    // Foreground mode: wait for completion or timeout
    const commandPromise = executor(command, 'Swift Package Run', true);
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ success: false, timedOut: true, ... }), timeout);
    });

    const result = await Promise.race([commandPromise, timeoutPromise]);

    if ('timedOut' in result && result.timedOut) {
      return {
        content: [
          createTextContent(`⏱️ Process timed out after ${timeout / 1000} seconds.`),
          createTextContent(result.output || '(no output so far)'),
        ],
      };
    }

    return {
      content: [
        createTextContent('✅ Swift executable completed successfully.'),
        createTextContent(result.output || '(no output)'),
      ],
    };
  }
}
```

**Parameters:**
- `packagePath` (required) - Path to Package.swift directory
- `executableName` (optional) - Name of executable target (defaults to package name)
- `arguments` (optional) - Array of arguments for executable
- `configuration` (optional) - 'debug' or 'release'
- `timeout` (optional) - Timeout in seconds (default: 30, max: 300)
- `background` (optional) - Run in background (default: false)
- `parseAsLibrary` (optional) - Add `-parse-as-library` flag

**Background vs Foreground:**
- **Foreground:** Waits for completion, returns output, subject to timeout
- **Background:** Returns immediately with PID, runs independently

**Reference:** `src/mcp/tools/swift-package/swift_package_run.ts:37-220`

### 5.4 Differences from Xcode Project Tools

| Aspect | Swift Package Tools | Xcode Project Tools |
|--------|-------------------|-------------------|
| **Project File** | Package.swift | .xcodeproj / .xcworkspace |
| **Build Command** | `swift build` | `xcodebuild` |
| **Scheme** | Not required | Required |
| **Platform** | Host platform only | Multiple (iOS, macOS, watchOS, etc.) |
| **Session Defaults** | **NOT session-aware** | Session-aware (can use defaults) |
| **Target Specification** | Optional target name | Required scheme |

**Key Insight:** Swift Package tools do **NOT** use session defaults - all parameters must be explicit.

**Reference:** `src/mcp/tools/swift-package/swift_package_build.ts:76-85` (no session awareness)

### 5.5 Verified Working Patterns

**Pattern 1: Build → Run (Foreground)**

```typescript
// 1. Build package
await swift_package_build({
  packagePath: "/path/to/MyPackage",
  configuration: "debug"
});

// 2. Run executable (wait for completion)
await swift_package_run({
  packagePath: "/path/to/MyPackage",
  executableName: "my-tool",
  arguments: ["--verbose"],
  timeout: 60
});
```

**Pattern 2: Build → Run (Background) → Stop**

```typescript
// 1. Build package
await swift_package_build({
  packagePath: "/path/to/MyPackage"
});

// 2. Run executable in background
const runResult = await swift_package_run({
  packagePath: "/path/to/MyPackage",
  executableName: "my-server",
  background: true
});
// Response: "Started executable in background (PID: 12345)"

// 3. Later: stop the process
await swift_package_stop({ pid: 12345 });
```

**Pattern 3: Build → Test**

```typescript
// 1. Build package
await swift_package_build({
  packagePath: "/path/to/MyPackage",
  configuration: "debug"
});

// 2. Run tests
await swift_package_test({
  packagePath: "/path/to/MyPackage",
  filter: "MyTests.testExample"
});
```

---

## 6. Test Coverage Analysis

### 6.1 Testing Philosophy

**Zero Vitest Mocking Policy:**

```
From: docs/TESTING.md
❌ ALL VITEST MOCKING IS COMPLETELY BANNED
- No vi.mock()
- No vi.fn()
- No vi.spyOn()
```

**Dependency Injection Pattern:**

```typescript
// Test pattern: src/mcp/tools/simulator/__tests__/build_sim.test.ts:77-99
it('should handle empty workspacePath parameter', async () => {
  const mockExecutor = createMockExecutor({
    success: true,
    output: 'BUILD SUCCEEDED'
  });

  // Test the LOGIC function directly with injected mock
  const result = await build_simLogic(
    {
      workspacePath: '',
      scheme: 'MyScheme',
      simulatorName: 'iPhone 16',
    },
    mockExecutor,  // <-- Injected dependency
  );

  expect(result.content).toEqual([
    { type: 'text', text: '✅ iOS Simulator Build build succeeded...' },
    { type: 'text', text: expect.stringContaining('Next Steps:') },
  ]);
});
```

**Reference:** `src/mcp/tools/simulator/__tests__/build_sim.test.ts:77-99`

### 6.2 Test Coverage by Category

**Total Test Files:** 78

**Distribution:**
- Simulator tools: ~25 test files
- Device tools: ~10 test files
- macOS tools: ~8 test files
- Swift Package tools: ~6 test files
- Utilities: ~10 test files
- Session management: ~3 test files
- Other: ~16 test files

### 6.3 Three-Dimensional Testing

Every tool test covers:

1. **Input Validation** - Parameter schema validation and error cases
2. **Command Generation** - Verify correct CLI commands are built
3. **Output Processing** - Test response formatting and error handling

```typescript
// Example: src/mcp/tools/simulator/__tests__/build_sim.test.ts:189-290
describe('Command Generation', () => {
  it('should generate correct build command with minimal parameters', async () => {
    const callHistory: Array<{ command: string[]; logPrefix?: string }> = [];

    const trackingExecutor = async (command: string[], logPrefix?: string) => {
      callHistory.push({ command, logPrefix });
      return { success: false, output: '', error: 'Test stop' };
    };

    await build_simLogic(
      {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      },
      trackingExecutor,
    );

    // Verify exact command structure
    expect(callHistory[0].command).toEqual([
      'xcodebuild',
      '-workspace', '/path/to/MyProject.xcworkspace',
      '-scheme', 'MyScheme',
      '-configuration', 'Debug',
      '-skipMacroValidation',
      '-destination', 'platform=iOS Simulator,name=iPhone 16,OS=latest',
      'build',
    ]);
  });
});
```

**Reference:** `src/mcp/tools/simulator/__tests__/build_sim.test.ts:189-290`

---

## 7. Common Agent Failure Patterns

### 7.1 Failure: Not Setting Session Defaults

**Symptom:**
```
Error: Missing required session defaults
Provide a project or workspace
Set with: session-set-defaults { "projectPath": "..." } OR session-set-defaults { "workspacePath": "..." }
```

**Root Cause:**
Tools require `projectPath` or `workspacePath`, but agent calls without setting session defaults first.

**Solution:**
```typescript
// ALWAYS start sessions with defaults
await session_set_defaults({
  workspacePath: "/path/to/MyApp.xcworkspace",
  scheme: "MyScheme",
  simulatorName: "iPhone 16"
});

// Then tools can use defaults
await build_sim({});  // Uses session defaults
```

**Reference:** `src/utils/typed-tool-factory.ts:130-156`

### 7.2 Failure: Conflicting Parameters

**Symptom:**
```
Error: Parameter validation failed
Mutually exclusive parameters provided: projectPath, workspacePath. Provide only one.
```

**Root Cause:**
Agent provides both `projectPath` AND `workspacePath` in same call.

**Solution:**
```typescript
// ❌ WRONG
await build_sim({
  projectPath: "/path/to/App.xcodeproj",
  workspacePath: "/path/to/App.xcworkspace",  // Conflict!
  scheme: "MyScheme",
  simulatorName: "iPhone 16"
});

// ✅ CORRECT
await build_sim({
  workspacePath: "/path/to/App.xcworkspace",  // Only one
  scheme: "MyScheme",
  simulatorName: "iPhone 16"
});
```

**Reference:** `src/utils/typed-tool-factory.ts:99-109`

### 7.3 Failure: Stopping Logs Too Early

**Symptom:**
Log capture returns minimal or empty output.

**Root Cause:**
Agent calls `stop_device_log_cap` immediately after `start_device_log_cap` without waiting for log generation.

**Solution:**
```typescript
// ❌ WRONG
const startResult = await start_device_log_cap({ deviceId: "...", bundleId: "..." });
const stopResult = await stop_device_log_cap({ logSessionId: startResult.sessionId });
// Returns empty logs!

// ✅ CORRECT
const startResult = await start_device_log_cap({ deviceId: "...", bundleId: "..." });
// Tell user: "Log capture started. Interact with your app for 10 seconds."
// WAIT 10+ seconds for meaningful interaction
await delay(10000);  // Or wait for user signal
const stopResult = await stop_device_log_cap({ logSessionId: startResult.sessionId });
// Now returns substantial log data
```

**Reference:** `src/mcp/tools/logging/start_device_log_cap.ts:70-97`

### 7.4 Failure: Wrong Platform Tool

**Symptom:**
```
Error: macOS platform is not supported by test_sim. Use test_macos tool instead for macOS projects.
```

**Root Cause:**
Agent uses `test_sim` with `platform: "macOS"` instead of using `test_macos`.

**Solution:**
```typescript
// ❌ WRONG
await test_sim({
  workspacePath: "/path/to/MacApp.xcworkspace",
  scheme: "MacApp",
  platform: "macOS"  // NOT SUPPORTED
});

// ✅ CORRECT
await test_macos({
  workspacePath: "/path/to/MacApp.xcworkspace",
  scheme: "MacApp"
});
```

**Reference:** `src/mcp/tools/simulator/test_sim.ts:81-83`

### 7.5 Failure: Missing Swift Package Parameters

**Symptom:**
```
Error: Required parameter 'packagePath' not provided
```

**Root Cause:**
Agent expects Swift Package tools to use session defaults (they don't).

**Solution:**
```typescript
// ❌ WRONG - Session defaults don't work for Swift Package tools
await session_set_defaults({ workspacePath: "/path/to/MyPackage" });
await swift_package_build({});  // FAILS - packagePath required

// ✅ CORRECT - Always explicit parameters
await swift_package_build({
  packagePath: "/path/to/MyPackage",
  configuration: "debug"
});
```

**Reference:** `src/mcp/tools/swift-package/swift_package_build.ts:25-74`

### 7.6 Failure: Platform vs Tool Mismatch

**Common Confusion:**

| User Intent | WRONG Tool | CORRECT Tool |
|------------|-----------|--------------|
| Test on iPhone simulator | `test_macos` | `test_sim({ platform: "iOS Simulator" })` |
| Test on physical iPhone | `test_sim` | `test_device` |
| Test on macOS | `test_sim({ platform: "macOS" })` | `test_macos` |
| Build for Apple Watch simulator | `build_device` | `build_sim({ platform: "watchOS Simulator" })` |
| Build for physical Apple Watch | `build_sim` | `build_device` |

**Reference:** `docs/TOOLS.md:11-52`

---

## Summary: Critical Agent Knowledge

1. **Session Defaults are Essential:** Most Xcode tools require session defaults. Set them FIRST.

2. **Mutual Exclusivity is Enforced:** Cannot provide both `projectPath` and `workspacePath`, or both `simulatorId` and `simulatorName`.

3. **Platform ≠ Tool Selection:** Use tool name to choose target (sim vs device vs macOS), then use `platform` parameter for specific simulator type.

4. **Log Capture Requires Patience:** Start → WAIT → Stop. Immediate stopping = empty logs.

5. **Swift Package Tools are Different:** No session defaults, explicit parameters required.

6. **Test Coverage Proves Behavior:** 78 test files with dependency injection prove every tool works as documented.

7. **Tools Follow Consistent Pattern:** All tools export `*Logic` function for testing, use Zod validation, and return `ToolResponse`.

---

**Document Version:** 1.0
**Total Code References:** 45 file:line citations
**Test Files Analyzed:** 78
**Tools Documented:** 83 (61 canonical + 22 re-exports)
