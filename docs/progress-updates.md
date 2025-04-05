# Progress Updates for Long-Running Operations

This document describes the progress update system implemented in the XcodeBuildMCP server to provide feedback during long-running operations.

## Overview

XcodeBuildMCP now provides real-time progress updates during long-running operations such as building applications. This helps clients understand the current state of operations, estimated completion percentage, and any important status messages.

## Implementation Details

### Progress Update Structure

Progress updates follow a standardized format:

```typescript
interface ToolProgressUpdate {
  operationId: string;     // Unique identifier for the operation
  status: 'running' | 'completed' | 'failed';  // Current status
  progress?: number;       // 0-100 percentage
  message: string;         // Human-readable status message
  timestamp: string;       // ISO timestamp of the update
  details?: string;        // Optional additional details
}
```

### Progress Service

The `progress.ts` module provides a centralized service for handling progress updates:

- `initProgressService(server)`: Initializes the progress service with an MCP server instance
- `sendProgressUpdate(update)`: Sends a progress update for an operation
- `createProgressCallback(operationName)`: Creates a callback function for a specific operation
- `getActiveOperations()`: Returns a list of active operations

### How Progress Updates Work

1. When a long-running command is executed, it is given a unique operation ID
2. The command execution monitors the output and periodically sends progress updates
3. Progress is estimated based on various heuristics:
   - Build phase detection (CompileC, CompileSwift, Linking, CodeSign)
   - File count detection (x of y files)
   - Phase transitions
4. Updates are sent to the client via console output (to stderr)
5. On completion, a final update with status "completed" or "failed" is sent

### Progress Estimation Heuristics

The system uses several techniques to estimate build progress:

- **Phase Detection**: Identifies different build phases and uses them to estimate overall progress
- **File Counting**: Detects "x of y files" patterns in the output
- **Time-Based**: Provides periodic updates even when no concrete progress information is available
- **Error Detection**: Highlights warnings and errors as they occur

## Client Integration

Clients can monitor the console output for progress messages in the format:

```
Operation [operation-id]: STATUS - Message (progress%)
```

For example:
```
Operation [550e8400-e29b-41d4-a716-446655440000]: RUNNING - CompileSwift phase... (25%)
```

## Future Improvements

Future versions may include:
- WebSocket-based progress updates
- More precise progress estimation
- Support for cancellation of long-running operations
- A UI component for displaying progress
