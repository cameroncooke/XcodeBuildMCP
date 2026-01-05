# Device Code Signing

For device deployment features to work, code signing must be configured in Xcode before using XcodeBuildMCP device tools.

## One-time setup in Xcode
1. Open your project in Xcode.
2. Select your project target.
3. Open the "Signing & Capabilities" tab.
4. Enable "Automatically manage signing" and select your development team.
5. Ensure a valid provisioning profile is selected.

## What XcodeBuildMCP can and cannot do
- Can build, install, launch, and test once signing is configured.
- Cannot configure code signing automatically.

## Related docs
- Tools reference: [TOOLS.md](TOOLS.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
