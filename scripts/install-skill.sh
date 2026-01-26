#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: install-skill.sh --codex|--claude|--dest <path>

Installs (or replaces) the XcodeBuildMCP skill.

You must choose a destination with --codex, --claude, or --dest.
EOF
}

destination=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --codex)
      destination="${HOME}/.codex/skills/public"
      shift
      ;;
    --claude)
      destination="${HOME}/.claude/skills"
      shift
      ;;
    --dest)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --dest" >&2
        usage
        exit 1
      fi
      destination="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${destination}" ]]; then
  echo "Missing destination option." >&2
  usage
  exit 1
fi

skill_dir="${destination}/xcodebuildmcp"
skill_url="https://raw.githubusercontent.com/cameroncook/XcodeBuildMCP/main/skills/xcodebuildmcp/SKILL.md"

rm -rf "${skill_dir}"
mkdir -p "${skill_dir}"
curl -fsSL "${skill_url}" -o "${skill_dir}/SKILL.md"

printf 'Installed XcodeBuildMCP skill to %s\n' "${skill_dir}"
