export const workflow = {
  name: "iOS Simulator Workspace Development",
  description: "Complete iOS development workflow for .xcworkspace files (CocoaPods/SPM) targeting simulators. Build, test, deploy, and interact with iOS apps on simulators.",
  platforms: ["iOS"],
  targets: ["simulator"],
  projectTypes: ["workspace"],
  capabilities: ["build", "test", "deploy", "debug", "ui-automation", "log-capture"]
};