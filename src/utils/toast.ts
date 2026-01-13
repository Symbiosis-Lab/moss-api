/**
 * Toast notification utilities for plugins
 *
 * Allows plugins to display toast notifications in the main Moss UI
 * through Tauri's event system.
 */

import { emitEvent } from "./events";

/**
 * Toast notification type
 */
export type ToastType = "info" | "success" | "error" | "warning";

/**
 * Event name used for toast notifications
 */
export const TOAST_EVENT = "plugin-toast";

/**
 * Show a toast notification in the main Moss UI
 *
 * @param message - The message to display
 * @param type - The type of toast (info, success, error, warning)
 * @param duration - How long to show the toast in milliseconds (default: 5000)
 *
 * @example
 * ```typescript
 * // Simple info toast
 * await showToast("Processing...", "info");
 *
 * // Success toast with custom duration
 * await showToast("Upload complete!", "success", 3000);
 *
 * // Error toast
 * await showToast("Failed to connect", "error");
 * ```
 */
export async function showToast(
  message: string,
  type: ToastType = "info",
  duration?: number
): Promise<void> {
  await emitEvent(TOAST_EVENT, { message, type, duration });
}
