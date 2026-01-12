/**
 * Browser utilities for plugins
 * Abstracts Tauri browser commands to decouple plugins from internal APIs
 */

import { getTauriCore } from "./tauri";

/**
 * Open a URL in the plugin browser window
 */
export async function openBrowser(url: string): Promise<void> {
  await getTauriCore().invoke("open_plugin_browser", { url });
}

/**
 * Close the plugin browser window
 */
export async function closeBrowser(): Promise<void> {
  await getTauriCore().invoke("close_plugin_browser", {});
}

/**
 * Open a URL in the system's default browser
 *
 * Useful for OAuth flows where the user may already be logged in
 * to their browser, providing a better authentication experience.
 *
 * @param url - The URL to open
 * @example
 * ```typescript
 * // OAuth device flow - user may already be logged in
 * await openSystemBrowser("https://github.com/login/device");
 * ```
 */
export async function openSystemBrowser(url: string): Promise<void> {
  await getTauriCore().invoke("open_system_browser", { url });
}

/**
 * Open the plugin browser with dynamic HTML content
 *
 * Uses a custom protocol (moss-plugin://) to serve HTML content
 * without requiring the `webview-data-url` Cargo feature.
 *
 * @param html - Raw HTML content to display
 * @example
 * ```typescript
 * await openBrowserWithHtml(`
 *   <!DOCTYPE html>
 *   <html>
 *     <body>
 *       <h1>Hello from plugin!</h1>
 *     </body>
 *   </html>
 * `);
 * ```
 */
export async function openBrowserWithHtml(html: string): Promise<void> {
  await getTauriCore().invoke("set_plugin_browser_html", { html });
}
