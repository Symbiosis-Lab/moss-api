/**
 * File system operations for Moss plugins
 *
 * These functions provide access to project files (user content).
 * Project path is auto-detected from the runtime context.
 *
 * For plugin's private storage, use the plugin-storage API instead.
 */

import { getTauriCore } from "./tauri";
import { getInternalContext } from "./context";

// ============================================================================
// Functions
// ============================================================================

/**
 * Read a file from the project directory
 *
 * Project path is auto-detected from the runtime context.
 *
 * @param relativePath - Path relative to the project root
 * @returns File contents as a string
 * @throws Error if file cannot be read or called outside a hook
 *
 * @example
 * ```typescript
 * // Read an article
 * const content = await readFile("article/hello-world.md");
 *
 * // Read package.json
 * const pkg = JSON.parse(await readFile("package.json"));
 * ```
 */
export async function readFile(relativePath: string): Promise<string> {
  const ctx = getInternalContext();

  return getTauriCore().invoke<string>("read_project_file", {
    projectPath: ctx.project_path,
    relativePath,
  });
}

/**
 * Write content to a file in the project directory
 *
 * Creates parent directories if they don't exist.
 * Project path is auto-detected from the runtime context.
 *
 * @param relativePath - Path relative to the project root
 * @param content - Content to write to the file
 * @throws Error if file cannot be written or called outside a hook
 *
 * @example
 * ```typescript
 * // Write a generated article
 * await writeFile("article/new-post.md", "# Hello World\n\nContent here.");
 *
 * // Write index page
 * await writeFile("index.md", markdownContent);
 * ```
 */
export async function writeFile(
  relativePath: string,
  content: string
): Promise<void> {
  const ctx = getInternalContext();

  await getTauriCore().invoke("write_project_file", {
    projectPath: ctx.project_path,
    relativePath,
    data: content,
  });
}

/**
 * List all files in the project directory
 *
 * Returns file paths relative to the project root.
 * Project path is auto-detected from the runtime context.
 *
 * @returns Array of relative file paths
 * @throws Error if directory cannot be listed or called outside a hook
 *
 * @example
 * ```typescript
 * const files = await listFiles();
 * // ["index.md", "article/hello.md", "assets/logo.png"]
 *
 * const mdFiles = files.filter(f => f.endsWith(".md"));
 * ```
 */
export async function listFiles(): Promise<string[]> {
  const ctx = getInternalContext();

  return getTauriCore().invoke<string[]>("list_project_files", {
    projectPath: ctx.project_path,
  });
}

/**
 * Check if a file exists in the project directory
 *
 * Project path is auto-detected from the runtime context.
 *
 * @param relativePath - Path relative to the project root
 * @returns true if file exists, false otherwise
 * @throws Error if called outside a hook
 *
 * @example
 * ```typescript
 * if (await fileExists("index.md")) {
 *   const content = await readFile("index.md");
 * }
 * ```
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  // First, verify we have context (this will throw if not in a hook)
  getInternalContext();

  try {
    await readFile(relativePath);
    return true;
  } catch {
    return false;
  }
}
