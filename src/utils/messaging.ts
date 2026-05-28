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

// ============================================================================
// PanelTask lifecycle API (ADR-015 Phase 2 — T8a, 2026-05-28)
// ============================================================================
//
// `startTask()` is the preferred path for plugin progress / completion
// reporting going forward. It returns a `TaskHandle` whose methods map
// 1:1 to the `PluginTaskLifecycle` enum on the Rust side
// (`src-tauri/src/plugins/runtime.rs`). Each call invokes the
// `report_plugin_task_lifecycle_command` Tauri command which routes
// through the PanelTask registry and emits typed `PanelTaskUpdate`
// events to the four UI renderers (Ambient, Inline, Narrated, Awaiting).
//
// `reportProgress` / `reportError` / `reportComplete` (above) keep working
// untouched — they are LEGACY but supported. ADR-015 § Migration plan
// schedules the 151-call-site sweep for Phase 3; until then, both APIs
// coexist. Plugin authors writing NEW code should prefer `startTask()`.

/**
 * `PluginHook` mirrors the closed Rust enum in
 * `src-tauri/src/plugins/types.rs`. The router (T1) cross-products
 * `PluginHook × TriggerContext` to pick a UI surface for the task.
 * Plugin authors pick the hook that matches what they're doing; they
 * do NOT pick the surface (the router owns that).
 */
export type PluginHook =
  | "import"
  | "publish"
  | "deploy"
  | "syndicate"
  | "process"
  | "enhance";

/**
 * `TriggerContext` mirrors the closed Rust enum. Tells the router *why*
 * the task was invoked so it can pick a surface that matches the user's
 * focus context (onboarding cards → ActionPanel; background sync →
 * Workspace).
 */
export type TriggerContext =
  | "onboarding_flow"
  | "settings_manual"
  | "background"
  | "manual_one";

/**
 * Escape kind for `awaiting()` calls. The string variants take a
 * free-text affordance label after the colon, mirroring the dev harness
 * dialect (e.g., `"resend:Resend email"`, `"recheck:Recheck DNS"`).
 * Plain `"cancel"` carries no label.
 */
export type EscapeSpec = "cancel" | `resend:${string}` | `recheck:${string}`;

export interface StartTaskOptions {
  /**
   * Hook the task belongs to. Defaults to "import" — the most common
   * onboarding case. Plugins should pass an explicit hook for non-import
   * work (e.g., a syndicator passes "syndicate").
   */
  hook?: PluginHook;
  /**
   * Trigger context. Defaults to "background" — the safest fallback
   * because Background routes to Workspace+Ambient, the quietest surface.
   * Plugins running inside the onboarding flow should pass
   * "onboarding_flow" explicitly so they reach the ActionPanel hairline.
   */
  trigger?: TriggerContext;
  /**
   * Hint to the router that this task will emit `progress()` updates
   * with fractions. Routers and renderers MAY use this to choose between
   * "fills" vs "pulses" visualizations. Defaults to true.
   */
  hasProgress?: boolean;
  /**
   * Whether the user can cancel this task from the UI. Cancellation
   * plumbing lands in a later ADR phase; the flag is recorded today so
   * renderers can show / hide a cancel affordance.
   */
  cancellable?: boolean;
}

/**
 * Lifecycle handle returned by `startTask()`. Calls are fire-and-await:
 * each method returns a promise that resolves once the Rust side has
 * applied the transition to the PanelTask registry. Terminal calls
 * (`succeeded`, `failed`, `cancelled`) remove the task from the registry's
 * tracking store; calling any further method on the same handle will
 * reject with "unknown plugin task id".
 *
 * The state machine matches ADR-015 § Layer 2:
 *
 *   Running ↔ Awaiting → Succeeded | Failed | Cancelled
 *
 * `progress()` after `awaiting()` implicitly transitions back to Running
 * (no explicit `resumed()`).
 */
export interface TaskHandle {
  /**
   * In-process task id minted by the Rust registry on `Started`.
   * Exposed for log correlation and tests.
   *
   * Rust-side this is `u64`; specta types `u64` as `string` because
   * JS numbers lose precision above 2^53. The handle carries the
   * exact string through subsequent transitions so no precision is
   * lost in the round-trip.
   */
  readonly id: string;
  /** Push a progress update. `fraction` in [0,1] if known, else undefined for indeterminate. */
  progress(fraction?: number, message?: string): Promise<void>;
  /**
   * Pause for an out-of-band user action. `directive` describes what
   * the user needs to do ("click the link in your email"); `venue`
   * names where ("your email") — both feed the Awaiting renderer's
   * "Waiting for you to [directive] in [venue]" copy.
   *
   * `escape` defaults to "cancel". For non-cancel escapes, pass
   * "resend:<label>" or "recheck:<label>".
   */
  awaiting(directive: string, venue: string, escape?: EscapeSpec): Promise<void>;
  /** Terminal: success. Optional human-readable receipt. */
  succeeded(receipt?: string): Promise<void>;
  /**
   * Terminal: failure. `recoverable=false` (default) also fires the
   * toast subscriber (ADR-015 § "Plugin-originated failure toasts").
   */
  failed(error: string, recoverable?: boolean): Promise<void>;
  /** Terminal: explicit user cancellation. */
  cancelled(): Promise<void>;
}

/**
 * Internal helper for invoking the Rust command. Resolves to the task
 * id Rust echoes back; throws if the invoke fails (caller decides how
 * to surface it — typically Awaiting / progress events fail-silent so a
 * dropped narrator update doesn't crash a plugin).
 *
 * Task id is `string` end-to-end (u64 in Rust → string in specta) to
 * preserve precision above 2^53.
 */
async function invokeLifecycle(
  pluginName: string,
  hook: PluginHook,
  trigger: TriggerContext,
  taskId: string | undefined,
  lifecycle: Record<string, unknown>
): Promise<string> {
  if (!isTauriAvailable()) {
    // Out-of-Tauri (unit tests, browser preview of plugin) — skip.
    // Return "-1" so callers don't accidentally treat 0 as a valid id.
    return "-1";
  }
  const raw = await getTauriCore().invoke<string | number>(
    "report_plugin_task_lifecycle_command",
    {
      pluginName,
      hook,
      trigger,
      taskId,
      lifecycle,
    }
  );
  // Tauri's specta-generated path serializes u64 as a JSON string;
  // some test mocks return a JS number. Coerce both to string.
  return typeof raw === "number" ? String(raw) : raw;
}

/**
 * Start a plugin task. Returns a `TaskHandle` whose methods drive the
 * lifecycle (progress → awaiting → succeeded/failed/cancelled).
 *
 * The hook + trigger pair flows into the Rust-side `route_plugin_task`
 * router, which picks `(TaskScope, TaskKind, TaskTone)` — i.e., which
 * UI renderer (Ambient hairline / Inline badge / Narrated titlebar /
 * Awaiting pulse) surfaces the task. Plugin authors do NOT pick the
 * surface; they just describe what they're doing and why.
 *
 * Preferred over `reportProgress()` for new code. The legacy API stays
 * supported until ADR-015 Phase 3 sweeps all 151 call sites.
 *
 * @example
 * const task = await startTask("Importing 42 articles", {
 *   hook: "import",
 *   trigger: "onboarding_flow",
 * });
 * for (let i = 0; i < articles.length; i++) {
 *   await task.progress(i / articles.length, `Article ${i + 1}/${articles.length}`);
 *   await importOne(articles[i]);
 * }
 * await task.succeeded(`Imported ${articles.length} articles`);
 */
export async function startTask(
  label: string,
  options: StartTaskOptions = {}
): Promise<TaskHandle> {
  const hook: PluginHook = options.hook ?? "import";
  const trigger: TriggerContext = options.trigger ?? "background";
  const hasProgress = options.hasProgress ?? true;
  const cancellable = options.cancellable ?? false;
  // Capture plugin name at start so subsequent transitions (which may
  // arrive after setMessageContext has rolled to the next hook) still
  // route to the right task.
  const pluginName = currentPluginName;

  const id = await invokeLifecycle(pluginName, hook, trigger, undefined, {
    type: "started",
    label,
    has_progress: hasProgress,
    cancellable,
  });

  return {
    id,
    async progress(fraction?: number, message?: string): Promise<void> {
      await invokeLifecycle(pluginName, hook, trigger, id, {
        type: "progress",
        fraction,
        message,
      });
    },
    async awaiting(
      directive: string,
      venue: string,
      escape: EscapeSpec = "cancel"
    ): Promise<void> {
      // Directive copy includes the venue for the Awaiting renderer.
      // The renderer formats "Waiting for you to <directive> in <venue>";
      // we splice `venue` into `directive` here so the Rust side only
      // needs to store one string. The verb-place split is a TS-side
      // ergonomic affordance for plugin authors.
      const fullDirective = venue ? `${directive} in ${venue}` : directive;
      await invokeLifecycle(pluginName, hook, trigger, id, {
        type: "awaiting",
        directive: fullDirective,
        escape,
      });
    },
    async succeeded(receipt?: string): Promise<void> {
      await invokeLifecycle(pluginName, hook, trigger, id, {
        type: "succeeded",
        receipt,
      });
    },
    async failed(error: string, recoverable: boolean = false): Promise<void> {
      await invokeLifecycle(pluginName, hook, trigger, id, {
        type: "failed",
        error,
        recoverable,
      });
    },
    async cancelled(): Promise<void> {
      await invokeLifecycle(pluginName, hook, trigger, id, {
        type: "cancelled",
      });
    },
  };
}
