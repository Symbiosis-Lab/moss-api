import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openBrowser, closeBrowser, BrowserHandle } from "../browser";

describe("Browser Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockListen: ReturnType<typeof vi.fn>;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn().mockResolvedValue(undefined);
    mockUnlisten = vi.fn();
    mockListen = vi.fn().mockResolvedValue(mockUnlisten);
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
        event: { listen: mockListen },
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.clearAllMocks();
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
});
