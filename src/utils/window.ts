/**
 * Window utilities for plugins
 * Enables plugins to show custom dialogs and UI elements
 */

import { getTauriCore } from "./tauri";

/**
 * Result from a dialog interaction
 */
export interface DialogResult {
  type: "submitted" | "cancelled";
  value?: unknown;
}

/**
 * Options for showing a plugin dialog
 */
export interface ShowDialogOptions {
  /** URL to load in the dialog (can be data: URL with embedded HTML) */
  url: string;
  /** Dialog window title */
  title: string;
  /** Dialog width in pixels */
  width?: number;
  /** Dialog height in pixels */
  height?: number;
  /** Maximum time to wait for user response in milliseconds */
  timeoutMs?: number;
}

/**
 * Show a plugin dialog and wait for user response
 *
 * The dialog can be an embedded HTML page (via data: URL) that communicates
 * back to the plugin via the submitDialogResult function.
 *
 * @param options - Dialog configuration
 * @returns Dialog result with submitted value or cancellation
 *
 * @example
 * ```typescript
 * const result = await showPluginDialog({
 *   url: createMyDialogUrl(),
 *   title: "Create Repository",
 *   width: 400,
 *   height: 300,
 * });
 *
 * if (result.type === "submitted") {
 *   console.log("User submitted:", result.value);
 * } else {
 *   console.log("User cancelled");
 * }
 * ```
 */
export async function showPluginDialog(
  options: ShowDialogOptions
): Promise<DialogResult> {
  const result = await getTauriCore().invoke<DialogResult>(
    "show_plugin_dialog",
    {
      url: options.url,
      title: options.title,
      width: options.width ?? 500,
      height: options.height ?? 400,
      timeoutMs: options.timeoutMs ?? 300000, // 5 minutes default
    }
  );
  return result;
}

/**
 * Submit a result from within a plugin dialog
 *
 * This is called from inside the dialog HTML to send data back to the plugin.
 * The dialog will be closed automatically after submission.
 *
 * @param dialogId - The dialog ID (provided in the dialog's query string)
 * @param value - The value to submit
 * @returns Whether the submission was successful
 *
 * @example
 * ```typescript
 * // Inside dialog HTML:
 * const dialogId = new URLSearchParams(location.search).get('dialogId');
 * await submitDialogResult(dialogId, { repoName: 'my-repo' });
 * ```
 */
export async function submitDialogResult(
  dialogId: string,
  value: unknown
): Promise<boolean> {
  return getTauriCore().invoke<boolean>("submit_dialog_result", {
    dialogId,
    result: { type: "submitted", value },
  });
}

/**
 * Cancel a plugin dialog
 *
 * This is called from inside the dialog HTML to cancel without submitting.
 * The dialog will be closed automatically.
 *
 * @param dialogId - The dialog ID (provided in the dialog's query string)
 *
 * @example
 * ```typescript
 * // Inside dialog HTML:
 * const dialogId = new URLSearchParams(location.search).get('dialogId');
 * await cancelDialog(dialogId);
 * ```
 */
export async function cancelDialog(dialogId: string): Promise<boolean> {
  return getTauriCore().invoke<boolean>("submit_dialog_result", {
    dialogId,
    result: { type: "cancelled" },
  });
}
