import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveBinary,
  BinaryResolutionError,
  type BinaryConfig,
  type BinaryResolution,
} from "../binary-resolver.js";

// Use vi.hoisted so mocks are available when vi.mock factories run
const { mockInvoke, mockListen, mockUnlisten } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockListen: vi.fn(),
  mockUnlisten: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

describe("Binary Resolver (Tauri wrapper)", () => {
  const HUGO_CONFIG: BinaryConfig = {
    name: "hugo",
    binary_name: "hugo",
    version_check: {
      args: ["version"],
      pattern: "hugo v(\\d+\\.\\d+\\.\\d+)",
    },
    sources: {
      "darwin-arm64": {
        direct_url:
          "https://github.com/gohugoio/hugo/releases/download/v0.152.2/hugo_extended_0.152.2_darwin-universal.tar.gz",
        archive_format: "tar_gz",
      },
      "darwin-x64": {
        direct_url:
          "https://github.com/gohugoio/hugo/releases/download/v0.152.2/hugo_extended_0.152.2_darwin-universal.tar.gz",
        archive_format: "tar_gz",
      },
      "linux-x64": {
        github: {
          owner: "gohugoio",
          repo: "hugo",
          asset_pattern: "hugo_extended_{version}_linux-amd64.tar.gz",
        },
        archive_format: "tar_gz",
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: listen returns unlisten function
    mockListen.mockResolvedValue(mockUnlisten);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveBinary", () => {
    it("invokes resolve_binary_command with correct args", async () => {
      const resolution: BinaryResolution = {
        path: "/usr/local/bin/hugo",
        version: "0.152.2",
        source: "system_path",
      };
      mockInvoke.mockResolvedValueOnce(resolution);

      const result = await resolveBinary(HUGO_CONFIG);

      expect(mockInvoke).toHaveBeenCalledWith("resolve_binary_command", {
        config: HUGO_CONFIG,
        configuredPath: null,
        autoDownload: true,
      });
      expect(result).toEqual(resolution);
    });

    it("passes configuredPath when provided", async () => {
      const resolution: BinaryResolution = {
        path: "/opt/hugo",
        version: "0.140.0",
        source: "configured_path",
      };
      mockInvoke.mockResolvedValueOnce(resolution);

      const result = await resolveBinary(HUGO_CONFIG, {
        configuredPath: "/opt/hugo",
      });

      expect(mockInvoke).toHaveBeenCalledWith("resolve_binary_command", {
        config: HUGO_CONFIG,
        configuredPath: "/opt/hugo",
        autoDownload: true,
      });
      expect(result.source).toBe("configured_path");
    });

    it("passes autoDownload=false when specified", async () => {
      const resolution: BinaryResolution = {
        path: "hugo",
        version: "0.139.0",
        source: "system_path",
      };
      mockInvoke.mockResolvedValueOnce(resolution);

      await resolveBinary(HUGO_CONFIG, { autoDownload: false });

      expect(mockInvoke).toHaveBeenCalledWith("resolve_binary_command", {
        config: HUGO_CONFIG,
        configuredPath: null,
        autoDownload: false,
      });
    });

    it("sets up progress listener when onProgress provided", async () => {
      const resolution: BinaryResolution = {
        path: "hugo",
        version: "0.152.2",
        source: "downloaded",
      };
      mockInvoke.mockResolvedValueOnce(resolution);
      const onProgress = vi.fn();

      await resolveBinary(HUGO_CONFIG, { onProgress });

      // Should have set up a listener for download-progress
      expect(mockListen).toHaveBeenCalledWith(
        "download-progress",
        expect.any(Function)
      );
      // Should clean up the listener after completion
      expect(mockUnlisten).toHaveBeenCalled();
    });

    it("does not set up listener when no onProgress", async () => {
      const resolution: BinaryResolution = {
        path: "hugo",
        version: "0.152.2",
        source: "system_path",
      };
      mockInvoke.mockResolvedValueOnce(resolution);

      await resolveBinary(HUGO_CONFIG);

      expect(mockListen).not.toHaveBeenCalled();
    });

    it("progress listener filters by binary name", async () => {
      const resolution: BinaryResolution = {
        path: "hugo",
        version: "0.152.2",
        source: "downloaded",
      };
      const onProgress = vi.fn();

      // Capture the listener callback when listen is called
      type EventCallback = (event: { payload: Record<string, unknown> }) => void;
      let listenerCallback: EventCallback;
      mockListen.mockImplementation((_event: string, cb: EventCallback) => {
        listenerCallback = cb;
        return Promise.resolve(mockUnlisten);
      });

      // When invoke is called, simulate progress events
      mockInvoke.mockImplementation(() => {
        listenerCallback({
          payload: { binary: "hugo", bytes_downloaded: 1024, total_bytes: 5000 },
        });
        listenerCallback({
          payload: { binary: "ffmpeg", bytes_downloaded: 500, total_bytes: 2000 },
        });
        listenerCallback({
          payload: { binary: "hugo", bytes_downloaded: 5000, total_bytes: 5000 },
        });
        return Promise.resolve(resolution);
      });

      await resolveBinary(HUGO_CONFIG, { onProgress });

      // Should only report hugo events, not ffmpeg
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith("hugo", 1024, 5000);
      expect(onProgress).toHaveBeenCalledWith("hugo", 5000, 5000);
    });

    it("cleans up listener on error", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Download failed"));
      const onProgress = vi.fn();

      await expect(
        resolveBinary(HUGO_CONFIG, { onProgress })
      ).rejects.toThrow(BinaryResolutionError);

      // Listener should still be cleaned up via finally block
      expect(mockUnlisten).toHaveBeenCalled();
    });

    it("wraps Tauri errors in BinaryResolutionError", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Binary not found"));

      try {
        await resolveBinary(HUGO_CONFIG);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BinaryResolutionError);
        const resolveError = error as BinaryResolutionError;
        expect(resolveError.message).toBe("Binary not found");
        expect(resolveError.phase).toBe("detection");
      }
    });

    it("wraps non-Error Tauri rejections in BinaryResolutionError", async () => {
      mockInvoke.mockRejectedValueOnce("String error from Tauri");

      try {
        await resolveBinary(HUGO_CONFIG);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BinaryResolutionError);
        const resolveError = error as BinaryResolutionError;
        expect(resolveError.message).toBe("String error from Tauri");
      }
    });
  });

  describe("BinaryResolutionError", () => {
    it("includes phase information", () => {
      const error = new BinaryResolutionError("Test error", "extraction");

      expect(error.name).toBe("BinaryResolutionError");
      expect(error.phase).toBe("extraction");
      expect(error.message).toBe("Test error");
    });

    it("includes cause when provided", () => {
      const cause = new Error("Root cause");
      const error = new BinaryResolutionError("Wrapper error", "download", cause);

      expect(error.cause).toBe(cause);
    });
  });
});
