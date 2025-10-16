#!/bin/bash

# XcodeBuildMCP Claude Code Setup Script
# Purpose: Configure Claude Code CLI to use local XcodeBuildMCP build
# Author: Generated based on MCP configuration documentation
# Date: 2025-01-11

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the absolute path of the XcodeBuildMCP project
XCODEBUILD_MCP_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_PATH="$XCODEBUILD_MCP_PATH/build/index.js"

# Configuration function for Claude Code
configure_claude_code() {
    local config_file="$HOME/.claude.json"
    local backup_file="$HOME/.claude.json.backup.$(date +%Y%m%d_%H%M%S)"
    
    print_status "Configuring Claude Code CLI..."
    
    # Check if config file exists
    if [[ -f "$config_file" ]]; then
        print_status "Found existing Claude Code configuration"
        print_status "Creating backup: $backup_file"
        cp "$config_file" "$backup_file"
    else
        print_status "No existing Claude Code configuration found"
        print_status "Creating new configuration file"
        echo '{}' > "$config_file"
    fi
    
    # Check if build exists
    if [[ ! -f "$BUILD_PATH" ]]; then
        print_error "XcodeBuildMCP build not found at: $BUILD_PATH"
        print_status "Please run 'npm run build' first"
        exit 1
    fi
    
    # Read existing config
    local config=$(cat "$config_file")
    
    # Update configuration with XcodeBuildMCP
    local updated_config=$(echo "$config" | jq --arg build_path "$BUILD_PATH" '
        if .mcpServers then 
            .mcpServers."XcodeBuildMCP" = {
                "type": "stdio",
                "command": "node",
                "args": [$build_path],
                "env": {
                    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
                    "XCODEBUILDMCP_SENTRY_DISABLED": "true",
                    "INCREMENTAL_BUILDS_ENABLED": "false"
                }
            }
        else
            .mcpServers = {
                "XcodeBuildMCP": {
                    "type": "stdio",
                    "command": "node",
                    "args": [$build_path],
                    "env": {
                        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
                        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
                        "INCREMENTAL_BUILDS_ENABLED": "false"
                    }
                }
            }
        end
    ')
    
    # Write updated configuration
    echo "$updated_config" > "$config_file"
    print_success "Claude Code configuration updated"
}

# Configuration function for Claude Desktop
configure_claude_desktop() {
    local config_dir="$HOME/Library/Application Support/Claude"
    local config_file="$config_dir/claude_desktop_config.json"
    local backup_file="$config_file.backup.$(date +%Y%m%d_%H%M%S)"
    
    print_status "Configuring Claude Desktop..."
    
    # Create config directory if it doesn't exist
    mkdir -p "$config_dir"
    
    # Check if config file exists
    if [[ -f "$config_file" ]]; then
        print_status "Found existing Claude Desktop configuration"
        print_status "Creating backup: $backup_file"
        cp "$config_file" "$backup_file"
    else
        print_status "No existing Claude Desktop configuration found"
        print_status "Creating new configuration file"
        echo '{}' > "$config_file"
    fi
    
    # Check if build exists
    if [[ ! -f "$BUILD_PATH" ]]; then
        print_error "XcodeBuildMCP build not found at: $BUILD_PATH"
        print_status "Please run 'npm run build' first"
        exit 1
    fi
    
    # Read existing config
    local config=$(cat "$config_file")
    
    # Update configuration with XcodeBuildMCP
    local updated_config=$(echo "$config" | jq --arg build_path "$BUILD_PATH" '
        if .mcpServers then 
            .mcpServers."XcodeBuildMCP" = {
                "command": "node",
                "args": [$build_path],
                "env": {
                    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
                    "XCODEBUILDMCP_SENTRY_DISABLED": "true",
                    "INCREMENTAL_BUILDS_ENABLED": "false"
                }
            }
        else
            .mcpServers = {
                "XcodeBuildMCP": {
                    "command": "node",
                    "args": [$build_path],
                    "env": {
                        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
                        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
                        "INCREMENTAL_BUILDS_ENABLED": "false"
                    }
                }
            }
        end
    ')
    
    # Write updated configuration
    echo "$updated_config" > "$config_file"
    print_success "Claude Desktop configuration updated"
    print_warning "Remember to restart Claude Desktop for changes to take effect"
}

# Configuration function for Factory Droid
configure_factory_droid() {
    local config_dir="$HOME/.factory"
    local config_file="$config_dir/mcp.json"
    local backup_file="$config_file.backup.$(date +%Y%m%d_%H%M%S)"
    
    print_status "Configuring Factory Droid..."
    
    # Create config directory if it doesn't exist
    mkdir -p "$config_dir"
    
    # Check if config file exists
    if [[ -f "$config_file" ]]; then
        print_status "Found existing Factory Droid configuration"
        print_status "Creating backup: $backup_file"
        cp "$config_file" "$backup_file"
    else
        print_status "No existing Factory Droid configuration found"
        print_status "Creating new configuration file"
        echo '{}' > "$config_file"
    fi
    
    # Check if build exists
    if [[ ! -f "$BUILD_PATH" ]]; then
        print_error "XcodeBuildMCP build not found at: $BUILD_PATH"
        print_status "Please run 'npm run build' first"
        exit 1
    fi
    
    # Read existing config
    local config=$(cat "$config_file")
    
    # Update configuration with XcodeBuildMCP
    local updated_config=$(echo "$config" | jq --arg build_path "$BUILD_PATH" '
        if .mcpServers then 
            .mcpServers."XcodeBuildMCP" = {
                "type": "stdio",
                "command": "node",
                "args": [$build_path],
                "env": {
                    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
                    "XCODEBUILDMCP_SENTRY_DISABLED": "true",
                    "INCREMENTAL_BUILDS_ENABLED": "false"
                },
                "disabled": false
            }
        else
            .mcpServers = {
                "XcodeBuildMCP": {
                    "type": "stdio",
                    "command": "node",
                    "args": [$build_path],
                    "env": {
                        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
                        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
                        "INCREMENTAL_BUILDS_ENABLED": "false"
                    },
                    "disabled": false
                }
            }
        end
    ')
    
    # Write updated configuration
    echo "$updated_config" > "$config_file"
    print_success "Factory Droid configuration updated"
}

# Verify configuration
verify_configuration() {
    local tool="$1"
    
    print_status "Verifying $tool configuration..."
    
    case "$tool" in
        "claude-code")
            if command -v claude &> /dev/null; then
                print_status "Checking Claude Code MCP servers..."
                claude mcp list 2>/dev/null || print_warning "Could not verify Claude Code configuration (claude command not available or not configured)"
            else
                print_warning "Claude Code CLI not installed, skipping verification"
            fi
            ;;
        "claude-desktop")
            if [[ -f "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ]]; then
                print_success "Claude Desktop configuration file exists"
            else
                print_warning "Claude Desktop configuration file not found"
            fi
            ;;
        "factory-droid")
            if [[ -f "$HOME/.factory/mcp.json" ]]; then
                print_success "Factory Droid configuration file exists"
            else
                print_warning "Factory Droid configuration file not found"
            fi
            ;;
    esac
}

# Show usage
usage() {
    echo "XcodeBuildMCP Configuration Script"
    echo ""
    echo "Usage: $0 [OPTIONS] [TOOL]"
    echo ""
    echo "TOOLS:"
    echo "  claude-code     Configure Claude Code CLI"
    echo "  claude-desktop  Configure Claude Desktop"
    echo "  factory-droid   Configure Factory Droid CLI"
    echo "  all             Configure all tools (default)"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help      Show this help message"
    echo "  -v, --verbose   Enable verbose output"
    echo "  --verify-only   Only verify existing configurations"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                           # Configure all tools"
    echo "  $0 claude-code               # Configure only Claude Code"
    echo "  $0 --verify-only all         # Verify all configurations"
}

# Main script logic
main() {
    local tool="all"
    local verify_only=false
    local verbose=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --verify-only)
                verify_only=true
                shift
                ;;
            claude-code|claude-desktop|factory-droid|all)
                tool="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    if [[ "$verbose" == true ]]; then
        set -x
    fi
    
    print_status "XcodeBuildMCP Configuration Script"
    print_status "Project path: $XCODEBUILD_MCP_PATH"
    print_status "Build path: $BUILD_PATH"
    echo ""
    
    if [[ "$verify_only" == true ]]; then
        case "$tool" in
            "all")
                verify_configuration "claude-code"
                verify_configuration "claude-desktop"
                verify_configuration "factory-droid"
                ;;
            *)
                verify_configuration "$tool"
                ;;
        esac
        exit 0
    fi
    
    # Configure requested tool(s
    case "$tool" in
        "all")
            configure_claude_code
            echo ""
            configure_claude_desktop
            echo ""
            configure_factory_droid
            echo ""
            verify_configuration "claude-code"
            verify_configuration "claude-desktop"
            verify_configuration "factory-droid"
            ;;
        "claude-code")
            configure_claude_code
            echo ""
            verify_configuration "claude-code"
            ;;
        "claude-desktop")
            configure_claude_desktop
            echo ""
            verify_configuration "claude-desktop"
            ;;
        "factory-droid")
            configure_factory_droid
            echo ""
            verify_configuration "factory-droid"
            ;;
    esac
    
    echo ""
    print_success "Configuration complete!"
    print_status "Don't forget to:"
    print_status "  1. Run 'npm run build' if you haven't already"
    print_status "  2. Restart Claude Desktop if configured"
    print_status "  3. Restart Claude Code if configured"
    echo ""
    print_status "For more information, see: MCP_CONFIG_LOCATIONS.md"
}

# Check dependencies
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq first."
    print_status "On macOS: brew install jq"
    exit 1
fi

# Run main function
main "$@"
