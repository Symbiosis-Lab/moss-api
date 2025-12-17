import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchUrl, downloadAsset } from "../http";

describe("HTTP Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn();
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.clearAllMocks();
  });

  describe("fetchUrl", () => {
    it("calls fetch_url with correct arguments", async () => {
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        body_base64: btoa("response body"),
        content_type: "text/plain",
      });

      await fetchUrl("https://example.com/api");

      expect(mockInvoke).toHaveBeenCalledWith("fetch_url", {
        url: "https://example.com/api",
        timeoutMs: 30000,
      });
    });

    it("uses custom timeout when provided", async () => {
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        body_base64: btoa(""),
        content_type: null,
      });

      await fetchUrl("https://example.com", { timeoutMs: 60000 });

      expect(mockInvoke).toHaveBeenCalledWith("fetch_url", {
        url: "https://example.com",
        timeoutMs: 60000,
      });
    });

    it("returns FetchResult with decoded body", async () => {
      const content = "Hello, World!";
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        body_base64: btoa(content),
        content_type: "text/plain",
      });

      const result = await fetchUrl("https://example.com");

      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
      expect(result.contentType).toBe("text/plain");
      expect(result.text()).toBe(content);
    });

    it("returns body as Uint8Array", async () => {
      const content = "test";
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        body_base64: btoa(content),
        content_type: null,
      });

      const result = await fetchUrl("https://example.com");

      expect(result.body).toBeInstanceOf(Uint8Array);
      expect(result.body.length).toBe(4);
    });

    it("handles HTTP errors correctly", async () => {
      mockInvoke.mockResolvedValue({
        status: 404,
        ok: false,
        body_base64: btoa("Not Found"),
        content_type: "text/plain",
      });

      const result = await fetchUrl("https://example.com/missing");

      expect(result.status).toBe(404);
      expect(result.ok).toBe(false);
    });

    it("propagates network errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Connection refused"));

      await expect(fetchUrl("https://unreachable.com")).rejects.toThrow(
        "Connection refused"
      );
    });
  });

  describe("downloadAsset", () => {
    it("calls download_asset with correct arguments", async () => {
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        content_type: "image/png",
        bytes_written: 1024,
        actual_path: "assets/image.png",
      });

      await downloadAsset(
        "https://example.com/image.png",
        "/path/to/project",
        "assets"
      );

      expect(mockInvoke).toHaveBeenCalledWith("download_asset", {
        url: "https://example.com/image.png",
        projectPath: "/path/to/project",
        targetDir: "assets",
        timeoutMs: 30000,
      });
    });

    it("uses custom timeout when provided", async () => {
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        content_type: null,
        bytes_written: 0,
        actual_path: "",
      });

      await downloadAsset("https://example.com", "/project", "downloads", {
        timeoutMs: 120000,
      });

      expect(mockInvoke).toHaveBeenCalledWith("download_asset", {
        url: "https://example.com",
        projectPath: "/project",
        targetDir: "downloads",
        timeoutMs: 120000,
      });
    });

    it("returns DownloadResult with correct fields", async () => {
      mockInvoke.mockResolvedValue({
        status: 200,
        ok: true,
        content_type: "image/jpeg",
        bytes_written: 2048,
        actual_path: "assets/photo.jpg",
      });

      const result = await downloadAsset(
        "https://example.com/photo",
        "/project",
        "assets"
      );

      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
      expect(result.contentType).toBe("image/jpeg");
      expect(result.bytesWritten).toBe(2048);
      expect(result.actualPath).toBe("assets/photo.jpg");
    });

    it("handles download failures", async () => {
      mockInvoke.mockResolvedValue({
        status: 404,
        ok: false,
        content_type: null,
        bytes_written: 0,
        actual_path: "",
      });

      const result = await downloadAsset(
        "https://example.com/missing",
        "/project",
        "assets"
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.bytesWritten).toBe(0);
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Timeout"));

      await expect(
        downloadAsset("https://slow.example.com", "/project", "assets")
      ).rejects.toThrow("Timeout");
    });
  });
});
