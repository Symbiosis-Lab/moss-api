/**
 * File system operations for Moss plugins
 *
 * These functions abstract away the underlying Tauri commands,
 * providing a clean API for plugins to read/write project files.
 */

import { getTauriCore } from "./tauri";

/**
 * Read a file from the project directory
 *
 * @param projectPath - Absolute path to the project directory
 * @param relativePath - Path relative to the project root
 * @returns File contents as a string
 * @throws Error if file cannot be read
 *
 * @example
 * ```typescript
 * const content = await readFile("/path/to/project", "src/index.ts");
 * ```
 */
export async function readFile(
  projectPath: string,
  relativePath: string
): Promise<string> {
  return getTauriCore().invoke<string>("read_project_file", {
    projectPath,
    relativePath,
  });
}

/**
 * Write content to a file in the project directory
 *
 * Creates parent directories if they don't exist.
 *
 * @param projectPath - Absolute path to the project directory
 * @param relativePath - Path relative to the project root
 * @param content - Content to write to the file
 * @throws Error if file cannot be written
 *
 * @example
 * ```typescript
 * await writeFile("/path/to/project", "output/result.md", "# Hello World");
 * ```
 */
export async function writeFile(
  projectPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  await getTauriCore().invoke("write_project_file", {
    projectPath,
    relativePath,
    data: content,
  });
}

/**
 * List all files in a project directory
 *
 * Returns file paths relative to the project root.
 *
 * @param projectPath - Absolute path to the project directory
 * @returns Array of relative file paths
 * @throws Error if directory cannot be listed
 *
 * @example
 * ```typescript
 * const files = await listFiles("/path/to/project");
 * // ["src/index.ts", "package.json", "README.md"]
 * ```
 */
export async function listFiles(projectPath: string): Promise<string[]> {
  return getTauriCore().invoke<string[]>("list_project_files", {
    projectPath,
  });
}

/**
 * Check if a file exists in the project directory
 *
 * @param projectPath - Absolute path to the project directory
 * @param relativePath - Path relative to the project root
 * @returns true if file exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await fileExists("/path/to/project", "config.json")) {
 *   // load config
 * }
 * ```
 */
export async function fileExists(
  projectPath: string,
  relativePath: string
): Promise<boolean> {
  try {
    await readFile(projectPath, relativePath);
    return true;
  } catch {
    return false;
  }
}
