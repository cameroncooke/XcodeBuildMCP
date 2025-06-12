import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { log } from './logger.js';
import { iOSTemplateVersion, macOSTemplateVersion } from '../version.js';

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
  static async getTemplatePath(platform: 'iOS' | 'macOS'): Promise<string> {
    // Check for local override
    const envVar =
      platform === 'iOS' ? 'XCODEBUILDMCP_IOS_TEMPLATE_PATH' : 'XCODEBUILDMCP_MACOS_TEMPLATE_PATH';

    const localPath = process.env[envVar];
    if (localPath && existsSync(localPath)) {
      const templateSubdir = join(localPath, 'template');
      if (existsSync(templateSubdir)) {
        log('info', `Using local ${platform} template from: ${templateSubdir}`);
        return templateSubdir;
      } else {
        log('info', `Template directory not found in ${localPath}, using GitHub release`);
      }
    }

    // Download from GitHub release
    return await this.downloadTemplate(platform);
  }

  /**
   * Download template from GitHub release
   */
  private static async downloadTemplate(platform: 'iOS' | 'macOS'): Promise<string> {
    const repo = platform === 'iOS' ? this.IOS_TEMPLATE_REPO : this.MACOS_TEMPLATE_REPO;
    const defaultVersion = platform === 'iOS' ? iOSTemplateVersion : macOSTemplateVersion;
    const envVarName =
      platform === 'iOS'
        ? 'XCODEBUILD_MCP_IOS_TEMPLATE_VERSION'
        : 'XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION';
    const version =
      process.env[envVarName] || process.env.XCODEBUILD_MCP_TEMPLATE_VERSION || defaultVersion;

    // Create temp directory for download
    const tempDir = join(tmpdir(), `xcodebuild-mcp-template-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      const downloadUrl = `https://github.com/${this.GITHUB_ORG}/${repo}/releases/download/${version}/${repo}-${version.substring(1)}.zip`;
      const zipPath = join(tempDir, 'template.zip');

      log('info', `Downloading ${platform} template ${version} from GitHub...`);
      log('info', `Download URL: ${downloadUrl}`);

      // Download the release artifact
      await new Promise<void>((resolve, reject) => {
        const curl = spawn('curl', ['-L', '-f', '-o', zipPath, downloadUrl], { cwd: tempDir });
        let stderr = '';

        curl.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        curl.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Failed to download template: ${stderr}`));
          } else {
            resolve();
          }
        });

        curl.on('error', reject);
      });

      // Extract the zip file
      await new Promise<void>((resolve, reject) => {
        const unzip = spawn('unzip', ['-q', zipPath], { cwd: tempDir });
        let stderr = '';

        unzip.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        unzip.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Failed to extract template: ${stderr}`));
          } else {
            resolve();
          }
        });

        unzip.on('error', reject);
      });

      // Find the extracted directory and return the template subdirectory
      const extractedDir = join(tempDir, `${repo}-${version.substring(1)}`);
      if (!existsSync(extractedDir)) {
        throw new Error(`Expected template directory not found: ${extractedDir}`);
      }

      log('info', `Successfully downloaded ${platform} template ${version}`);
      return extractedDir;
    } catch (error) {
      // Clean up on error
      log('error', `Failed to download ${platform} template ${version}: ${error}`);
      await this.cleanup(tempDir);
      throw error;
    }
  }

  /**
   * Clean up downloaded template directory
   */
  static async cleanup(templatePath: string): Promise<void> {
    // Only clean up if it's in temp directory
    if (templatePath.startsWith(tmpdir())) {
      await rm(templatePath, { recursive: true, force: true });
    }
  }
}
