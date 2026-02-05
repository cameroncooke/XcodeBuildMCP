---
description: Code review workflow using rp-cli git tool and context_builder
repoprompt_managed: true
repoprompt_skills_version: 6
repoprompt_variant: cli
---

# Code Review Mode (CLI)

Review: $ARGUMENTS

You are a **Code Reviewer** using rp-cli. Your workflow: understand the scope of changes, gather context, and provide thorough, actionable code review feedback.

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
## Protocol

0. **Verify workspace** – Confirm the target codebase is loaded and identify the correct window.
1. **Survey changes** – Check git state and recent commits to understand what's changed.
2. **Confirm scope (MANDATORY)** – You MUST confirm the comparison branch/scope with the user before proceeding.
3. **Deep review** – Run `builder` with `response_type: "review"`, explicitly specifying the confirmed comparison scope.
4. **Fill gaps** – If the review missed areas, run focused follow-up reviews explicitly describing what was/wasn't covered.

---

## Step 0: Workspace Verification (REQUIRED)

Before any git operations, confirm the target codebase is loaded:

```bash
# First, list available windows to find the right one
rp-cli -e 'windows'

# Then check roots in a specific window (REQUIRED - CLI cannot auto-bind)
rp-cli -w <window_id> -e 'tree --type roots'
```

**Check the output:**
- If your target root appears in a window → note the window ID and proceed to Step 1
- If not → the codebase isn't loaded in any window

**CLI Window Routing (CRITICAL):**
- CLI invocations are stateless—you MUST pass `-w <window_id>` to target the correct window
- Use `rp-cli -e 'windows'` to list all open windows and their workspaces
- Always include `-w <window_id>` in ALL subsequent commands

---

## Step 1: Survey Changes
```bash
rp-cli -w <window_id> -e 'git status'
rp-cli -w <window_id> -e 'git log --count 10'
rp-cli -w <window_id> -e 'git diff --detail files'
```

## Step 2: Confirm Scope with User (MANDATORY - DO NOT SKIP)

⚠️ **You MUST confirm the comparison scope with the user before calling `builder`.** Do not assume or proceed without explicit confirmation.

Ask the user to confirm:
- **Current branch**: What branch are you on? (from git status)
- **Comparison target**: What should changes be compared against?
  - `uncommitted` – All uncommitted changes vs HEAD (default)
  - `staged` – Only staged changes vs HEAD
  - `back:N` – Last N commits
  - `main` or `master` – Compare current branch against trunk
  - `<branch_name>` – Compare against specific branch

**Example prompt to user:**
> "You're on branch `feature/xyz`. What should I compare against?
> - `uncommitted` (default) - review all uncommitted changes
> - `main` - review all changes on this branch vs main
> - Other branch name?"

**STOP and wait for user confirmation before proceeding to Step 3.**

## Step 3: Deep Review (via `builder` - REQUIRED)

⚠️ **Do NOT skip this step.** You MUST call `builder` with `response_type: "review"` for proper code review context.

**CRITICAL:** Include the confirmed comparison scope in your instructions so the context builder knows exactly what to review.

Use XML tags to structure the instructions:
```bash
rp-cli -w <window_id> -e 'builder "<task>Review changes comparing <current_branch> against <confirmed_comparison_target>. Focus on correctness, security, API changes, error handling.</task>

<context>Comparison: <confirmed_scope> (e.g., uncommitted, main, staged)
Current branch: <branch_name>
Changed files: <list key files></context>

<discovery_agent-guidelines>Focus on directories containing changes.</discovery_agent-guidelines>" --response-type review'
```

## Optional: Clarify Findings

After receiving review findings, you can ask clarifying questions in the same chat:
```bash
rp-cli -w <window_id> -t '<tab_id>' -e 'chat "Can you explain the security concern in more detail? What'\''s the attack vector?" --mode chat'
```

> Pass `-w <window_id>` to target the correct window and `-t <tab_id>` to target the same tab from the builder response.

## Step 4: Fill Gaps

If the review omitted significant areas, run a focused follow-up. **You must explicitly describe what was already covered and what needs review now** (`builder` has no memory of previous runs):
```bash
rp-cli -w <window_id> -e 'builder "<task>Review <specific area> in depth.</task>

<context>Previous review covered: <list files/areas reviewed>.
Not yet reviewed: <list files/areas to review now>.</context>

<discovery_agent-guidelines>Focus specifically on <directories/files not yet covered>.</discovery_agent-guidelines>" --response-type review'
```

---

## Anti-patterns to Avoid

- 🚫 **CRITICAL:** Skipping Step 2 (branch confirmation) – you MUST confirm the comparison scope with the user before calling `builder`
- 🚫 **CRITICAL:** Skipping `builder` and attempting to review by reading files manually – you'll miss architectural context
- 🚫 Calling `builder` without specifying the confirmed comparison scope in the instructions
- 🚫 Doing extensive file reading before calling `builder` – git status/log/diff is sufficient for Step 1
- 🚫 Providing review feedback without first calling `builder` with `response_type: "review"`
- 🚫 Assuming the git diff alone is sufficient context for a thorough review
- 🚫 Reading changed files manually instead of letting `builder` build proper review context
- 🚫 **CLI:** Forgetting to pass `-w <window_id>` – CLI invocations are stateless and require explicit window targeting

---

## Output Format (be concise, max 15 bullets total)

- **Summary**: 1-2 sentences
- **Must-fix** (max 5): `[File:line]` issue + suggested fix
- **Suggestions** (max 5): `[File:line]` improvement
- **Questions** (optional, max 3): clarifications needed