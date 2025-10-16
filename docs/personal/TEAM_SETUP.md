# Groove Jones Team Setup Guide

Internal setup instructions for Groove Jones developers to use Dale's XcodeBuildMCP fork with AVP enhancements.

---

## Quick Start

### Prerequisites

- macOS 14.5 or later
- Xcode 16.x or later  
- Node.js 18.x or later
- Apple Vision Pro simulator or physical device

### Installation

**Option 1: Use Dale's Fork Directly (Recommended)**

```bash
# Install from Dale's fork (personal branch)
npm install -g git+https://github.com/carmandale/XcodeBuildMCP.git#personal/avp-enhancements
```

**Option 2: Clone and Build Locally**

```bash
# Clone Dale's fork
git clone https://github.com/carmandale/XcodeBuildMCP.git
cd XcodeBuildMCP
git checkout personal/avp-enhancements

# Install dependencies and build
npm install
npm run build

# Use local build in MCP config (see below)
```

---

## Cursor Configuration

### Recommended: Dual-Mode Setup

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "XcodeBuildMCP-Production": {
      "command": "npx",
      "args": ["-y", "xcodebuildmcp@latest"],
      "env": {
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true",
        "INCREMENTAL_BUILDS_ENABLED": "false"
      }
    },
    "XcodeBuildMCP-GrooveJones": {
      "command": "node",
      "args": [
        "/path/to/your/clone/XcodeBuildMCP/build/index.js"
      ],
      "env": {
        "XCODEBUILDMCP_DEBUG": "true",
        "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing,project-scaffolding",
        "XCODEBUILDMCP_SENTRY_DISABLED": "true"
      }
    }
  }
}
```

**After updating config:**
```bash
# Quit Cursor completely
cmd+Q

# Relaunch Cursor
```

---

## Apple Vision Pro Workflow

### Critical Feature: Headset Log Capture

**The Problem We Solved:**
Previously, debugging AVP apps required manually copying logs from Console.app and pasting them into AI chat - wasting 5-10 minutes per debugging session.

**The Solution:**
XcodeBuildMCP automatically captures logs from your physical Vision Pro headset with zero copy-paste.

### Example Workflow

**In Cursor, just ask:**

```
"I need to debug my AVP app. Can you capture logs from my Vision Pro headset?"
```

**What happens automatically:**
1. AI calls `list_devices` → finds your Vision Pro
2. AI calls `start_device_log_cap` → starts log capture
3. You reproduce the issue on your headset
4. AI calls `stop_device_log_cap` → retrieves complete logs
5. AI analyzes logs and suggests fixes

**No manual intervention required!**

### Common AVP Tasks

**List Available visionOS Simulators:**
```
"Show me available Vision Pro simulators"
```

**Build and Run on Simulator:**
```
"Build and run my app on the Apple Vision Pro 4K simulator"
```

**Build for Physical Device:**
```
"Build my app for my Vision Pro device"
```

**Install and Launch:**
```
"Install and launch my app on the Vision Pro"
```

**Capture Logs During Testing:**
```
"Start capturing logs from my Vision Pro, I'm going to reproduce a crash"
```

---

## What's Different in Dale's Fork?

### Configuration Optimizations
- **Reduced tool count:** 61 tools instead of 83 (faster AI responses)
- **Privacy-focused:** Sentry telemetry disabled
- **AVP-focused workflows:** Only relevant tools loaded
- **Stable builds:** Incremental builds disabled

### Documentation Additions
- **AVP_WORKFLOW_GUIDE.md:** Complete Apple Vision Pro workflow documentation
- **Personal tracking:** Enhancement planning and change logs
- **Team setup:** This document

### Future Enhancements (Planned)
- **visionOS scaffolding:** Create new visionOS projects via AI
- **Enhanced log filtering:** Subsystem/category filtering for targeted debugging
- **Spatial audio tools:** Debug spatial audio positioning
- **Hand tracking automation:** Automated gesture testing

See `docs/personal/AVP_ENHANCEMENTS.md` for complete enhancement roadmap.

---

## Differences from Official Release

| Feature | Official (v1.14.1) | Dale's Fork |
|---------|-------------------|-------------|
| **visionOS Support** | ✅ Full support | ✅ Full support |
| **Tool Count** | 83 tools | 61 tools (optimized) |
| **AVP Documentation** | Basic | ✅ Comprehensive |
| **visionOS Scaffolding** | ❌ Not available | 📋 Planned |
| **Privacy** | Sentry enabled | ✅ Disabled |
| **Log Filters** | Basic | 📋 Enhanced (planned) |

---

## Troubleshooting

### Vision Pro Not Detected

**Symptoms:** `list_devices` doesn't show your headset

**Solutions:**
1. Ensure device is connected via USB or paired over Wi-Fi
2. Check device is unlocked and trusted ("Trust This Computer")
3. Verify in Terminal: `xcrun devicectl list devices`
4. Try disconnecting and reconnecting

### Log Capture Fails

**Symptoms:** `start_device_log_cap` returns error

**Solutions:**
1. Verify app is built with development provisioning
2. Check bundle ID matches installed app exactly
3. Ensure device is not in sleep mode
4. Check Xcode is not capturing logs simultaneously

### Build Fails for visionOS

**Symptoms:** Build commands fail with signing errors

**Solutions:**
1. Open project in Xcode first
2. Configure Signing & Capabilities
3. Enable "Automatically manage signing"
4. Select your development team
5. Verify provisioning profile is valid

### Cursor Doesn't See XcodeBuildMCP

**Symptoms:** AI says "XcodeBuildMCP not available"

**Solutions:**
1. Verify Cursor was completely quit and relaunched (cmd+Q)
2. Check `~/.cursor/mcp.json` syntax is valid (use JSON validator)
3. Look for MCP connection errors in Cursor's output panel
4. Try: `npx --package xcodebuildmcp@latest xcodebuildmcp-doctor`

---

## Verification

### Test Installation

**Run doctor tool:**
```bash
npx --package xcodebuildmcp@latest xcodebuildmcp-doctor
```

**Expected output:**
- ✅ Xcode 16.x detected
- ✅ AXe bundled
- ✅ 61+ tools available
- ✅ visionOS platform supported

### Test AVP Workflow

**In Cursor:**
```
"List available visionOS simulators"
```

**Expected:** Shows Apple Vision Pro simulators with xrOS runtimes

```
"Do you see my Vision Pro headset?"
```

**Expected:** If connected, confirms Vision Pro detection with UDID

---

## Getting Help

### Internal Support

**Primary Contact:** Dale Carman  
**Documentation:** `docs/personal/` directory  
**Fork URL:** https://github.com/carmandale/XcodeBuildMCP

### Upstream Support

**Official Repo:** https://github.com/cameroncooke/XcodeBuildMCP  
**Issues:** https://github.com/cameroncooke/XcodeBuildMCP/issues  
**Doctor Tool:** `npx --package xcodebuildmcp@latest xcodebuildmcp-doctor`

### Reporting Issues

**For fork-specific issues:**
- Contact Dale directly
- Document in team Slack
- Track in internal project management

**For upstream issues:**
- Run doctor tool and include output
- Create issue in upstream repository
- Tag Dale for awareness

---

## Keeping Up to Date

### Checking for Updates

**Dale's Fork:**
```bash
git fetch origin
git log --oneline personal/avp-enhancements ^HEAD
```

**Upstream:**
```bash
git fetch upstream
git log --oneline upstream/main ^main
```

### Updating Your Installation

**If using global install:**
```bash
npm install -g git+https://github.com/carmandale/XcodeBuildMCP.git#personal/avp-enhancements
```

**If using local clone:**
```bash
cd /path/to/XcodeBuildMCP
git pull origin personal/avp-enhancements
npm install
npm run build
```

**After updating:**
- Quit and relaunch Cursor
- Test with: "List visionOS simulators"

---

## Contributing Back

If you discover issues or have enhancement ideas:

1. **Document in team discussion** first
2. **Contact Dale** with proposal
3. **Dale updates** `AVP_ENHANCEMENTS.md`
4. **Collaborate** on implementation if appropriate

For contributions to upstream project, see Dale or `docs/CONTRIBUTING.md`.

---

## Best Practices

### Do's ✅

- Ask AI for help naturally - it knows how to use the tools
- Let AI handle the log capture workflow automatically
- Use visionOS simulators for rapid iteration
- Test on physical device before final validation
- Document any new workarounds or discoveries

### Don'ts ❌

- Don't manually copy-paste logs anymore (AI does this)
- Don't bypass code signing setup (required for device deployment)
- Don't ignore TypeScript/linting errors in contributions
- Don't modify XcodeBuildMCP code without coordinating with Dale

---

## Quick Reference

### Key Tools for AVP Development

| Tool | Purpose | Usage |
|------|---------|-------|
| `list_devices` | Find Vision Pro | "Show my Vision Pro" |
| `list_sims` | Find visionOS sims | "List visionOS simulators" |
| `build_device` | Build for AVP | "Build for Vision Pro" |
| `start_device_log_cap` | Capture headset logs | "Start capturing logs" |
| `stop_device_log_cap` | Get captured logs | AI does automatically |
| `install_app_device` | Install on AVP | "Install on my headset" |
| `launch_app_device` | Launch on AVP | "Launch the app" |

**Remember:** Just ask the AI naturally - it knows which tools to use!

---

## Changelog

### 2025-10-09: Initial Team Documentation
- Created setup guide
- Documented AVP workflow
- Added troubleshooting section
- Provided Cursor configuration examples

*This document will be updated as the fork evolves and new features are added.*

