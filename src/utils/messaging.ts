/**
 * Plugin messaging utilities for communicating with Moss
 */

import type { PluginMessage } from "../types/messages";
import { getTauriCore, isTauriAvailable } from "./tauri";

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
 * Send a message to Moss
 * Silently fails if Tauri is unavailable (useful for testing)
 */
export async function sendMessage(message: PluginMessage): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }

  try {
    await getTauriCore().invoke("plugin_message", {
      pluginName: currentPluginName,
      hookName: currentHookName,
      message,
    });
  } catch {
    // Silently fail - logging would be recursive
  }
}

/**
 * Report progress to Moss
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
 * Report an error to Moss
 */
export async function reportError(
  error: string,
  context?: string,
  fatal = false
): Promise<void> {
  await sendMessage({ type: "error", error, context, fatal });
}

/**
 * Report completion to Moss
 */
export async function reportComplete(result: unknown): Promise<void> {
  await sendMessage({ type: "complete", result });
}
