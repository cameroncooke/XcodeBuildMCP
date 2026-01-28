---
description: Deep codebase investigation and architecture research with rp-cli commands
repoprompt_managed: true
repoprompt_commands_version: 5
repoprompt_variant: cli
---

# Deep Investigation Mode (CLI)

Investigate: $ARGUMENTS

You are now in deep investigation mode for the issue described above. Follow this protocol rigorously.

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

---
## Investigation Protocol

### Core Principles
1. **Don't stop until confident** - pursue every lead until you have solid evidence
2. **Document findings as you go** - create/update a report file with observations
3. **Question everything** - if something seems off, investigate it
4. **Use `builder` aggressively** - it's designed for deep exploration

### Phase 1: Initial Assessment

1. Read any provided files/reports (traces, logs, error reports)
2. Summarize the symptoms and constraints
3. Form initial hypotheses

### Phase 2: Systematic Exploration (via `builder` - REQUIRED)

⚠️ **Do NOT skip this step.** You MUST call `builder` to get proper context before drawing conclusions.

Use `builder` with detailed instructions:

```bash
rp-cli -e 'builder "Investigate: <specific area>

Symptoms observed:
- <symptom 1>
- <symptom 2>

Hypotheses to test:
- <theory 1>
- <theory 2>

Areas to explore:
- <files/patterns/subsystems>
" --response-type plan'
```

### Phase 3: Follow-up Deep Dives

After `builder` returns, continue with targeted questions:

```bash
rp-cli -t '<tab_id>' -e 'chat "<specific follow-up based on findings>" --mode plan'
```

> Pass `-t <tab_id>` to target the same tab across separate CLI invocations.

### Phase 4: Evidence Gathering

- Check git history for recent relevant changes
- Look for patterns across similar files
- Trace data/control flow through the codebase
- Identify any leaks, retained references, or improper cleanup

### Phase 5: Conclusions

Document:
- Root cause identification (with evidence)
- Eliminated hypotheses (and why)
- Recommended fixes
- Preventive measures for the future

---

## Context Builder Tips

The `builder` operates in two phases:
1. **Discovery**: Intelligently explores the codebase
2. **Analysis**: A capable model analyzes the captured context

**Give it good guidance:**
- Be specific about what parts of the codebase to investigate
- Describe symptoms precisely
- List specific technical questions to answer
- Mention any relevant constraints or context

---

## Report Template

Create a findings report as you investigate:

```markdown
# Investigation: [Title]

## Summary
[1-2 sentence summary of findings]

## Symptoms
- [Observed symptom 1]
- [Observed symptom 2]

## Investigation Log

### [Timestamp/Phase] - [Area Investigated]
**Hypothesis:** [What you were testing]
**Findings:** [What you found]
**Evidence:** [File:line references]
**Conclusion:** [Confirmed/Eliminated/Needs more investigation]

## Root Cause
[Detailed explanation with evidence]

## Recommendations
1. [Fix 1]
2. [Fix 2]

## Preventive Measures
- [How to prevent this in future]
```

---

## Anti-patterns to Avoid

- 🚫 **CRITICAL:** Skipping `builder` and attempting to investigate by reading files manually – you'll miss critical context
- 🚫 Doing extensive exploration (5+ tool calls) before calling `builder` – initial assessment should be brief
- 🚫 Drawing conclusions before `builder` has built proper context
- 🚫 Reading many full files during Phase 1 – save deep reading for after `builder`
- 🚫 Assuming you understand the issue without systematic exploration via `builder`
- 🚫 Using only chat follow-ups without an initial `builder` call

---

Now begin the investigation. Read any provided context, then **immediately** use `builder` to start systematic exploration. Do not attempt manual exploration first.