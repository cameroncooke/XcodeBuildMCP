import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { log } from './logger.js';
import { iOSTemplateVersion, macOSTemplateVersion } from '../version.js';
import { CommandExecutor, FileSystemExecutor } from './command.js';

/**
 * Template manager for downloading and managing project templates
 */
export class TemplateManager {
  private static readonly GITHUB_ORG = 'cameroncooke';
  private static readonly IOS_TEMPLATE_REPO = 'XcodeBuildMCP-iOS-Template';
  private static readonly MACOS_TEMPLATE_REPO = 'XcodeBuildMCP-macOS-Template';

  /**
   * Get the template path for a specific platform
   * Checks for local override via environment variable first
   */
  static async getTemplatePath(
    platform: 'iOS' | 'macOS',
    commandExecutor: CommandExecutor,
    fileSystemExecutor: FileSystemExecutor,
  ): Promise<string> {
    // Check for local override
    const envVar =
      platform === 'iOS' ? 'XCODEBUILDMCP_IOS_TEMPLATE_PATH' : 'XCODEBUILDMCP_MACOS_TEMPLATE_PATH';

    const localPath = process.env[envVar];
    log('debug', `[TemplateManager] Checking env var '${envVar}'. Value: '${localPath}'`);

    if (localPath) {
      const pathExists = fileSystemExecutor.existsSync(localPath);
      log('debug', `[TemplateManager] Env var set. Path '${localPath}' exists? ${pathExists}`);
      if (pathExists) {
        const templateSubdir = join(localPath, 'template');
        const subdirExists = fileSystemExecutor.existsSync(templateSubdir);
        log(
          'debug',
          `[TemplateManager] Checking for subdir '${templateSubdir}'. Exists? ${subdirExists}`,
        );
        if (subdirExists) {
          log('info', `Using local ${platform} template from: ${templateSubdir}`);
          return templateSubdir;
        } else {
          log('info', `Template directory not found in ${localPath}, using GitHub release`);
        }
      }
    }

    log('debug', '[TemplateManager] Env var not set or path invalid, proceeding to download.');
    // Download from GitHub release
    return await this.downloadTemplate(platform, commandExecutor, fileSystemExecutor);
  }

  /**
   * Download template from GitHub release
   */
  private static async downloadTemplate(
    platform: 'iOS' | 'macOS',
    commandExecutor: CommandExecutor,
    fileSystemExecutor: FileSystemExecutor,
  ): Promise<string> {
    const repo = platform === 'iOS' ? this.IOS_TEMPLATE_REPO : this.MACOS_TEMPLATE_REPO;
    const defaultVersion = platform === 'iOS' ? iOSTemplateVersion : macOSTemplateVersion;
    const envVarName =
      platform === 'iOS'
        ? 'XCODEBUILD_MCP_IOS_TEMPLATE_VERSION'
        : 'XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION';
    const version =
      process.env[envVarName] ?? process.env.XCODEBUILD_MCP_TEMPLATE_VERSION ?? defaultVersion;

    // Create temp directory for download
    const tempDir = join(tmpdir(), `xcodebuild-mcp-template-${randomUUID()}`);
    await fileSystemExecutor.mkdir(tempDir, { recursive: true });

    try {
      const downloadUrl = `https://github.com/${this.GITHUB_ORG}/${repo}/releases/download/${version}/${repo}-${version.substring(1)}.zip`;
      const zipPath = join(tempDir, 'template.zip');

      log('info', `Downloading ${platform} template ${version} from GitHub...`);
      log('info', `Download URL: ${downloadUrl}`);

      // Download the release artifact
      const curlResult = await commandExecutor(
        ['curl', '-L', '-f', '-o', zipPath, downloadUrl],
        'Download Template',
        true,
        undefined,
      );

      if (!curlResult.success) {
        throw new Error(`Failed to download template: ${curlResult.error}`);
      }

      // Extract the zip file
      // Temporarily change to temp directory for extraction
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        const unzipResult = await commandExecutor(
          ['unzip', '-q', zipPath],
          'Extract Template',
          true,
          undefined,
        );

        if (!unzipResult.success) {
          throw new Error(`Failed to extract template: ${unzipResult.error}`);
        }
      } finally {
        process.chdir(originalCwd);
      }

      // Find the extracted directory and return the template subdirectory
      const extractedDir = join(tempDir, `${repo}-${version.substring(1)}`);
      if (!fileSystemExecutor.existsSync(extractedDir)) {
        throw new Error(`Expected template directory not found: ${extractedDir}`);
      }

      log('info', `Successfully downloaded ${platform} template ${version}`);
      return extractedDir;
    } catch (error) {
      // Clean up on error
      log('error', `Failed to download ${platform} template ${version}: ${error}`);
      await this.cleanup(tempDir, fileSystemExecutor);
      throw error;
    }
  }

  /**
   * Clean up downloaded template directory
   */
  static async cleanup(
    templatePath: string,
    fileSystemExecutor: FileSystemExecutor,
  ): Promise<void> {
    // Only clean up if it's in temp directory
    if (templatePath.startsWith(tmpdir())) {
      await fileSystemExecutor.rm(templatePath, { recursive: true, force: true });
    }
  }
}
