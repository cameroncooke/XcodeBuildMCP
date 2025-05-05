#!/bin/bash
set -e

# Usage: ./release.sh <version> [npm-tag] [--dry-run]
VERSION=$1
DRY_RUN=false
NPM_TAG_SPECIFIED=false
NPM_TAG="latest"

# Set default tag based on version format
if [[ "$VERSION" =~ -beta ]]; then
  NPM_TAG="beta"
elif [[ "$VERSION" =~ -alpha ]]; then
  NPM_TAG="alpha"
elif [[ "$VERSION" =~ -rc ]]; then
  NPM_TAG="rc"
elif [[ "$VERSION" =~ -experimental ]]; then
  NPM_TAG="experimental"
fi

# Check for arguments and set flags
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  elif [[ "$arg" != "$VERSION" && "$arg" != "--dry-run" ]]; then
    # If argument is not the version and not --dry-run, treat it as the npm tag
    NPM_TAG="$arg"
    NPM_TAG_SPECIFIED=true
  fi
done

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> [npm-tag] [--dry-run]"
  exit 1
fi

# Detect current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Enforce branch/tag policy (customize as needed)
if [[ "$BRANCH" == "main" && "$NPM_TAG" != "latest" && "$NPM_TAG_SPECIFIED" == false ]]; then
  echo "⚠️ Warning: Publishing a non-latest tag from main branch."
  echo "Continue? (y/n)"
  read -r CONTINUE
  if [[ "$CONTINUE" != "y" ]]; then
    echo "❌ Release cancelled."
    exit 1
  fi
fi

if [[ "$BRANCH" != "main" && "$NPM_TAG" == "latest" ]]; then
  echo "⚠️ Warning: Publishing with tag '$NPM_TAG' from non-main branch."
  echo "Continue? (y/n)"
  read -r CONTINUE
  if [[ "$CONTINUE" != "y" ]]; then
    echo "❌ Release cancelled."
    exit 1
  fi
fi

run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

# Version update
echo ""
echo "🔧 Setting version to $VERSION..."
run "npm version \"$VERSION\" --no-git-tag-version"

# README update
echo ""
echo "📝 Updating version in README.md..."
run "sed -i '' -E \"s/@[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?/@$VERSION/g\" README.md"

# Build
echo ""
echo "🛠  Running build..."
run "npm run build"

# Git operations
echo ""
echo "📦 Committing changes..."
run "git add ."
run "git commit -m \"Release v$VERSION\""
run "git tag \"v$VERSION\""

echo ""
echo "🚀 Pushing to origin..."
run "git push origin $BRANCH --tags"

# npm publish
echo ""
echo "📤 Publishing to npm with tag '$NPM_TAG'..."
run "npm publish --tag $NPM_TAG"

# Completion message
echo ""
echo "✅ Release v$VERSION complete!"
echo "📝 Don't forget to update the changelog"