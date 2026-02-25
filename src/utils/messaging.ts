/**
 * Plugin messaging utilities for communicating with moss
 *
 * Uses events (fire-and-forget) for log/progress messages to avoid
 * blocking the IPC channel. Uses commands (request-response) for
 * complete/error messages that require acknowledgment.
 */

import type { PluginMessage } from "../types/messages";
import { getTauriCore, isTauriAvailable } from "./tauri";
import { emitEvent, isEventApiAvailable } from "./events";

let currentPluginName = "";
let currentHookName = "";

/**
 * Set the message context for subsequent messages
 * This is typically called automatically by the plugin runtime
 */
export function setMessageContext(pluginName: string, hookName: string): void {
  currentPluginName = pluginName;
  currentHookName = hookName;
}

/**
 * Get the current message context
 */
export function getMessageContext(): { pluginName: string; hookName: string } {
  return { pluginName: currentPluginName, hookName: currentHookName };
}

/**
 * Send a message to moss
 *
 * Log and progress messages use events (fire-and-forget) to avoid blocking IPC.
 * Complete and error messages use commands (request-response) for acknowledgment.
 */
export async function sendMessage(message: PluginMessage): Promise<void> {
  // For log and progress messages, use events (fire-and-forget)
  if (message.type === "log" || message.type === "progress") {
    if (!isEventApiAvailable()) {
      return;
    }
    try {
      await emitEvent("plugin-message", {
        pluginName: currentPluginName,
        hookName: currentHookName,
        message,
      });
    } catch {
      // Silently ignore event failures for non-critical messages
    }
    return;
  }

  // For complete/error messages, use commands (must be acknowledged)
  if (!isTauriAvailable()) {
    return;
  }

  try {
    await getTauriCore().invoke("plugin_message", {
      pluginName: currentPluginName,
      hookName: currentHookName,
      message,
    });
  } catch (error) {
    // Log errors - these are important for debugging serialization issues
    console.error("❌ [SDK] Failed to send message:", message.type, "–", error);
  }
}

/**
 * Report progress to moss
 */
export async function reportProgress(
  phase: string,
  current: number,
  total: number,
  message?: string
): Promise<void> {
  await sendMessage({ type: "progress", phase, current, total, message });
}

/**
 * Report an error to moss
 */
export async function reportError(
  error: string,
  context?: string,
  fatal = false
): Promise<void> {
  await sendMessage({ type: "error", error, context, fatal });
}

/**
 * Report completion to moss
 * @param success - Whether the operation succeeded
 * @param result - Optional result data
 * @param error - Optional error message (only used when success is false)
 */
export async function reportComplete(
  success: boolean,
  result?: unknown,
  error?: string
): Promise<void> {
  await sendMessage({ type: "complete", success, error, result });
}
