#!/usr/bin/env bash

set -euo pipefail

VERSION=""
ARM64_SHA=""
X64_SHA=""
OUT_PATH=""

usage() {
  cat <<'EOF'
Usage:
  scripts/create-homebrew-formula.sh --version <semver> --arm64-sha <sha256> --x64-sha <sha256> [--out <path>]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="${2:-}"
      shift 2
      ;;
    --arm64-sha)
      ARM64_SHA="${2:-}"
      shift 2
      ;;
    --x64-sha)
      X64_SHA="${2:-}"
      shift 2
      ;;
    --out)
      OUT_PATH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$VERSION" || -z "$ARM64_SHA" || -z "$X64_SHA" ]]; then
  usage
  exit 1
fi

FORMULA_CONTENT="$(cat <<EOF
class Xcodebuildmcp < Formula
  desc "Model Context Protocol server for Xcode project workflows"
  homepage "https://github.com/cameroncooke/XcodeBuildMCP"
  license "MIT"
  version "$VERSION"

  on_arm do
    url "https://github.com/cameroncooke/XcodeBuildMCP/releases/download/v$VERSION/xcodebuildmcp-$VERSION-darwin-arm64.tar.gz"
    sha256 "$ARM64_SHA"
  end

  on_intel do
    url "https://github.com/cameroncooke/XcodeBuildMCP/releases/download/v$VERSION/xcodebuildmcp-$VERSION-darwin-x64.tar.gz"
    sha256 "$X64_SHA"
  end

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/xcodebuildmcp"
    bin.install_symlink libexec/"bin/xcodebuildmcp-doctor"
  end

  test do
    assert_match "xcodebuildmcp", shell_output("#{bin}/xcodebuildmcp --help")
  end
end
EOF
)"

if [[ -n "$OUT_PATH" ]]; then
  mkdir -p "$(dirname "$OUT_PATH")"
  printf "%s\n" "$FORMULA_CONTENT" > "$OUT_PATH"
else
  printf "%s\n" "$FORMULA_CONTENT"
fi

