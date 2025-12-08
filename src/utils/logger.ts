/**
 * Logging utilities for plugins
 */

import { sendMessage } from "./messaging";

/**
 * Log an informational message
 */
export async function log(message: string): Promise<void> {
  await sendMessage({ type: "log", level: "log", message });
}

/**
 * Log a warning message
 */
export async function warn(message: string): Promise<void> {
  await sendMessage({ type: "log", level: "warn", message });
}

/**
 * Log an error message
 */
export async function error(message: string): Promise<void> {
  await sendMessage({ type: "log", level: "error", message });
}
