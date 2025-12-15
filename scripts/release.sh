#!/bin/bash
set -e

# GitHub Release Creation Script
# This script handles only the GitHub release creation.
# Building and NPM publishing are handled by GitHub workflows.
#
# Usage: ./scripts/release.sh [VERSION|BUMP_TYPE] [OPTIONS]
# Run with --help for detailed usage information
FIRST_ARG=$1
DRY_RUN=false
VERSION=""
BUMP_TYPE=""

# Function to show help
show_help() {
  cat << 'EOF'
📦 GitHub Release Creator

Creates releases with automatic semver bumping. Only handles GitHub release
creation - building and NPM publishing are handled by workflows.

USAGE:
    [VERSION|BUMP_TYPE] [OPTIONS]

ARGUMENTS:
    VERSION         Explicit version (e.g., 1.5.0, 2.0.0-beta.1)
    BUMP_TYPE       major | minor [default] | patch

OPTIONS:
    --dry-run       Preview without executing
    -h, --help      Show this help

EXAMPLES:
    (no args)       Interactive minor bump
    major           Interactive major bump
    1.5.0           Use specific version
    patch --dry-run Preview patch bump

EOF

  local highest_version=$(get_highest_version)
  if [[ -n "$highest_version" ]]; then
    echo "CURRENT: $highest_version"
    echo "NEXT: major=$(bump_version "$highest_version" "major") | minor=$(bump_version "$highest_version" "minor") | patch=$(bump_version "$highest_version" "patch")"
  else
    echo "No existing version tags found"
  fi
  echo ""
}

# Function to get the highest version from git tags
get_highest_version() {
  git tag | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+\.[0-9]+)?$' | sed 's/^v//' | sort -V | tail -1
}

# Function to parse version components
parse_version() {
  local version=$1
  echo "$version" | sed -E 's/^([0-9]+)\.([0-9]+)\.([0-9]+)(-.*)?$/\1 \2 \3 \4/'
}

# Function to bump version based on type
bump_version() {
  local current_version=$1
  local bump_type=$2

  local parsed=($(parse_version "$current_version"))
  local major=${parsed[0]}
  local minor=${parsed[1]}
  local patch=${parsed[2]}
  local prerelease=${parsed[3]:-""}

  # Remove prerelease for stable version bumps
  case $bump_type in
    major)
      echo "$((major + 1)).0.0"
      ;;
    minor)
      echo "${major}.$((minor + 1)).0"
      ;;
    patch)
      echo "${major}.${minor}.$((patch + 1))"
      ;;
    *)
      echo "❌ Unknown bump type: $bump_type" >&2
      exit 1
      ;;
  esac
}

# Function to validate version format
validate_version() {
  local version=$1
  if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+\.[0-9]+)?$ ]]; then
    echo "❌ Invalid version format: $version"
    echo "Version must be in format: x.y.z or x.y.z-tag.n (e.g., 1.4.0 or 1.4.0-beta.3)"
    return 1
  fi
  return 0
}

# Function to compare versions (returns 1 if first version is greater, 0 if equal, -1 if less)
compare_versions() {
  local version1=$1
  local version2=$2

  local v1_base=${version1%%-*}
  local v2_base=${version2%%-*}
  local v1_pre=""
  local v2_pre=""

  [[ "$version1" == *-* ]] && v1_pre=${version1#*-}
  [[ "$version2" == *-* ]] && v2_pre=${version2#*-}

  # When base versions match, a stable release outranks any prerelease
  if [[ "$v1_base" == "$v2_base" ]]; then
    if [[ -z "$v1_pre" && -n "$v2_pre" ]]; then
      echo 1
      return
    elif [[ -n "$v1_pre" && -z "$v2_pre" ]]; then
      echo -1
      return
    elif [[ "$version1" == "$version2" ]]; then
      echo 0
      return
    fi
  fi

  # Fallback to version sort for differing bases or two prereleases
  local sorted=$(printf "%s\n%s" "$version1" "$version2" | sort -V)
  if [[ "$(echo "$sorted" | head -1)" == "$version1" ]]; then
    echo -1
  else
    echo 1
  fi
}

# Function to ask for confirmation
ask_confirmation() {
  local suggested_version=$1
  echo ""
  echo "🚀 Suggested next version: $suggested_version"
  read -p "Do you want to use this version? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    return 0
  else
    return 1
  fi
}

# Function to get version interactively
get_version_interactively() {
  echo ""
  echo "Please enter the version manually:"
  while true; do
    read -p "Version: " manual_version
    if validate_version "$manual_version"; then
      local highest_version=$(get_highest_version)
      if [[ -n "$highest_version" ]]; then
        local comparison=$(compare_versions "$manual_version" "$highest_version")
        if [[ $comparison -le 0 ]]; then
          echo "❌ Version $manual_version is not newer than the highest existing version $highest_version"
          continue
        fi
      fi
      VERSION="$manual_version"
      break
    fi
  done
}

# Check for help flags first
for arg in "$@"; do
  if [[ "$arg" == "-h" ]] || [[ "$arg" == "--help" ]]; then
    show_help
    exit 0
  fi
done

# Check for arguments and set flags
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  fi
done

# Determine version or bump type (ignore --dry-run flag)
if [[ -z "$FIRST_ARG" ]] || [[ "$FIRST_ARG" == "--dry-run" ]]; then
  # No argument provided, default to minor bump
  BUMP_TYPE="minor"
elif [[ "$FIRST_ARG" == "major" ]] || [[ "$FIRST_ARG" == "minor" ]] || [[ "$FIRST_ARG" == "patch" ]]; then
  # Bump type provided
  BUMP_TYPE="$FIRST_ARG"
else
  # Version string provided
  if validate_version "$FIRST_ARG"; then
    VERSION="$FIRST_ARG"
  else
    exit 1
  fi
fi

# If bump type is set, calculate the suggested version
if [[ -n "$BUMP_TYPE" ]]; then
  HIGHEST_VERSION=$(get_highest_version)
  if [[ -z "$HIGHEST_VERSION" ]]; then
    echo "❌ No existing version tags found. Please provide a version manually."
    get_version_interactively
  else
    SUGGESTED_VERSION=$(bump_version "$HIGHEST_VERSION" "$BUMP_TYPE")

    if ask_confirmation "$SUGGESTED_VERSION"; then
      VERSION="$SUGGESTED_VERSION"
    else
      get_version_interactively
    fi
  fi
fi

# Final validation and version comparison
if [[ -z "$VERSION" ]]; then
  echo "❌ No version determined"
  exit 1
fi

HIGHEST_VERSION=$(get_highest_version)
if [[ -n "$HIGHEST_VERSION" ]]; then
  COMPARISON=$(compare_versions "$VERSION" "$HIGHEST_VERSION")
  if [[ $COMPARISON -le 0 ]]; then
    echo "❌ Version $VERSION is not newer than the highest existing version $HIGHEST_VERSION"
    exit 1
  fi
fi

# Detect current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Enforce branch policy - only allow releases from main
if [[ "$BRANCH" != "main" ]]; then
  echo "❌ Error: Releases must be created from the main branch."
  echo "Current branch: $BRANCH"
  echo "Please switch to main and try again."
  exit 1
fi

run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

# Ensure we're in the project root (parent of scripts directory)
cd "$(dirname "$0")/.."

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: Working directory is not clean."
  echo "Please commit or stash your changes before creating a release."
  exit 1
fi

# Check if package.json already has this version (from previous attempt)
CURRENT_PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [[ "$CURRENT_PACKAGE_VERSION" == "$VERSION" ]]; then
  echo "📦 Version $VERSION already set in package.json"
  SKIP_VERSION_UPDATE=true
else
  SKIP_VERSION_UPDATE=false
fi

if [[ "$SKIP_VERSION_UPDATE" == "false" ]]; then
  # Version update
  echo ""
  echo "🔧 Setting version to $VERSION..."
  run "npm version \"$VERSION\" --no-git-tag-version"

  # README update
  echo ""
  echo "📝 Updating version in README.md..."
  # Update version references in code examples using extended regex for precise semver matching
  run "sed -i '' -E 's/@[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+\.[0-9]+)?(-[a-zA-Z0-9]+\.[0-9]+)*(-[a-zA-Z0-9]+)?/@'"$VERSION"'/g' README.md"

  # Update URL-encoded version references in shield links
  echo "📝 Updating version in README.md shield links..."
  run "sed -i '' -E 's/npm%3Axcodebuildmcp%40[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+\.[0-9]+)?(-[a-zA-Z0-9]+\.[0-9]+)*(-[a-zA-Z0-9]+)?/npm%3Axcodebuildmcp%40'"$VERSION"'/g' README.md"

  # server.json update
  echo ""
  if [[ -f server.json ]]; then
    echo "📝 Updating server.json version to $VERSION..."
    run "node -e \"const fs=require('fs');const f='server.json';const j=JSON.parse(fs.readFileSync(f,'utf8'));j.version='$VERSION';if(Array.isArray(j.packages)){j.packages=j.packages.map(p=>({...p,version:'$VERSION'}));}fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');\""
  else
    echo "⚠️  server.json not found; skipping update"
  fi

  # Git operations
  echo ""
  echo "📦 Committing version changes..."
  if [[ -f server.json ]]; then
    run "git add package.json README.md server.json"
  else
    run "git add package.json README.md"
  fi
  run "git commit -m \"Release v$VERSION\""
else
  echo "⏭️  Skipping version update (already done)"
  # Ensure server.json still matches the desired version (in case of a partial previous run)
  if [[ -f server.json ]]; then
    CURRENT_SERVER_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('server.json','utf8')).version||'')")
    if [[ "$CURRENT_SERVER_VERSION" != "$VERSION" ]]; then
      echo "📝 Aligning server.json to $VERSION..."
      run "node -e \"const fs=require('fs');const f='server.json';const j=JSON.parse(fs.readFileSync(f,'utf8'));j.version='$VERSION';if(Array.isArray(j.packages)){j.packages=j.packages.map(p=>({...p,version:'$VERSION'}));}fs.writeFileSync(f,JSON.stringify(j,null,2)+'\\n');\""
      run "git add server.json"
      run "git commit -m \"Align server.json for v$VERSION\""
    fi
  fi
fi

# Create or recreate tag at current HEAD
echo "🏷️  Creating tag v$VERSION..."
run "git tag -f \"v$VERSION\""

echo ""
echo "🚀 Pushing to origin..."
run "git push origin $BRANCH --tags"

# Monitor the workflow and handle failures
echo ""
echo "⏳ Monitoring GitHub Actions workflow..."
echo "This may take a few minutes..."

# Wait for workflow to start
sleep 5

# Get the workflow run ID for this tag
RUN_ID=$(gh run list --workflow=release.yml --limit=1 --json databaseId --jq '.[0].databaseId')

if [[ -n "$RUN_ID" ]]; then
  echo "📊 Workflow run ID: $RUN_ID"
  echo "🔍 Watching workflow progress..."
  echo "(Press Ctrl+C to detach and monitor manually)"
  echo ""

  # Watch the workflow with exit status
  if gh run watch "$RUN_ID" --exit-status; then
    echo ""
    echo "✅ Release v$VERSION completed successfully!"
    echo "📦 View on NPM: https://www.npmjs.com/package/xcodebuildmcp/v/$VERSION"
    echo "🎉 View release: https://github.com/cameroncooke/XcodeBuildMCP/releases/tag/v$VERSION"
    # MCP Registry verification link
    echo "🔎 Verify MCP Registry: https://registry.modelcontextprotocol.io/v0/servers?search=com.xcodebuildmcp/XcodeBuildMCP&version=latest"
  else
    echo ""
    echo "❌ CI workflow failed!"
    echo ""
    # Prefer job state: if the primary 'release' job succeeded, treat as success.
    RELEASE_JOB_CONCLUSION=$(gh run view "$RUN_ID" --json jobs --jq '.jobs[] | select(.name=="release") | .conclusion')
    if [ "$RELEASE_JOB_CONCLUSION" = "success" ]; then
      echo "⚠️ Workflow reported failure, but primary 'release' job concluded SUCCESS."
      echo "✅ Treating release as successful. Tag v$VERSION is kept."
      echo "📦 Verify on NPM: https://www.npmjs.com/package/xcodebuildmcp/v/$VERSION"
      exit 0
    fi
    echo "🧹 Cleaning up tags only (keeping version commit)..."

    # Delete remote tag
    echo "  - Deleting remote tag v$VERSION..."
    git push origin :refs/tags/v$VERSION 2>/dev/null || true

    # Delete local tag
    echo "  - Deleting local tag v$VERSION..."
    git tag -d v$VERSION

    echo ""
    echo "✅ Tag cleanup complete!"
    echo ""
    echo "ℹ️  The version commit remains in your history."
    echo "📝 To retry after fixing issues:"
    echo "   1. Fix the CI issues"
    echo "   2. Commit your fixes"
    echo "   3. Run: ./scripts/release.sh $VERSION"
    echo ""
    echo "🔍 To see what failed: gh run view $RUN_ID --log-failed"
    exit 1
  fi
else
  echo "⚠️  Could not find workflow run. Please check manually:"
  echo "https://github.com/cameroncooke/XcodeBuildMCP/actions"
fi
