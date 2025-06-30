export const workflow = {
  name: "iOS Device Workspace Development",
  description: "Complete iOS development workflow for .xcworkspace files targeting physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Build, test, deploy, and debug on real hardware.",
  platforms: ["iOS", "watchOS", "tvOS", "visionOS"],
  targets: ["device"],
  projectTypes: ["workspace"],
  capabilities: ["build", "test", "deploy", "debug", "log-capture", "device-management"]
};