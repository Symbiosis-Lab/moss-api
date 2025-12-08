import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openBrowser, closeBrowser } from "../browser";

describe("Browser Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  describe("openBrowser", () => {
    it("invokes open_plugin_browser command with URL", async () => {
      await openBrowser("https://example.com");
      expect(mockInvoke).toHaveBeenCalledWith("open_plugin_browser", {
        url: "https://example.com",
      });
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
      await openBrowser("https://example.com/login");
      await closeBrowser();

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(mockInvoke).toHaveBeenNthCalledWith(1, "open_plugin_browser", {
        url: "https://example.com/login",
      });
      expect(mockInvoke).toHaveBeenNthCalledWith(2, "close_plugin_browser", {});
    });
  });
});
