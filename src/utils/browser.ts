/**
 * Browser utilities for plugins
 * Abstracts Tauri browser commands to decouple plugins from internal APIs
 */

import { getTauriCore } from "./tauri";

// ============================================================================
// Types
// ============================================================================

/**
 * Reason why the browser window was closed
 */
export type BrowserCloseReason =
  | { type: "user" } // User clicked X or closed window
  | { type: "timeout" } // Timed out waiting
  | { type: "programmatic" }; // Plugin called closeBrowser()

/**
 * Handle returned by openBrowser for tracking window lifecycle
 */
export interface BrowserHandle {
  /**
   * Promise that resolves when the browser window is closed.
   * Use this to detect when the user closes the window.
   */
  closed: Promise<BrowserCloseReason>;
}

/**
 * Event payload for browser-closed event
 */
interface BrowserClosedEvent {
  reason: BrowserCloseReason;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Get Tauri event API for listening to events
 * @internal
 */
function getTauriEventListen(): (
  event: string,
  handler: (event: { payload: unknown }) => void
) => Promise<() => void> {
  const w = window as unknown as {
    __TAURI__?: {
      event?: {
        listen: (
          event: string,
          handler: (event: { payload: unknown }) => void
        ) => Promise<() => void>;
      };
    };
  };
  if (!w.__TAURI__?.event?.listen) {
    throw new Error("Tauri event API not available");
  }
  return w.__TAURI__.event.listen;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Open a URL in the plugin browser window
 *
 * Returns a BrowserHandle that can be used to detect when the window is closed.
 *
 * @param url - The URL to open
 * @returns BrowserHandle with a `closed` promise
 *
 * @example
 * ```typescript
 * const browser = await openBrowser("https://example.com/login");
 *
 * // Wait for user to close window or authentication to complete
 * const closeReason = await Promise.race([
 *   browser.closed,
 *   waitForAuth().then(() => ({ type: "programmatic" as const }))
 * ]);
 *
 * if (closeReason.type === "user") {
 *   console.log("User closed the window without completing");
 * }
 * ```
 */
export async function openBrowser(url: string): Promise<BrowserHandle> {
  await getTauriCore().invoke("open_plugin_browser", { url });

  // Create a promise that resolves when the browser-closed event is received
  const closed = new Promise<BrowserCloseReason>((resolve) => {
    const listen = getTauriEventListen();

    listen("browser-closed", (event) => {
      const payload = event.payload as BrowserClosedEvent;
      resolve(payload.reason);
    }).then((unlisten) => {
      // Store unlisten so it gets called after promise resolves
      closed.then(() => unlisten());
    });
  });

  return { closed };
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
