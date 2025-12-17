/**
 * Cookie management for Moss plugins
 *
 * Allows plugins to store and retrieve authentication cookies
 * for external services (e.g., Matters.town, GitHub).
 */

import { getTauriCore } from "./tauri";

// ============================================================================
// Types
// ============================================================================

/**
 * A cookie stored for plugin authentication
 */
export interface Cookie {
  /** Cookie name */
  name: string;
  /** Cookie value */
  value: string;
  /** Optional domain for the cookie */
  domain?: string;
  /** Optional path for the cookie */
  path?: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Get stored cookies for a plugin
 *
 * @param pluginName - Name of the plugin
 * @param projectPath - Absolute path to the project directory
 * @returns Array of stored cookies
 *
 * @example
 * ```typescript
 * const cookies = await getPluginCookie("matters-syndicator", "/path/to/project");
 * const token = cookies.find(c => c.name === "__access_token");
 * if (token) {
 *   // Use token for authenticated requests
 * }
 * ```
 */
export async function getPluginCookie(
  pluginName: string,
  projectPath: string
): Promise<Cookie[]> {
  return getTauriCore().invoke<Cookie[]>("get_plugin_cookie", {
    pluginName,
    projectPath,
  });
}

/**
 * Store cookies for a plugin
 *
 * @param pluginName - Name of the plugin
 * @param projectPath - Absolute path to the project directory
 * @param cookies - Array of cookies to store
 *
 * @example
 * ```typescript
 * await setPluginCookie("my-plugin", "/path/to/project", [
 *   { name: "session", value: "abc123" }
 * ]);
 * ```
 */
export async function setPluginCookie(
  pluginName: string,
  projectPath: string,
  cookies: Cookie[]
): Promise<void> {
  await getTauriCore().invoke("set_plugin_cookie", {
    pluginName,
    projectPath,
    cookies,
  });
}
