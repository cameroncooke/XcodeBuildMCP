/**
 * File system executor interface for dependency injection
 */

export interface FileSystemExecutor {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  writeFile(path: string, content: string, encoding?: BufferEncoding): Promise<void>;
  cp(source: string, destination: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string, options?: { withFileTypes?: boolean }): Promise<unknown[]>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  existsSync(path: string): boolean;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
  mkdtemp(prefix: string): Promise<string>;
  tmpdir(): string;
}
