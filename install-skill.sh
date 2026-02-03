#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: install-skill.sh --codex|--claude|--cursor|--dest <path> [--skill <mcp|cli>] [--ref <git-ref>] [--remove-conflict]

Installs (or replaces) the XcodeBuildMCP skill. If --skill is omitted, the
installer will ask which skill to install.
If the script is run from a local checkout, it installs the local skill file.
Otherwise it downloads the skill from the provided --ref or from main.

If no destination is provided, the installer will prompt for a client.
EOF
}

destination=""
skill_choice=""
skill_ref_override=""
remove_conflict="false"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"

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
    --cursor)
      destination="${HOME}/.cursor/skills"
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
    --skill)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --skill" >&2
        usage
        exit 1
      fi
      skill_choice="$2"
      shift 2
      ;;
    --ref)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --ref" >&2
        usage
        exit 1
      fi
      skill_ref_override="$2"
      shift 2
      ;;
    --remove-conflict)
      remove_conflict="true"
      shift
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

prompt_for_destination() {
  while true; do
    printf "Which client should receive the skill?\n"
    printf "1) Codex\n"
    printf "2) Claude\n"
    printf "3) Cursor\n"
    read -r -p "Enter 1, 2, or 3: " selection
    case "${selection}" in
      1)
        destination="${HOME}/.codex/skills/public"
        return 0
        ;;
      2)
        destination="${HOME}/.claude/skills"
        return 0
        ;;
      3)
        destination="${HOME}/.cursor/skills"
        return 0
        ;;
      *)
        echo "Invalid selection. Please enter 1, 2, or 3."
        ;;
    esac
  done
}

prompt_for_skill() {
  while true; do
    printf "Which skill would you like to install?\n"
    printf "1) XcodeBuildMCP (MCP server)\n"
    printf "2) XcodeBuildMCP CLI\n"
    read -r -p "Enter 1 or 2: " selection
    case "${selection}" in
      1)
        skill_choice="mcp"
        return 0
        ;;
      2)
        skill_choice="cli"
        return 0
        ;;
      *)
        echo "Invalid selection. Please enter 1 or 2."
        ;;
    esac
  done
}

if [[ -z "${destination}" ]]; then
  prompt_for_destination
fi

if [[ -z "${skill_choice}" ]]; then
  prompt_for_skill
fi

case "${skill_choice}" in
  mcp|server|xcodebuildmcp)
    skill_dir_name="xcodebuildmcp"
    skill_label="XcodeBuildMCP (MCP server)"
    alt_dir_name="xcodebuildmcp-cli"
    alt_label="XcodeBuildMCP CLI"
    ;;
  cli|xcodebuildmcp-cli)
    skill_dir_name="xcodebuildmcp-cli"
    skill_label="XcodeBuildMCP CLI"
    alt_dir_name="xcodebuildmcp"
    alt_label="XcodeBuildMCP (MCP server)"
    ;;
  *)
    echo "Unknown skill: ${skill_choice}" >&2
    usage
    exit 1
    ;;
esac

skill_dir="${destination}/${skill_dir_name}"
alt_dir="${destination}/${alt_dir_name}"
skill_path="skills/${skill_dir_name}/SKILL.md"
skill_base_url="https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP"
skill_ref="main"

if [[ -n "${skill_ref_override}" ]]; then
  skill_ref="${skill_ref_override}"
fi

if [[ -e "${alt_dir}" ]]; then
  if [[ "${remove_conflict}" == "true" ]]; then
    rm -r "${alt_dir}"
  else
    printf "%s\n" "Only one skill can be installed at a time because the MCP and CLI skills conflict."
    read -r -p "Found ${alt_label} at ${alt_dir}. Remove it to continue? [y/N]: " confirm
    case "${confirm}" in
      y|Y|yes|YES)
        rm -r "${alt_dir}"
        ;;
      *)
        echo "Aborting to avoid installing both skills."
        exit 1
        ;;
    esac
  fi
fi

if [[ -e "${skill_dir}" ]]; then
  rm -r "${skill_dir}"
fi
mkdir -p "${skill_dir}"

primary_url="${skill_base_url}/${skill_ref}/${skill_path}"
fallback_url="${skill_base_url}/main/${skill_path}"
local_skill_path="${repo_root}/${skill_path}"

if [[ -f "${local_skill_path}" ]]; then
  cp "${local_skill_path}" "${skill_dir}/SKILL.md"
else
  if ! curl -fsSL "${primary_url}" -o "${skill_dir}/SKILL.md"; then
    if [[ "${skill_ref}" != "main" ]]; then
      printf "%s\n" "Release tag ${skill_ref} not found. Falling back to main."
      curl -fsSL "${fallback_url}" -o "${skill_dir}/SKILL.md"
    else
      printf "%s\n" "Failed to download ${primary_url}." >&2
      exit 1
    fi
  fi
fi

printf 'Installed %s to %s\n' "${skill_label}" "${skill_dir}"
