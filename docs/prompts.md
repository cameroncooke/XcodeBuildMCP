# XcodeBuildMCP Prompts

Prompts provide templated workflows for common Xcode development tasks. They help structure interactions with AI assistants for debugging, CI/CD setup, performance optimization, and other development scenarios.

## Available Prompts

### Debugging Prompts

#### `debug-build-failure`
**Description:** Analyze and troubleshoot Xcode build failures

**Parameters:**
- `error_message` (required): The build error message or log excerpt
- `scheme` (optional): The build scheme that failed
- `target` (optional): The specific target that failed
- `recent_changes` (optional): Recent code or configuration changes

**Use Case:** When you encounter build failures and need systematic analysis and resolution steps.

#### `debug-runtime-crash`
**Description:** Analyze and troubleshoot iOS/macOS app runtime crashes

**Parameters:**
- `crash_log` (required): The crash log or stack trace
- `app_version` (optional): App version where crash occurred
- `ios_version` (optional): iOS/macOS version where crash occurred
- `reproduction_steps` (optional): Steps to reproduce the crash
- `device_info` (optional): Device model and specifications

**Use Case:** When your app crashes and you need help analyzing crash logs and implementing fixes.

#### `debug-simulator-issues`
**Description:** Troubleshoot iOS Simulator problems and configuration issues

**Parameters:**
- `issue_description` (required): Description of the simulator issue
- `simulator_version` (optional): iOS Simulator version
- `xcode_version` (optional): Xcode version
- `error_messages` (optional): Any error messages from simulator or console

**Use Case:** When simulators won't boot, apps won't install, or other simulator-related problems occur.

### CI/CD Prompts

#### `setup-github-actions`
**Description:** Set up GitHub Actions CI/CD pipeline for Xcode projects

**Parameters:**
- `project_type` (required): Type of Xcode project (ios, macos, multiplatform)
- `deployment_target` (optional): Minimum iOS/macOS deployment target
- `testing_requirements` (optional): Testing requirements (unit tests, UI tests, etc.)
- `distribution_method` (optional): App distribution method (app-store, enterprise, adhoc, development)
- `additional_requirements` (optional): Additional CI/CD requirements or constraints

**Use Case:** Setting up automated build, test, and deployment workflows using GitHub Actions.

#### `setup-xcode-cloud`
**Description:** Configure Xcode Cloud for automated building and testing

**Parameters:**
- `project_name` (required): Name of the Xcode project
- `team_size` (optional): Development team size
- `workflow_requirements` (optional): Specific workflow requirements
- `integration_needs` (optional): Third-party integrations needed

**Use Case:** Configuring Apple's Xcode Cloud service for your development workflow.

#### `troubleshoot-cicd`
**Description:** Diagnose and fix CI/CD pipeline issues for Xcode projects

**Parameters:**
- `platform` (required): CI/CD platform being used (github-actions, xcode-cloud, jenkins, gitlab-ci, other)
- `error_description` (required): Description of the CI/CD issue or failure
- `build_logs` (optional): Relevant build logs or error messages
- `recent_changes` (optional): Recent changes to project or CI configuration

**Use Case:** When your CI/CD pipeline fails and you need systematic troubleshooting guidance.

### Performance Prompts

#### `optimize-build-performance`
**Description:** Analyze and optimize Xcode build performance

**Parameters:**
- `build_time` (required): Current build time or performance metrics
- `project_size` (optional): Project size and complexity
- `bottlenecks` (optional): Known performance bottlenecks

**Use Case:** When builds are slow and you need strategies to improve build performance.

#### `analyze-app-performance`
**Description:** Analyze and optimize iOS/macOS app runtime performance

**Parameters:**
- `performance_issue` (required): Description of performance issue
- `profiling_data` (optional): Instruments or profiling data
- `target_metrics` (optional): Target performance metrics

**Use Case:** When your app has performance issues and you need optimization strategies.

### Testing Prompts

#### `setup-testing-strategy`
**Description:** Design comprehensive testing strategy for Xcode projects

**Parameters:**
- `project_type` (required): Type of project (ios, macos, multiplatform)
- `app_complexity` (optional): App complexity and features
- `testing_goals` (optional): Testing objectives and requirements

**Use Case:** Setting up a comprehensive testing strategy for your project.

#### `debug-test-failures`
**Description:** Diagnose and fix failing Xcode tests

**Parameters:**
- `test_failure_description` (required): Description of test failures
- `test_logs` (optional): Test failure logs or output
- `test_type` (optional): Type of failing tests (unit, integration, ui, performance)

**Use Case:** When tests are failing and you need help diagnosing and fixing the issues.

### Project Setup Prompts

#### `setup-new-project`
**Description:** Guide through new Xcode project setup and configuration

**Parameters:**
- `project_type` (required): Type of project to create (ios, macos, watchos, tvos, multiplatform)
- `app_category` (optional): App category or purpose
- `team_size` (optional): Development team size
- `requirements` (optional): Specific project requirements

**Use Case:** Setting up a new Xcode project with best practices and proper configuration.

#### `migrate-legacy-project`
**Description:** Guide through legacy Xcode project modernization

**Parameters:**
- `current_setup` (required): Current project setup and configuration
- `target_improvements` (optional): Desired improvements or modernization goals
- `constraints` (optional): Migration constraints or limitations

**Use Case:** Modernizing an existing project with updated tools, practices, and configurations.

## Usage Examples

### Debugging a Build Failure
```typescript
const prompt = await client.getPrompt('debug-build-failure', {
  error_message: "Undefined symbol: _OBJC_CLASS_$_MyCustomClass",
  scheme: "MyApp",
  recent_changes: "Added new Swift class and Objective-C bridging"
});
```

### Setting up CI/CD
```typescript
const prompt = await client.getPrompt('setup-github-actions', {
  project_type: "ios",
  deployment_target: "iOS 15.0",
  testing_requirements: "Unit tests and UI tests",
  distribution_method: "app-store"
});
```

### Performance Analysis
```typescript
const prompt = await client.getPrompt('analyze-app-performance', {
  performance_issue: "App launch time is over 3 seconds",
  target_metrics: "Launch time under 1 second"
});
```

## Configuration

Prompts can be disabled by setting the environment variable:
```bash
export XCODEBUILDMCP_ENABLE_PROMPTS=false
```

## Best Practices

1. **Provide Context:** Include as much relevant information as possible in the parameters
2. **Be Specific:** Detailed error messages and logs lead to better analysis
3. **Include Recent Changes:** Mention any recent modifications that might be related
4. **Set Clear Goals:** Define what you want to achieve with the prompt
5. **Follow Up:** Use the guidance provided to implement solutions systematically

