/**
 * Hook result types
 */

import type { DeploymentInfo } from "./context";

/**
 * Toast outcome determines the visual style of the notification
 * - "success": Green/positive - operation completed successfully
 * - "info": Neutral/informational - nothing to do, or skipped
 * - "error": Red/negative - operation failed
 *
 * @deprecated Use showToast() from utils/toast instead
 */
export type ToastOutcome = "success" | "info" | "error";

/**
 * Toast notification to display to the user
 *
 * @deprecated Use showToast() from utils/toast instead.
 * The new API gives plugins full control over timing, actions, etc.
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * return { success: true, toast: { outcome: "success", title: "Done!" } };
 *
 * // New way (recommended)
 * await showToast({ message: "Done!", variant: "success", duration: 5000 });
 * return { success: true };
 * ```
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
 * - `toast`: DEPRECATED - use showToast() instead for full control
 * - `deployment`: Deployment info (for deploy hooks)
 */
export interface HookResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Detailed message for logs/debugging */
  message?: string;
  /**
   * @deprecated Use showToast() from utils/toast instead.
   * This field will be removed in a future version.
   */
  toast?: Toast;
  /** Deployment info (populated by deploy hooks) */
  deployment?: DeploymentInfo;
}
