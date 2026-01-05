# Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools and resources for AI assistants and other MCP clients. It uses a plugin-based architecture with workflow groups so clients can access Xcode projects, simulators, devices, and Swift packages through a standard interface.

## Why it exists
- Standardizes Xcode interactions for AI agents instead of ad-hoc command lines.
- Reduces configuration errors by providing purpose-built tools.
- Enables agents to build, inspect errors, and iterate autonomously.

## What it can do
- Xcode project discovery, build, test, and clean.
- Simulator and device app lifecycle management.
- Swift Package Manager build, test, and run.
- UI automation, screenshots, and video capture.
- Log capture and system diagnostics.
- Debugger attach, breakpoints, stack, variables, and LLDB command execution.

See the full tool catalog in [TOOLS.md](TOOLS.md).

## Next steps
- Get started: [GETTING_STARTED.md](GETTING_STARTED.md)
- Configure options: [CONFIGURATION.md](CONFIGURATION.md)
- Tools reference: [TOOLS.md](TOOLS.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
