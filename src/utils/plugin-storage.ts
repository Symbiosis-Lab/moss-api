/**
 * Plugin storage API for Moss plugins
 *
 * Provides access to a plugin's private storage directory at:
 * .moss/plugins/{plugin-name}/
 *
 * Plugin identity is auto-detected from the runtime context -
 * plugins never need to know their own name or path.
 *
 * Config is just a file: readPluginFile("config.json")
 */

import { getTauriCore } from "./tauri";
import { getInternalContext } from "./context";

// ============================================================================
// Functions
// ============================================================================

/**
 * Read a file from the plugin's private storage directory
 *
 * Storage path: .moss/plugins/{plugin-name}/{relativePath}
 *
 * @param relativePath - Path relative to the plugin's storage directory
 * @returns File contents as a string
 * @throws Error if file cannot be read or called outside a hook
 *
 * @example
 * ```typescript
 * // Read plugin config
 * const configJson = await readPluginFile("config.json");
 * const config = JSON.parse(configJson);
 *
 * // Read cached data
 * const cached = await readPluginFile("cache/articles.json");
 * ```
 */
export async function readPluginFile(relativePath: string): Promise<string> {
  const ctx = getInternalContext();

  return getTauriCore().invoke<string>("read_plugin_file", {
    pluginName: ctx.plugin_name,
    projectPath: ctx.project_path,
    relativePath,
  });
}

/**
 * Write a file to the plugin's private storage directory
 *
 * Creates parent directories if they don't exist.
 * Storage path: .moss/plugins/{plugin-name}/{relativePath}
 *
 * @param relativePath - Path relative to the plugin's storage directory
 * @param content - Content to write to the file
 * @throws Error if file cannot be written or called outside a hook
 *
 * @example
 * ```typescript
 * // Save plugin config
 * await writePluginFile("config.json", JSON.stringify(config, null, 2));
 *
 * // Cache data
 * await writePluginFile("cache/articles.json", JSON.stringify(articles));
 * ```
 */
export async function writePluginFile(
  relativePath: string,
  content: string
): Promise<void> {
  const ctx = getInternalContext();

  await getTauriCore().invoke("write_plugin_file", {
    pluginName: ctx.plugin_name,
    projectPath: ctx.project_path,
    relativePath,
    content,
  });
}

/**
 * List all files in the plugin's private storage directory
 *
 * Returns file paths relative to the plugin's storage directory.
 *
 * @returns Array of relative file paths
 * @throws Error if directory cannot be listed or called outside a hook
 *
 * @example
 * ```typescript
 * const files = await listPluginFiles();
 * // ["config.json", "cache/articles.json", "cache/images.json"]
 * ```
 */
export async function listPluginFiles(): Promise<string[]> {
  const ctx = getInternalContext();

  return getTauriCore().invoke<string[]>("list_plugin_files", {
    pluginName: ctx.plugin_name,
    projectPath: ctx.project_path,
  });
}

/**
 * Check if a file exists in the plugin's private storage directory
 *
 * @param relativePath - Path relative to the plugin's storage directory
 * @returns true if file exists, false otherwise
 * @throws Error if called outside a hook
 *
 * @example
 * ```typescript
 * if (await pluginFileExists("config.json")) {
 *   const config = JSON.parse(await readPluginFile("config.json"));
 * } else {
 *   // Use default config
 * }
 * ```
 */
export async function pluginFileExists(relativePath: string): Promise<boolean> {
  const ctx = getInternalContext();

  return getTauriCore().invoke<boolean>("plugin_file_exists", {
    pluginName: ctx.plugin_name,
    projectPath: ctx.project_path,
    relativePath,
  });
}
