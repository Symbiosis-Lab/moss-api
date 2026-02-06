import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  openBrowser,
  closeBrowser,
  openBrowserWithHtml,
  showBrowserForm,
  BrowserHandle,
} from "../browser";

describe("Browser Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockListen: ReturnType<typeof vi.fn>;
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn().mockResolvedValue(undefined);
    mockUnlisten = vi.fn();
    mockListen = vi.fn().mockResolvedValue(mockUnlisten);
    mockEmit = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
        event: { listen: mockListen, emit: mockEmit },
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("openBrowser", () => {
    it("invokes open_plugin_browser command with URL", async () => {
      const handle = await openBrowser("https://example.com");
      expect(mockInvoke).toHaveBeenCalledWith("open_plugin_browser", {
        url: "https://example.com",
      });
      expect(handle).toBeDefined();
    });

    it("returns BrowserHandle with closed promise", async () => {
      const handle = await openBrowser("https://example.com");

      expect(handle).toHaveProperty("closed");
      expect(handle.closed).toBeInstanceOf(Promise);
    });

    it("listens for browser-closed event", async () => {
      await openBrowser("https://example.com");

      expect(mockListen).toHaveBeenCalledWith(
        "browser-closed",
        expect.any(Function)
      );
    });

    it("closed promise resolves when browser-closed event fires", async () => {
      const handle = await openBrowser("https://example.com");

      // Get the event handler that was registered
      const eventHandler = mockListen.mock.calls[0][1];

      // Simulate browser closed event
      eventHandler({ payload: { reason: { type: "user" } } });

      const reason = await handle.closed;
      expect(reason).toEqual({ type: "user" });
    });

    it("unlistens after browser-closed event fires", async () => {
      const handle = await openBrowser("https://example.com");

      const eventHandler = mockListen.mock.calls[0][1];
      eventHandler({ payload: { reason: { type: "user" } } });

      await handle.closed;

      // Wait a tick for unlisten to be called
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockUnlisten).toHaveBeenCalled();
    });

    it("handles URL with path and query params", async () => {
      await openBrowser("https://example.com/path?query=value&other=123");
      expect(mockInvoke).toHaveBeenCalledWith("open_plugin_browser", {
        url: "https://example.com/path?query=value&other=123",
      });
    });

    it("throws when Tauri is unavailable", async () => {
      (globalThis as unknown as { window: unknown }).window = {};
      await expect(openBrowser("https://example.com")).rejects.toThrow(
        "Tauri core not available"
      );
    });
  });

  describe("closeBrowser", () => {
    it("invokes close_plugin_browser command with empty args", async () => {
      await closeBrowser();
      expect(mockInvoke).toHaveBeenCalledWith("close_plugin_browser", {});
    });

    it("throws when Tauri is unavailable", async () => {
      (globalThis as unknown as { window: unknown }).window = {};
      await expect(closeBrowser()).rejects.toThrow("Tauri core not available");
    });
  });

  describe("integration", () => {
    it("can open and close browser in sequence", async () => {
      const handle = await openBrowser("https://example.com/login");
      await closeBrowser();

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(mockInvoke).toHaveBeenNthCalledWith(1, "open_plugin_browser", {
        url: "https://example.com/login",
      });
      expect(mockInvoke).toHaveBeenNthCalledWith(2, "close_plugin_browser", {});
      expect(handle.closed).toBeInstanceOf(Promise);
    });

    it("closed promise resolves with programmatic reason when closeBrowser called", async () => {
      const handle = await openBrowser("https://example.com/login");

      // Get the event handler
      const eventHandler = mockListen.mock.calls[0][1];

      // Simulate event from closeBrowser
      eventHandler({ payload: { reason: { type: "programmatic" } } });

      const reason = await handle.closed;
      expect(reason.type).toBe("programmatic");
    });
  });

  // ==========================================================================
  // Bridge script injection tests
  // ==========================================================================

  describe("openBrowserWithHtml - bridge injection", () => {
    it("injects bridge script before </head> when present", async () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello</h1></body>
</html>`;

      await openBrowserWithHtml(html);

      const calledHtml = mockInvoke.mock.calls[0][1].html as string;
      // Bridge should be injected before </head>
      expect(calledHtml).toContain("window.mossApi");
      expect(calledHtml).toContain("moss:browser-form-submit");
      expect(calledHtml).toContain("moss:browser-form-cancel");
      expect(calledHtml).toContain("close_plugin_browser");

      // Verify position: bridge script should come before </head>
      const bridgeIdx = calledHtml.indexOf("window.mossApi");
      const headCloseIdx = calledHtml.indexOf("</head>");
      expect(bridgeIdx).toBeLessThan(headCloseIdx);
    });

    it("prepends bridge script when no </head> tag", async () => {
      const html = `<h1>Hello World</h1><p>No head tag</p>`;

      await openBrowserWithHtml(html);

      const calledHtml = mockInvoke.mock.calls[0][1].html as string;
      // Bridge should be prepended
      expect(calledHtml).toContain("window.mossApi");

      // The bridge script should come before the original HTML
      const bridgeIdx = calledHtml.indexOf("window.mossApi");
      const originalIdx = calledHtml.indexOf("<h1>Hello World</h1>");
      expect(bridgeIdx).toBeLessThan(originalIdx);
    });

    it("bridge script exposes submit, cancel, close, and emit functions", async () => {
      const html = `<html><head></head><body></body></html>`;

      await openBrowserWithHtml(html);

      const calledHtml = mockInvoke.mock.calls[0][1].html as string;
      expect(calledHtml).toContain("submit:");
      expect(calledHtml).toContain("cancel:");
      expect(calledHtml).toContain("close:");
      expect(calledHtml).toContain("emit:");
    });

    it("does not change the public API (still takes just html string)", async () => {
      // Just verifying the function signature hasn't changed
      await openBrowserWithHtml("<p>test</p>");
      expect(mockInvoke).toHaveBeenCalledWith(
        "set_plugin_browser_html",
        expect.objectContaining({ html: expect.any(String) })
      );
    });
  });

  // ==========================================================================
  // showBrowserForm tests
  // ==========================================================================

  describe("showBrowserForm", () => {
    it("returns payload on submit event", async () => {
      const html = `<html><head></head><body><form></form></body></html>`;
      const formPromise = showBrowserForm<{ name: string }>(html);

      // Let the listeners register (microtask flush)
      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-submit",
          expect.any(Function)
        );
      });

      // Find the submit handler
      const submitCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-submit"
      );
      const submitHandler = submitCall![1];

      // Simulate submit event
      submitHandler({ payload: { name: "Alice" } });

      const result = await formPromise;
      expect(result).toEqual({ name: "Alice" });
    });

    it("returns null on cancel event", async () => {
      const html = `<html><head></head><body><form></form></body></html>`;
      const formPromise = showBrowserForm(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-cancel",
          expect.any(Function)
        );
      });

      // Find the cancel handler
      const cancelCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-cancel"
      );
      const cancelHandler = cancelCall![1];

      // Simulate cancel event
      cancelHandler({ payload: {} });

      const result = await formPromise;
      expect(result).toBeNull();
    });

    it("returns null on timeout", async () => {
      vi.useFakeTimers();

      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html, { timeoutMs: 5000 });

      // Let the listeners register
      await vi.advanceTimersByTimeAsync(0);

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(5000);

      const result = await formPromise;
      expect(result).toBeNull();
    });

    it("uses default timeout of 300000ms", async () => {
      vi.useFakeTimers();

      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html);

      // Let the listeners register
      await vi.advanceTimersByTimeAsync(0);

      // Not timed out yet at 299999ms
      await vi.advanceTimersByTimeAsync(299999);

      // Now advance to 300000ms total
      await vi.advanceTimersByTimeAsync(1);

      const result = await formPromise;
      expect(result).toBeNull();
    });

    it("calls closeBrowser on submit", async () => {
      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-submit",
          expect.any(Function)
        );
      });

      const submitCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-submit"
      );
      submitCall![1]({ payload: { data: "test" } });

      await formPromise;

      expect(mockInvoke).toHaveBeenCalledWith("close_plugin_browser", {});
    });

    it("calls closeBrowser on cancel", async () => {
      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-cancel",
          expect.any(Function)
        );
      });

      const cancelCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-cancel"
      );
      cancelCall![1]({ payload: {} });

      await formPromise;

      expect(mockInvoke).toHaveBeenCalledWith("close_plugin_browser", {});
    });

    it("calls closeBrowser on timeout", async () => {
      vi.useFakeTimers();

      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html, { timeoutMs: 1000 });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);

      await formPromise;

      expect(mockInvoke).toHaveBeenCalledWith("close_plugin_browser", {});
    });

    it("cleans up both listeners on submit", async () => {
      // Create separate unlisten mocks for each listener
      const unlistenSubmit = vi.fn();
      const unlistenCancel = vi.fn();
      let callCount = 0;
      mockListen.mockImplementation(() => {
        callCount++;
        // showBrowserForm registers submit first, then cancel (no browser-closed listener)
        if (callCount === 1) return Promise.resolve(unlistenSubmit);
        return Promise.resolve(unlistenCancel);
      });

      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledTimes(2); // submit + cancel
      });

      // Find the submit handler (the one for moss:browser-form-submit)
      const submitCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-submit"
      );
      submitCall![1]({ payload: { data: "test" } });

      await formPromise;

      expect(unlistenSubmit).toHaveBeenCalled();
      expect(unlistenCancel).toHaveBeenCalled();
    });

    it("cleans up both listeners on cancel", async () => {
      const unlistenSubmit = vi.fn();
      const unlistenCancel = vi.fn();
      let callCount = 0;
      mockListen.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(unlistenSubmit);
        return Promise.resolve(unlistenCancel);
      });

      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledTimes(2); // submit + cancel
      });

      const cancelCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-cancel"
      );
      cancelCall![1]({ payload: {} });

      await formPromise;

      expect(unlistenSubmit).toHaveBeenCalled();
      expect(unlistenCancel).toHaveBeenCalled();
    });

    it("cleans up both listeners on timeout", async () => {
      vi.useFakeTimers();

      const unlistenSubmit = vi.fn();
      const unlistenCancel = vi.fn();
      let callCount = 0;
      mockListen.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(unlistenSubmit);
        return Promise.resolve(unlistenCancel);
      });

      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm(html, { timeoutMs: 1000 });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);

      await formPromise;

      expect(unlistenSubmit).toHaveBeenCalled();
      expect(unlistenCancel).toHaveBeenCalled();
    });

    it("ignores second submit after first (settled flag)", async () => {
      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm<{ value: number }>(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-submit",
          expect.any(Function)
        );
      });

      const submitCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-submit"
      );
      const submitHandler = submitCall![1];

      // First submit
      submitHandler({ payload: { value: 1 } });
      // Second submit - should be ignored
      submitHandler({ payload: { value: 2 } });

      const result = await formPromise;
      expect(result).toEqual({ value: 1 });
    });

    it("ignores cancel after submit (settled flag)", async () => {
      const html = `<html><head></head><body></body></html>`;
      const formPromise = showBrowserForm<{ value: number }>(html);

      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-submit",
          expect.any(Function)
        );
      });

      const submitCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-submit"
      );
      const cancelCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-cancel"
      );

      // Submit first, then cancel
      submitCall![1]({ payload: { value: 42 } });
      cancelCall![1]({ payload: {} });

      const result = await formPromise;
      expect(result).toEqual({ value: 42 });
    });

    it("opens browser with the provided HTML", async () => {
      const html = `<html><head></head><body><form>My Form</form></body></html>`;
      const formPromise = showBrowserForm(html);

      // Wait for both the invoke and the listeners to be set up
      await vi.waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "set_plugin_browser_html",
          expect.objectContaining({ html: expect.any(String) })
        );
        expect(mockListen).toHaveBeenCalledWith(
          "moss:browser-form-cancel",
          expect.any(Function)
        );
      });

      // Resolve the promise so the test can clean up
      const cancelCall = mockListen.mock.calls.find(
        (c) => c[0] === "moss:browser-form-cancel"
      );
      cancelCall![1]({ payload: {} });
      await formPromise;
    });
  });
});
