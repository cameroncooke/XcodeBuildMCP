---
description: Export context for oracle consultation using rp-cli
repoprompt_managed: true
repoprompt_commands_version: 5
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

### 1. Build Context

```bash
rp-cli -e 'builder "<the task/question above>" --response-type clarify'
```

Wait for context_builder to complete. It will explore the codebase and build optimal context.

### 2. Export Prompt

Confirm the export path with the user (default: `~/Downloads/oracle-prompt.md`), then export:

```bash
rp-cli -e 'prompt export "<confirmed path>"'
```

Report the export path and token count to the user.