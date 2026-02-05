---
description: Export context for oracle consultation using rp-cli
repoprompt_managed: true
repoprompt_skills_version: 6
repoprompt_variant: cli
---

# Oracle Export (CLI)

Task: $ARGUMENTS

Export a comprehensive prompt with full context for consultation with an external oracle.

## How It Works

Describe the task or question you need the oracle to solve. The context_builder agent will:
1. Analyze your request and explore the codebase
2. Select the most relevant files within a token budget
3. Write a detailed prompt explaining the task and context

You don't need to specify which files to include—just describe what you need help with.

## Workflow

### 0. Workspace Verification (REQUIRED)

Before building context, confirm the target codebase is loaded:

```bash
# First, list available windows to find the right one
rp-cli -e 'windows'

# Then check roots in a specific window (REQUIRED - CLI cannot auto-bind)
rp-cli -w <window_id> -e 'tree --type roots'
```

**Check the output:**
- If your target root appears in a window → note the window ID and proceed
- If not → the codebase isn't loaded in any window

**CLI Window Routing (CRITICAL):**
- CLI invocations are stateless—you MUST pass `-w <window_id>` to target the correct window
- Use `rp-cli -e 'windows'` to list all open windows and their workspaces
- Always include `-w <window_id>` in ALL subsequent commands

### 1. Build Context

```bash
rp-cli -w <window_id> -e 'builder "<the task/question above>" --response-type clarify'
```

Wait for context_builder to complete. It will explore the codebase and build optimal context.

### 2. Export Prompt

Confirm the export path with the user (default: `~/Downloads/oracle-prompt.md`), then export:

```bash
rp-cli -w <window_id> -e 'prompt export "<confirmed path>"'
```

Report the export path and token count to the user.