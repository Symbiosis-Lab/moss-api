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
