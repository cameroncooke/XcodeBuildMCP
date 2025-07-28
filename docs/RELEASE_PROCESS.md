# Release Process

## Step-by-Step Development Workflow

### 1. Starting New Work

**Always start by syncing with main:**
```bash
git checkout main
git pull origin main
```

**Create feature branch using standardized naming convention:**
```bash
git checkout -b feature/issue-123-add-new-feature
git checkout -b bugfix/issue-456-fix-simulator-crash
```

### 2. Development & Commits

**Make logical, atomic commits:**
- Each commit should represent a single logical change
- Write short, descriptive commit summaries
- Commit frequently to your feature branch

```bash
git add .
git commit -m "feat: add simulator boot validation logic"
git commit -m "fix: handle null response in device list parser"
```

### 3. Pushing Changes

**🚨 CRITICAL: Always ask permission before pushing**
- **NEVER push without explicit user permission**
- **NEVER force push without explicit permission**
- Pushing without permission is a fatal error resulting in termination

```bash
# Only after getting permission:
git push origin feature/your-branch-name
```

### 4. Pull Request Creation

**Use GitHub CLI tool exclusively:**
```bash
gh pr create --title "feat: add simulator boot validation" --body "$(cat <<'EOF'
## Summary
Brief description of what this PR does and why.

## Background/Details
### For New Features:
- Detailed explanation of the new feature
- Context and requirements that led to this implementation
- Design decisions and approach taken

### For Bug Fixes:
- **Root Cause Analysis**: Detailed explanation of what caused the bug
- Specific conditions that trigger the issue
- Why the current code fails in these scenarios

## Solution
- How the root cause was addressed
- Technical approach and implementation details
- Key changes made to resolve the issue

## Testing
- **Reproduction Steps**: How to reproduce the original issue (for bugs)
- **Validation Method**: How you verified the fix works
- **Test Coverage**: What tests were added or modified
- **Manual Testing**: Steps taken to validate the solution
- **Edge Cases**: Additional scenarios tested

## Notes
- Any important considerations for reviewers
- Potential impacts or side effects
- Future improvements or technical debt
- Deployment considerations
EOF
)"
```

**After PR creation, add automated review trigger:**
```bash
gh pr comment --body "Cursor review"
```

### 5. Branch Management & Rebasing

**Keep branch up to date with main:**
```bash
git checkout main
git pull origin main
git checkout your-feature-branch
git rebase main
```

**If rebase creates conflicts:**
- Resolve conflicts manually
- `git add .` resolved files
- `git rebase --continue`
- **Ask permission before force pushing rebased branch**

### 6. Merge Process

**Only merge via Pull Requests:**
- No direct merges to `main`
- Maintain linear commit history through rebasing
- Use "Squash and merge" or "Rebase and merge" as appropriate
- Delete feature branch after successful merge

## Pull Request Template Structure

Every PR must include these sections in order:

1. **Summary**: Brief overview of changes and purpose
2. **Background/Details**: 
   - New Feature: Requirements, context, design decisions
   - Bug Fix: Detailed root cause analysis
3. **Solution**: Technical approach and implementation details  
4. **Testing**: Reproduction steps, validation methods, test coverage
5. **Notes**: Additional considerations, impacts, future work

## Critical Rules

### ❌ FATAL ERRORS (Result in Termination)
- **NEVER push to `main` directly**
- **NEVER push without explicit user permission**
- **NEVER force push without explicit permission**

### ✅ Required Practices
- Always pull from `main` before creating branches
- Use `gh` CLI tool for all PR operations
- Add "Cursor review" comment after PR creation
- Maintain linear commit history via rebasing
- Ask permission before any push operation
- Use standardized branch naming conventions

## Branch Naming Conventions

- `feature/issue-xxx-description` - New features
- `bugfix/issue-xxx-description` - Bug fixes  
- `hotfix/critical-issue-description` - Critical production fixes
- `docs/update-readme` - Documentation updates
- `refactor/improve-error-handling` - Code refactoring