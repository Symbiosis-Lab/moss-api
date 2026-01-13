/**
 * Hook result types
 */

import type { DeploymentInfo } from "./context";

/**
 * Toast outcome determines the visual style of the notification
 * - "success": Green/positive - operation completed successfully
 * - "info": Neutral/informational - nothing to do, or skipped
 * - "error": Red/negative - operation failed
 */
export type ToastOutcome = "success" | "info" | "error";

/**
 * Toast notification to display to the user
 *
 * Plugins have full control over the toast message and style.
 * This separates the "what happened" (success boolean) from
 * "how to tell the user" (toast).
 */
export interface Toast {
  /** Visual style of the toast */
  outcome: ToastOutcome;
  /** Short display text (e.g., "🟢 Live!", "No changes to deploy") */
  title: string;
  /** Optional clickable URL (e.g., the deployed site URL) */
  url?: string;
}

/**
 * Standard result returned from hook execution
 *
 * Design principle: Plugins control their own messaging.
 * - `success`: Whether the operation succeeded (for flow control)
 * - `message`: Detailed message for logs/debugging
 * - `toast`: Optional notification for the user (plugin controls the UX)
 * - `deployment`: Deployment info (for deploy hooks)
 */
export interface HookResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Detailed message for logs/debugging */
  message?: string;
  /** Optional toast notification for the user */
  toast?: Toast;
  /** Deployment info (populated by deploy hooks) */
  deployment?: DeploymentInfo;
}
