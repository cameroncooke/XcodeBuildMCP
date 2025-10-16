# Dale's XcodeBuildMCP Fork - Change Log

**Personal Fork:** https://github.com/carmandale/XcodeBuildMCP  
**Upstream:** https://github.com/cameroncooke/XcodeBuildMCP  
**Primary Branch:** `personal/avp-enhancements`  
**Last Synced:** 2025-10-09 (v1.14.1)

---

## Overview

Personal fork of XcodeBuildMCP for Groove Jones Apple Vision Pro development. This fork tracks custom modifications, enhancements, and configurations specific to AVP workflows while maintaining sync capability with upstream updates.

## Current Modifications

### Configuration Optimizations (2025-10-09)
**Status:** ✅ Complete  
**Branch:** `personal/avp-enhancements`

**Changes:**
- Optimized Cursor MCP configuration for AVP workflows
- Added XcodeBuildMCP to Factory AI Droid CLI
- Dual-mode setup (Production + Dev) in both tools
- Enabled workflows: simulator, device, logging, project-discovery, ui-testing
- Disabled Sentry telemetry for privacy
- Disabled incremental builds (experimental feature)

**Files Modified:**
- `~/.cursor/mcp.json` - Cursor configuration (not in repo)
- `~/.factory/mcp.json` - Factory AI configuration (not in repo)

**Benefits:**
- Reduced tool count from 83 to 61 (faster context)
- Privacy-focused (no telemetry)
- Focused on AVP development needs
- Available in both Cursor and Factory AI Droid CLI
- Can switch between stable (Production) and development versions

---

### Documentation Additions (2025-10-09)
**Status:** ✅ Complete  
**Branch:** `personal/avp-enhancements`

**New Files:**
- `AVP_WORKFLOW_GUIDE.md` - Complete Apple Vision Pro workflow documentation
- `docs/personal/DALE_CHANGES.md` - This file
- `docs/personal/AVP_ENHANCEMENTS.md` - Enhancement wishlist
- `docs/personal/TEAM_SETUP.md` - Team installation guide

**Purpose:**
- Document AVP-specific workflows
- Track personal modifications
- Enable team collaboration

**Upstream Contribution:** Candidate - AVP_WORKFLOW_GUIDE.md could be contributed

---

## Planned Enhancements

See `AVP_ENHANCEMENTS.md` for detailed enhancement tracking.

### Priority 1: Test Current AVP Workflow
**Status:** 🔄 In Progress  
**Target:** 2025-10-10

- [ ] Test visionOS simulator build and run
- [ ] Test physical Vision Pro log capture
- [ ] Verify UI automation on visionOS
- [ ] Document any issues or limitations

### Priority 2: visionOS Project Scaffolding
**Status:** 📋 Planned  
**Target:** 2025-10-15

**Goal:** Add `scaffold_visionos_project` tool matching iOS/macOS patterns

**Requirements:**
- Create `src/mcp/tools/project-scaffolding/scaffold_visionos_project.ts`
- Create comprehensive tests following DI pattern
- Create template repository: `XcodeBuildMCP-visionOS-Template`
- Update workflow metadata

**Upstream Contribution:** Strong candidate

### Priority 3: Enhanced AVP Log Filtering
**Status:** 💭 Research  
**Target:** TBD

**Goal:** Add subsystem/category filtering for Vision Pro logs

**Notes:**
- May be too specific for upstream
- Useful for spatial audio debugging
- Needs research on xcrun devicectl capabilities

---

## Sync History

### 2025-10-09: Initial Fork
- Forked from upstream at v1.14.1
- Created personal tracking branch: `personal/avp-enhancements`
- Set up documentation system
- Configured remotes (origin=fork, upstream=original)

### Next Sync: TBD (Monthly recommended)
```bash
git checkout main
git fetch upstream
git pull upstream main
git push origin main
git checkout personal/avp-enhancements
git rebase main
npm run build && npm test
```

---

## Maintenance Procedures

### Before Any Commit

**MANDATORY quality checks:**
```bash
npm run typecheck  # Must pass with 0 errors
npm run lint       # Must pass
npm run test       # All tests must pass
npm run build      # Must compile successfully
```

**Documentation:**
- Update this file with changes
- Update AVP_ENHANCEMENTS.md status
- Note upstream contribution candidates

### Monthly Upstream Sync

1. Fetch upstream changes
2. Merge into local main
3. Push to fork
4. Rebase personal branch
5. Test and rebuild
6. Update "Last Synced" date

### Team Distribution

See `TEAM_SETUP.md` for installation instructions for Groove Jones developers.

---

## Known Issues

None currently. This section will track:
- Build issues
- Platform incompatibilities  
- Workarounds required
- Breaking changes from upstream

---

## Enhancement Wishlist

**Future Considerations:**
- [ ] Spatial audio debugging tools
- [ ] Hand tracking gesture automation for testing
- [ ] Multi-user AVP testing coordination
- [ ] Immersive space testing tools
- [ ] Reality Composer Pro integration
- [ ] SharePlay testing tools

See `AVP_ENHANCEMENTS.md` for detailed planning.

---

## Upstream Contribution Candidates

**Ready to Contribute:**
- None yet - testing phase

**Under Consideration:**
- AVP_WORKFLOW_GUIDE.md - Comprehensive visionOS documentation
- visionOS project scaffolding (when complete)

**Internal Only:**
- Custom log filters (too specific)
- Groove Jones-specific configurations

---

## Contact & Support

**Maintainer:** Dale Carman (Groove Jones)  
**Team Documentation:** See `docs/personal/TEAM_SETUP.md`  
**Upstream Issues:** https://github.com/cameroncooke/XcodeBuildMCP/issues  
**Fork Issues:** Track internally

---

## Notes

- This fork maintains full compatibility with upstream
- Changes are additive, not destructive
- All modifications documented in this file
- Sync with upstream monthly to receive bug fixes
- Consider contributing useful features back to community

