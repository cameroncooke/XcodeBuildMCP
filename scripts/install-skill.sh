#!/usr/bin/env bash
set -euo pipefail

# Colors and formatting
if [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  RESET='\033[0m'
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
else
  BOLD=''
  DIM=''
  RESET=''
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
fi

# Symbols
CHECK="${GREEN}✓${RESET}"
CROSS="${RED}✗${RESET}"
ARROW="${CYAN}→${RESET}"
WARN="${YELLOW}!${RESET}"

print_header() {
  printf "\n"
  printf "${BOLD}${BLUE}╭──────────────────────────────────╮${RESET}\n"
  printf "${BOLD}${BLUE}│${RESET}   ${BOLD}XcodeBuildMCP Skill Installer${RESET}  ${BOLD}${BLUE}│${RESET}\n"
  printf "${BOLD}${BLUE}╰──────────────────────────────────╯${RESET}\n"
}

print_success() {
  printf "  ${CHECK} ${GREEN}%s${RESET}\n" "$1"
}

print_error() {
  printf "  ${CROSS} ${RED}%s${RESET}\n" "$1" >&2
}

print_warning() {
  printf "  ${WARN} ${YELLOW}%s${RESET}\n" "$1"
}

print_info() {
  printf "  ${ARROW} %s\n" "$1"
}

print_step() {
  printf "\n${BOLD}%s${RESET}\n" "$1"
}

usage() {
  cat <<EOF
${BOLD}Usage:${RESET} install-skill.sh --codex|--claude|--cursor|--dest <path> [options]

${BOLD}Options:${RESET}
  --codex             Install to Codex skills directory
  --claude            Install to Claude skills directory
  --cursor            Install to Cursor skills directory
  --dest <path>       Install to custom directory
  --skill <mcp|cli>   Skill to install (prompted if omitted)
  --ref <git-ref>     Git ref to download from (default: main)
  --remove-conflict   Auto-remove conflicting skill
  -h, --help          Show this help message

${BOLD}Description:${RESET}
  Installs the XcodeBuildMCP skill for your AI coding assistant.
  If run from a local checkout, installs the local skill file.
  Otherwise downloads from GitHub.
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
  print_step "Select Target Client"
  while true; do
    printf "\n"
    printf "  ${CYAN}[1]${RESET} Codex\n"
    printf "  ${CYAN}[2]${RESET} Claude\n"
    printf "  ${CYAN}[3]${RESET} Cursor\n"
    printf "\n"
    printf "  ${DIM}Enter your choice${RESET} ${BOLD}[1-3]:${RESET} "
    read -r selection
    case "${selection}" in
      1)
        destination="${HOME}/.codex/skills/public"
        print_success "Selected Codex"
        return 0
        ;;
      2)
        destination="${HOME}/.claude/skills"
        print_success "Selected Claude"
        return 0
        ;;
      3)
        destination="${HOME}/.cursor/skills"
        print_success "Selected Cursor"
        return 0
        ;;
      *)
        print_error "Invalid selection. Please enter 1, 2, or 3."
        ;;
    esac
  done
}

prompt_for_skill() {
  print_step "Select Skill Type"
  while true; do
    printf "\n"
    printf "  ${CYAN}[1]${RESET} XcodeBuildMCP ${DIM}(MCP server)${RESET}\n"
    printf "      ${DIM}Full MCP integration with all tools${RESET}\n"
    printf "\n"
    printf "  ${CYAN}[2]${RESET} XcodeBuildMCP CLI\n"
    printf "      ${DIM}Lightweight CLI-based commands${RESET}\n"
    printf "\n"
    printf "  ${DIM}Enter your choice${RESET} ${BOLD}[1-2]:${RESET} "
    read -r selection
    case "${selection}" in
      1)
        skill_choice="mcp"
        print_success "Selected MCP server skill"
        return 0
        ;;
      2)
        skill_choice="cli"
        print_success "Selected CLI skill"
        return 0
        ;;
      *)
        print_error "Invalid selection. Please enter 1 or 2."
        ;;
    esac
  done
}

print_header

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
skill_base_url="https://raw.githubusercontent.com/getsentry/XcodeBuildMCP"
skill_ref="main"

if [[ -n "${skill_ref_override}" ]]; then
  skill_ref="${skill_ref_override}"
fi

print_step "Installing"

if [[ -e "${alt_dir}" ]]; then
  if [[ "${remove_conflict}" == "true" ]]; then
    rm -r "${alt_dir}"
    print_info "Removed conflicting skill: ${alt_label}"
  else
    printf "\n"
    print_warning "Conflict detected!"
    printf "  ${DIM}Only one skill can be installed at a time.${RESET}\n"
    printf "  ${DIM}Found:${RESET} ${alt_label}\n"
    printf "  ${DIM}Path:${RESET}  ${alt_dir}\n"
    printf "\n"
    printf "  ${BOLD}Remove existing skill to continue?${RESET} ${DIM}[y/N]:${RESET} "
    read -r confirm
    case "${confirm}" in
      y|Y|yes|YES)
        rm -r "${alt_dir}"
        print_success "Removed ${alt_label}"
        ;;
      *)
        print_error "Installation cancelled"
        exit 1
        ;;
    esac
  fi
fi

if [[ -e "${skill_dir}" ]]; then
  rm -r "${skill_dir}"
  print_info "Replacing existing installation"
fi
mkdir -p "${skill_dir}"

primary_url="${skill_base_url}/${skill_ref}/${skill_path}"
fallback_url="${skill_base_url}/main/${skill_path}"
local_skill_path="${repo_root}/${skill_path}"

if [[ -f "${local_skill_path}" ]]; then
  cp "${local_skill_path}" "${skill_dir}/SKILL.md"
  print_info "Installed from local checkout"
else
  print_info "Downloading from GitHub..."
  if ! curl -fsSL "${primary_url}" -o "${skill_dir}/SKILL.md" 2>/dev/null; then
    if [[ "${skill_ref}" != "main" ]]; then
      print_warning "Tag ${skill_ref} not found, falling back to main"
      if ! curl -fsSL "${fallback_url}" -o "${skill_dir}/SKILL.md" 2>/dev/null; then
        print_error "Failed to download skill"
        exit 1
      fi
    else
      print_error "Failed to download skill"
      exit 1
    fi
  fi
fi

printf "\n"
printf "${BOLD}${GREEN}╭─────────────────────────────────────╮${RESET}\n"
printf "${BOLD}${GREEN}│${RESET}       ${CHECK} ${BOLD}Installation Complete${RESET}       ${BOLD}${GREEN}│${RESET}\n"
printf "${BOLD}${GREEN}╰─────────────────────────────────────╯${RESET}\n"
printf "\n"
printf "  ${BOLD}Skill:${RESET}    %s\n" "${skill_label}"
printf "  ${BOLD}Location:${RESET} %s\n" "${skill_dir}"
printf "\n"
