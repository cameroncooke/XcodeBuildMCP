# Release Process

## GitHub Release Notes Source of Truth

GitHub release descriptions are generated from the matching version section in `CHANGELOG.md`. The release process now enforces this in both local and CI flows:

- `scripts/release.sh` validates release notes generation before tagging and pushing
- `.github/workflows/release.yml` generates the final GitHub release body from `CHANGELOG.md`

If the changelog section for the target version is missing or empty, release execution fails with a clear error.

If the latest changelog section is `## [Unreleased]` and no matching version heading exists yet, `scripts/release.sh` automatically renames that heading to `## [<version>]` for the release. In `--dry-run`, this rename is performed only in a temporary file and does not modify `CHANGELOG.md`.

Preview release notes locally:

```bash
node scripts/generate-github-release-notes.mjs --version 2.0.0
```

## Release Workflow Modes

The release workflow (`.github/workflows/release.yml`) has two execution modes:

### Tag push (`push` on `v*`)

Production release behavior:
- Publishes package to npm.
- Creates GitHub release and uploads npm tarball.
- Builds and verifies portable macOS artifacts (`arm64`, `x64`, `universal`).
- Uploads portable artifacts to GitHub release assets.
- Updates the Homebrew tap repository (`cameroncooke/homebrew-xcodebuildmcp`) directly when `HOMEBREW_TAP_TOKEN` is configured.
- Attempts Smithery and MCP Registry publishes (best effort based on configured secrets).

### Manual dispatch (`workflow_dispatch`)

Validation behavior only (no production deployment):
- Runs formatting/build/tests and packaging checks.
- Runs npm publish in `--dry-run` mode.
- Builds and verifies portable artifacts for release-pipeline validation.
- Does **not** publish to npm.
- Does **not** create GitHub release.
- Does **not** upload portable assets to a release.
- Does **not** update Homebrew tap.
- Does **not** run Smithery or MCP Registry publish jobs.

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

**Before committing, ALWAYS run quality checks:**
```bash
npm run build      # Ensure code compiles
npm run typecheck  # MANDATORY: Fix all TypeScript errors
npm run lint       # Fix linting issues
npm run test       # Ensure tests pass
```

**🚨 CRITICAL: TypeScript errors are BLOCKING:**
- **ZERO tolerance** for TypeScript errors in commits
- The `npm run typecheck` command must pass with no errors
- Fix all `ts(XXXX)` errors before committing
- Do not ignore or suppress TypeScript errors without explicit approval

**Make logical, atomic commits:**
- Each commit should represent a single logical change  
- Write short, descriptive commit summaries
- Commit frequently to your feature branch

```bash
# Always run quality checks first
npm run typecheck && npm run lint && npm run test

# Then commit your changes
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
- **NEVER commit code with TypeScript errors**

### ✅ Required Practices
- Always pull from `main` before creating branches
- **MANDATORY: Run `npm run typecheck` before every commit**
- **MANDATORY: Fix all TypeScript errors before committing**
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

## Automated Quality Gates

### CI/CD Pipeline
Our GitHub Actions CI pipeline automatically enforces these quality checks:
1. `npm run build` - Compilation check
2. `npm run docs:check` - Validate CLI command references in consumer docs
3. `npm run lint` - ESLint validation  
4. `npm run format:check` - Prettier formatting check
5. `npm run typecheck` - **TypeScript error validation**
6. `npm run test` - Test suite execution

**All checks must pass before PR merge is allowed.**

### Optional: Pre-commit Hook Setup
To install the repository-managed pre-commit hook:

```bash
npm run hooks:install
```

This installs `.githooks/pre-commit` and configures `core.hooksPath` for this repository.

The shared pre-commit hook runs:
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `npm run docs:check`
