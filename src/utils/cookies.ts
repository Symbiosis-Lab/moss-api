/**
 * Cookie management for Moss plugins
 *
 * Allows plugins to store and retrieve authentication cookies
 * for external services (e.g., Matters.town, GitHub).
 *
 * Cookies are automatically scoped to the plugin's registered domain
 * (defined in manifest.json) - plugins cannot access other plugins' cookies.
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

/**
 * Plugin execution context - set by plugin runtime during hook execution.
 * Used for auto-detecting the calling plugin's identity.
 */
interface PluginContext {
  plugin_name: string;
  project_path: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Get stored cookies for the current plugin.
 *
 * The plugin's identity is automatically detected from the runtime context.
 * Cookies are filtered by the domain declared in the plugin's manifest.json.
 *
 * **Must be called from within a plugin hook** (process, generate, deploy, syndicate).
 *
 * @returns Array of cookies for the plugin's registered domain
 * @throws Error if called outside of a plugin hook execution
 *
 * @example
 * ```typescript
 * // Inside a hook function:
 * const cookies = await getPluginCookie();
 * const token = cookies.find(c => c.name === "__access_token");
 * if (token) {
 *   // Use token for authenticated requests
 * }
 * ```
 */
export async function getPluginCookie(): Promise<Cookie[]> {
  const context = (window as unknown as { __MOSS_CURRENT_CONTEXT__?: PluginContext }).__MOSS_CURRENT_CONTEXT__;

  if (!context) {
    throw new Error(
      "getPluginCookie() must be called from within a plugin hook. " +
        "Ensure you're calling this from process(), generate(), deploy(), or syndicate()."
    );
  }

  return getTauriCore().invoke<Cookie[]>("get_plugin_cookie", {
    pluginName: context.plugin_name,
    projectPath: context.project_path,
  });
}

/**
 * Store cookies for the current plugin.
 *
 * The plugin's identity is automatically detected from the runtime context.
 *
 * **Must be called from within a plugin hook** (process, generate, deploy, syndicate).
 *
 * @param cookies - Array of cookies to store
 * @throws Error if called outside of a plugin hook execution
 *
 * @example
 * ```typescript
 * // Inside a hook function:
 * await setPluginCookie([
 *   { name: "session", value: "abc123" }
 * ]);
 * ```
 */
export async function setPluginCookie(cookies: Cookie[]): Promise<void> {
  const context = (window as unknown as { __MOSS_CURRENT_CONTEXT__?: PluginContext }).__MOSS_CURRENT_CONTEXT__;

  if (!context) {
    throw new Error(
      "setPluginCookie() must be called from within a plugin hook. " +
        "Ensure you're calling this from process(), generate(), deploy(), or syndicate()."
    );
  }

  await getTauriCore().invoke("set_plugin_cookie", {
    pluginName: context.plugin_name,
    projectPath: context.project_path,
    cookies,
  });
}
