/**
 * Event utilities for plugin communication
 *
 * Provides a way for plugins and dialog windows to communicate
 * via Tauri's event system.
 */

/**
 * Tauri event listener interface
 */
interface TauriEventListen {
  (event: string, handler: (event: { payload: unknown }) => void): Promise<() => void>;
}

/**
 * Tauri event emit interface
 */
interface TauriEventEmit {
  (event: string, payload?: unknown): Promise<void>;
}

interface TauriEventWindow {
  __TAURI__?: {
    event?: {
      listen: TauriEventListen;
      emit: TauriEventEmit;
    };
  };
}

/**
 * Get Tauri event API
 * @internal
 */
function getTauriEvent(): { listen: TauriEventListen; emit: TauriEventEmit } {
  const w = window as unknown as TauriEventWindow;
  if (!w.__TAURI__?.event) {
    throw new Error("Tauri event API not available");
  }
  return w.__TAURI__.event;
}

/**
 * Check if Tauri event API is available
 * @category Events
 */
export function isEventApiAvailable(): boolean {
  const w = window as unknown as TauriEventWindow;
  return !!w.__TAURI__?.event;
}

/**
 * Emit an event to other parts of the application
 *
 * @param event - Event name (e.g., "repo-created", "dialog-result")
 * @param payload - Data to send with the event
 *
 * @example
 * ```typescript
 * // From dialog:
 * await emitEvent("repo-name-validated", { name: "my-repo", available: true });
 *
 * // From plugin:
 * await emitEvent("deployment-started", { url: "https://github.com/..." });
 * ```
 * @category Events
 */
export async function emitEvent(event: string, payload?: unknown): Promise<void> {
  await getTauriEvent().emit(event, payload);
}

/**
 * Listen for events from other parts of the application
 *
 * @param event - Event name to listen for
 * @param handler - Function to call when event is received
 * @returns Cleanup function to stop listening
 *
 * @example
 * ```typescript
 * const unlisten = await onEvent<{ name: string; available: boolean }>(
 *   "repo-name-validated",
 *   (data) => {
 *     console.log(`Repo ${data.name} is ${data.available ? "available" : "taken"}`);
 *   }
 * );
 *
 * // Later, to stop listening:
 * unlisten();
 * ```
 * @category Events
 */
export async function onEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  const unlisten = await getTauriEvent().listen(event, (e) => {
    handler(e.payload as T);
  });
  return unlisten;
}

/**
 * Wait for a single event occurrence
 *
 * @param event - Event name to wait for
 * @param timeoutMs - Maximum time to wait (default: 30000ms)
 * @returns Promise that resolves with the event payload
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * try {
 *   const result = await waitForEvent<{ confirmed: boolean }>("user-confirmed", 10000);
 *   if (result.confirmed) {
 *     // proceed
 *   }
 * } catch (e) {
 *   console.log("User did not respond in time");
 * }
 * ```
 * @category Events
 */
export async function waitForEvent<T>(
  event: string,
  timeoutMs: number = 30000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let unlisten: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (unlisten) unlisten();
      clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeoutMs);

    onEvent<T>(event, (payload) => {
      cleanup();
      resolve(payload);
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
    });
  });
}
