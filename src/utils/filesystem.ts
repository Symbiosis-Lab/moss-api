/**
 * File system operations for moss plugins
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
 * @category Filesystem
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
 * @category Filesystem
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
 * @category Filesystem
 */
export async function listFiles(): Promise<string[]> {
  const ctx = getInternalContext();

  return getTauriCore().invoke<string[]>("list_project_files", {
    projectPath: ctx.project_path,
  });
}

/**
 * A project file with home-file annotation from Rust's detect_home_file_in_folder
 * @category Filesystem
 */
export interface ProjectFileEntry {
  path: string;
  is_home: boolean;
}

/**
 * List all project files with home-file annotations
 *
 * Each file is annotated with `is_home: true` if it's the detected home file
 * for its containing folder (index.md, README.md, self-named folder note, etc.).
 * Detection uses the same logic as the built-in generator.
 *
 * @returns Array of file entries with is_home annotations
 * @category Filesystem
 */
export async function listProjectTree(): Promise<ProjectFileEntry[]> {
  return getTauriCore().invoke<ProjectFileEntry[]>("list_project_tree", {});
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
 * @category Filesystem
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

/**
 * Create a symbolic link in the project directory
 *
 * Creates a symlink that points from linkPath to targetPath.
 * Both paths are relative to the project root.
 * Creates parent directories if they don't exist.
 *
 * @param targetPath - Path to the original file (relative to project root)
 * @param linkPath - Path where the symlink will be created (relative to project root)
 * @throws Error if symlink cannot be created or called outside a hook
 *
 * @example
 * ```typescript
 * // Create a symlink from runtime/content/post.md -> 文章/post.md
 * await createSymlink("文章/post.md", ".moss/.runtime/hugo/content/posts/post.md");
 * ```
 * @category Filesystem
 */
export async function createSymlink(
  targetPath: string,
  linkPath: string
): Promise<void> {
  const ctx = getInternalContext();

  await getTauriCore().invoke("create_project_symlink", {
    projectPath: ctx.project_path,
    targetPath,
    linkPath,
  });
}

// ============================================================================
// Deploy-oriented file access (base64, no path exposure)
// ============================================================================

/**
 * Read a file from the compiled site directory (.moss/site/)
 *
 * Returns base64-encoded content. Used by deploy plugins to read
 * site files without direct filesystem access.
 *
 * @param relativePath - Path relative to the site directory (e.g., "index.html")
 * @returns Base64-encoded file content
 * @throws Error if file cannot be read
 *
 * @example
 * ```typescript
 * const base64Content = await readSiteFile("index.html");
 * const base64Image = await readSiteFile("assets/logo.png");
 * ```
 * @category Filesystem
 */
export async function readSiteFile(relativePath: string): Promise<string> {
  return getTauriCore().invoke<string>("read_site_file", { relativePath });
}

/**
 * Read a file from the project root as base64
 *
 * Returns base64-encoded content. Used by deploy plugins for
 * source file backup operations.
 *
 * @param relativePath - Path relative to the project root
 * @returns Base64-encoded file content
 * @throws Error if file cannot be read
 *
 * @example
 * ```typescript
 * const base64Content = await readProjectFileBase64("posts/article.md");
 * ```
 * @category Filesystem
 */
export async function readProjectFileBase64(
  relativePath: string
): Promise<string> {
  return getTauriCore().invoke<string>("read_project_file_base64", {
    relativePath,
  });
}

/**
 * List source files in the project directory
 *
 * Returns relative paths of non-hidden files, excluding build artifacts
 * (.moss/, .git/, node_modules/). Used by deploy plugins for source backup.
 *
 * @returns Array of relative file paths
 * @throws Error if listing fails
 *
 * @example
 * ```typescript
 * const sourceFiles = await listSourceFiles();
 * // ["index.md", "posts/hello.md", "assets/logo.png"]
 * ```
 * @category Filesystem
 */
export async function listSourceFiles(): Promise<string[]> {
  return getTauriCore().invoke<string[]>("list_source_files", {});
}

// ============================================================================
// Social data discovery
// ============================================================================

/**
 * List social data source names from .moss/data/social/*.json
 *
 * Returns file stems (without .json extension) for all JSON files
 * in the project's .moss/data/social/ directory. Returns empty array
 * if directory doesn't exist.
 *
 * @returns Array of source names (e.g., ["comment", "douban", "matters"])
 * @category Filesystem
 */
export async function listSocialFiles(): Promise<string[]> {
  return getTauriCore().invoke<string[]>("list_social_files", {});
}

// ============================================================================
// Site operations (heavy I/O in Rust, no JS memory pressure)
// ============================================================================

/**
 * File path and size from the compiled site directory
 * @category Filesystem
 */
export interface SiteFileInfo {
  path: string;
  size: number;
}

/**
 * List all files in the compiled site directory with their sizes
 *
 * @returns Array of file info objects with path and size in bytes
 * @category Filesystem
 */
export async function listSiteFilesWithSizes(): Promise<SiteFileInfo[]> {
  return getTauriCore().invoke<SiteFileInfo[]>("list_site_files_with_sizes", {});
}

