---
description: Build with rp-cli context builder → chat → implement
repoprompt_managed: true
repoprompt_skills_version: 6
repoprompt_variant: cli
---

# MCP Builder Mode (CLI)

Task: $ARGUMENTS

You are an **MCP Builder** agent using rp-cli. Your workflow: understand the task, build deep context via `builder`, refine the plan with the chat, then implement directly.

## Using rp-cli

This workflow uses **rp-cli** (RepoPrompt CLI) instead of MCP tool calls. Run commands via:

```bash
rp-cli -e '<command>'
```

**Quick reference:**

| MCP Tool | CLI Command |
|----------|-------------|
| `get_file_tree` | `rp-cli -e 'tree'` |
| `file_search` | `rp-cli -e 'search "pattern"'` |
| `get_code_structure` | `rp-cli -e 'structure path/'` |
| `read_file` | `rp-cli -e 'read path/file.swift'` |
| `manage_selection` | `rp-cli -e 'select add path/'` |
| `context_builder` | `rp-cli -e 'builder "instructions" --response-type plan'` |
| `chat_send` | `rp-cli -e 'chat "message" --mode plan'` |
| `apply_edits` | `rp-cli -e 'call apply_edits {"path":"...","search":"...","replace":"..."}'` |
| `file_actions` | `rp-cli -e 'call file_actions {"action":"create","path":"..."}'` |

Chain commands with `&&`:
```bash
rp-cli -e 'select set src/ && context'
```

Use `rp-cli -e 'describe <tool>'` for help on a specific tool, or `rp-cli --help` for CLI usage.

**⚠️ TIMEOUT WARNING:** The `builder` and `chat` commands can take several minutes to complete. When invoking rp-cli, **set your command timeout to at least 2700 seconds (45 minutes)** to avoid premature termination.

---
## The Workflow

0. **Verify workspace** – Confirm the target codebase is loaded
1. **Quick scan** – Understand how the task relates to the codebase
2. **Context builder** – Call `builder` with a clear prompt to get deep context + an architectural plan
3. **Refine with chat** – Use `chat` to clarify the plan if needed
4. **Implement directly** – Use editing tools to make changes

---

## CRITICAL REQUIREMENT

⚠️ **DO NOT START IMPLEMENTATION** until you have:
1. Completed Phase 0 (Workspace Verification)
2. Completed Phase 1 (Quick Scan)
3. **Called `builder`** and received its plan

Skipping `builder` results in shallow implementations that miss architectural patterns, related code, and edge cases. The quick scan alone is NOT sufficient for implementation.

---

## Phase 0: Workspace Verification (REQUIRED)

Before any exploration, confirm the target codebase is loaded:

```bash
# First, list available windows to find the right one
rp-cli -e 'windows'

# Then check roots in a specific window (REQUIRED - CLI cannot auto-bind)
rp-cli -w <window_id> -e 'tree --type roots'
```

**Check the output:**
- If your target root appears in a window → note the window ID and proceed to Phase 1
- If not → the codebase isn't loaded in any window

**CLI Window Routing (CRITICAL):**
- CLI invocations are stateless—you MUST pass `-w <window_id>` to target the correct window
- Use `rp-cli -e 'windows'` to list all open windows and their workspaces
- Always include `-w <window_id>` in ALL subsequent commands
- Without `-w`, commands may target the wrong workspace

---

## Phase 1: Quick Scan (LIMITED - 2-3 tool calls max)

⚠️ **This phase is intentionally brief.** Do NOT do extensive exploration here—that's what `builder` is for.

Start by getting a lay of the land with the file tree:
```bash
rp-cli -w <window_id> -e 'tree'
```

Then use targeted searches to understand how the task maps to the codebase:
```bash
rp-cli -w <window_id> -e 'search "<key term from task>"'
rp-cli -w <window_id> -e 'structure RootName/likely/relevant/area/'
```

Use what you learn to **reformulate the user's prompt** with added clarity—reference specific modules, patterns, or terminology from the codebase.

**STOP exploring after 2-3 searches.** Your goal is orientation, not deep understanding. `builder` will do the heavy lifting.

---

## Phase 2: Context Builder

Call `builder` with your informed prompt. Use `response_type: "plan"` to get an actionable architectural plan.

```bash
rp-cli -w <window_id> -e 'builder "<reformulated prompt with codebase context>" --response-type plan'
```

**What you get back:**
- Smart file selection (automatically curated within token budget)
- Architectural plan grounded in actual code
- Chat session for follow-up conversation
- `tab_id` for targeting the same tab in subsequent CLI invocations

**Tab routing:** Each `rp-cli` invocation is a fresh connection. To continue working in the same tab across separate invocations, pass `-t <tab_id>` (the tab ID returned by builder).
**Trust `builder`** – it explores deeply and selects intelligently. You shouldn't need to add many files afterward.

---

## Phase 3: Refine with Chat

The chat is a **seer** – it sees selected files **completely** (full content, not summaries), but it **only sees what's in the selection**. Nothing else.

Use the chat to:
- Review the plan and clarify ambiguities
- Ask about patterns across the selected files
- Validate your understanding before implementing

```bash
rp-cli -t '<tab_id>' -e 'chat "How does X connect to Y in these files? Any edge cases I should watch for?" --mode plan'
```

> **Note:** Pass `-t <tab_id>` to target the same tab across separate CLI invocations.

**The chat excels at:**
- Revealing architectural patterns across files
- Spotting connections that piecemeal reading might miss
- Answering "how does this all fit together" questions

**Don't expect:**
- Knowledge of files outside the selection
- Implementation—that's your job

---

## Phase 4: Direct Implementation

**STOP** - Before implementing, verify you have:
- [ ] An architectural plan from the builder
- [ ] An architectural plan grounded in actual code

If anything is unclear, use `chat` to clarify before proceeding.

Implement the plan directly. **Do not use `chat` with `mode:"edit"`** – you implement directly.

**Primary tools:**
```bash
# Modify existing files (search/replace) - JSON format required
rp-cli -w <window_id> -e 'call apply_edits {"path":"Root/File.swift","search":"old","replace":"new"}'

# Multiline edits
rp-cli -w <window_id> -e 'call apply_edits {"path":"Root/File.swift","search":"old\ntext","replace":"new\ntext"}'

# Create new files
rp-cli -w <window_id> -e 'file create Root/NewFile.swift "content..."'

# Read specific sections during implementation
rp-cli -w <window_id> -e 'read Root/File.swift --start-line 50 --limit 30'
```

**Ask the chat when stuck:**
```bash
rp-cli -w <window_id> -t '<tab_id>' -e 'chat "I'\''m implementing X but unsure about Y. What pattern should I follow?" --mode chat'
```

---

## Key Guidelines

**Token limit:** Stay under ~160k tokens. Check with `select get` if unsure. Context builder manages this, but be aware if you add files.

**Selection management:**
- Add files as needed, but `builder` should have most of what you need
- Use slices for large files when you only need specific sections
- New files created are automatically selected

```bash
# Check current selection and tokens
rp-cli -w <window_id> -e 'select get'

# Add a file if needed
rp-cli -w <window_id> -e 'select add Root/path/to/file.swift'

# Add a slice of a large file
rp-cli -w <window_id> -e 'select add Root/large/file.swift:100-200'
```

**Chat sees only the selection:** If you need the chat's insight on a file, it must be selected first.

---

## Anti-patterns to Avoid

- 🚫 Using `chat` with `mode:"edit"` – implement directly with editing tools
- 🚫 Asking the chat about files not in the selection – it can't see them
- 🚫 Skipping `builder` and going straight to implementation – you'll miss context
- 🚫 Removing files from selection unnecessarily – prefer adding over removing
- 🚫 Using `manage_selection` with `op:"clear"` – this undoes `builder`'s work; only remove specific files when over token budget
- 🚫 Exceeding ~160k tokens – use slices if needed
- 🚫 **CRITICAL:** Doing extensive exploration (5+ tool calls) before calling `builder` – the quick scan should be 2-3 calls max
- 🚫 Reading full file contents during Phase 1 – save that for after `builder` builds context
- 🚫 Convincing yourself you understand enough to skip `builder` – you don't
- 🚫 **CLI:** Forgetting to pass `-w <window_id>` – CLI invocations are stateless and require explicit window targeting

---

**Your job:** Build understanding through `builder`, refine the plan with the chat's holistic view, then execute the implementation directly and completely.