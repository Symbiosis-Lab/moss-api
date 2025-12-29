import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveBinary,
  BinaryResolutionError,
  type BinaryConfig,
} from "../binary-resolver";
import { clearPlatformCache } from "../platform";

describe("Binary Resolver Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockWindow: Record<string, unknown>;

  const HUGO_CONFIG: BinaryConfig = {
    name: "hugo",
    versionCommand: "{name} version",
    versionPattern: /hugo v(\d+\.\d+\.\d+)/i,
    sources: {
      "darwin-arm64": {
        github: {
          owner: "gohugoio",
          repo: "hugo",
          assetPattern: "hugo_extended_{version}_darwin-arm64.tar.gz",
        },
      },
      "darwin-x64": {
        github: {
          owner: "gohugoio",
          repo: "hugo",
          assetPattern: "hugo_extended_{version}_darwin-amd64.tar.gz",
        },
      },
      "linux-x64": {
        github: {
          owner: "gohugoio",
          repo: "hugo",
          assetPattern: "hugo_extended_{version}_linux-amd64.tar.gz",
        },
      },
      "windows-x64": {
        github: {
          owner: "gohugoio",
          repo: "hugo",
          assetPattern: "hugo_extended_{version}_windows-amd64.zip",
        },
      },
    },
  };

  beforeEach(() => {
    clearPlatformCache();
    mockInvoke = vi.fn();
    mockWindow = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
      __MOSS_INTERNAL_CONTEXT__: {
        plugin_name: "hugo-generator",
        project_path: "/path/to/project",
        moss_dir: "/path/to/project/.moss",
      },
    };
    (globalThis as unknown as { window: unknown }).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    clearPlatformCache();
    vi.clearAllMocks();
  });

  /**
   * Helper to mock platform detection
   */
  function mockPlatform(os: "darwin" | "linux" | "windows", arch: "arm64" | "x64" = "x64") {
    if (os === "windows") {
      mockInvoke
        .mockRejectedValueOnce(new Error("command not found"))
        .mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "Microsoft Windows",
          stderr: "",
        })
        .mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: arch === "arm64" ? "ARM64" : "AMD64",
          stderr: "",
        });
    } else {
      mockInvoke
        .mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: os === "darwin" ? "Darwin" : "Linux",
          stderr: "",
        })
        .mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: arch === "arm64" ? "arm64" : "x86_64",
          stderr: "",
        });
    }
  }

  /**
   * Helper to mock successful binary execution (for version check)
   */
  function mockBinaryCheck(version: string = "0.139.0") {
    return {
      success: true,
      exit_code: 0,
      stdout: `hugo v${version}+extended darwin/arm64 BuildDate=unknown`,
      stderr: "",
    };
  }

  /**
   * Helper to mock failed binary execution
   */
  function mockBinaryNotFound() {
    return {
      success: false,
      exit_code: 127,
      stdout: "",
      stderr: "command not found: hugo",
    };
  }

  describe("resolveBinary", () => {
    describe("resolution from configured path", () => {
      it("uses configured path when binary exists and works", async () => {
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.139.0"));

        const result = await resolveBinary(HUGO_CONFIG, {
          configuredPath: "/usr/local/bin/hugo",
        });

        expect(result.path).toBe("/usr/local/bin/hugo");
        expect(result.source).toBe("config");
        expect(result.version).toBe("0.139.0");
      });

      it("falls through when configured path does not exist", async () => {
        // Configured path check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // PATH check succeeds
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.138.0"));

        const result = await resolveBinary(HUGO_CONFIG, {
          configuredPath: "/nonexistent/hugo",
        });

        expect(result.path).toBe("hugo");
        expect(result.source).toBe("path");
        expect(result.version).toBe("0.138.0");
      });
    });

    describe("resolution from system PATH", () => {
      it("finds binary in PATH when not configured", async () => {
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.139.0"));

        const result = await resolveBinary(HUGO_CONFIG);

        expect(result.path).toBe("hugo");
        expect(result.source).toBe("path");
        expect(result.version).toBe("0.139.0");
      });

      it("falls through when binary not in PATH", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath (darwin x64)
        mockPlatform("darwin", "x64");
        // Plugin storage check - file exists
        mockInvoke.mockResolvedValueOnce(true);
        // Verify plugin storage binary works
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.137.0"));

        const result = await resolveBinary(HUGO_CONFIG, {
          autoDownload: false,
        });

        expect(result.path).toBe("/path/to/project/.moss/plugins/hugo-generator/bin/hugo");
        expect(result.source).toBe("plugin-storage");
      });
    });

    describe("resolution from plugin storage", () => {
      it("finds binary in plugin bin directory", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath (darwin x64)
        mockPlatform("darwin", "x64");
        // Plugin storage check succeeds
        mockInvoke.mockResolvedValueOnce(true); // pluginFileExists
        // Binary verification
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.136.0"));

        const result = await resolveBinary(HUGO_CONFIG, {
          autoDownload: false,
        });

        expect(result.path).toBe("/path/to/project/.moss/plugins/hugo-generator/bin/hugo");
        expect(result.source).toBe("plugin-storage");
        expect(result.version).toBe("0.136.0");
      });

      it("uses .exe extension on Windows", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath (windows)
        mockPlatform("windows");
        // Plugin storage check succeeds
        mockInvoke.mockResolvedValueOnce(true);
        // Binary verification
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck());

        const result = await resolveBinary(HUGO_CONFIG, {
          autoDownload: false,
        });

        expect(result.path).toContain("hugo.exe");
      });
    });

    describe("auto-download behavior", () => {
      it("downloads binary when not found and autoDownload is true", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath (darwin arm64)
        mockPlatform("darwin", "arm64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);
        // GitHub API call (fetch_url)
        mockInvoke.mockResolvedValueOnce({
          status: 200,
          ok: true,
          content_type: "application/json",
          body_base64: btoa(JSON.stringify({ tag_name: "v0.139.0" })),
        });
        // Download with curl - mkdir
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // Download with curl
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // Create bin directory marker (writePluginFile for .gitkeep)
        mockInvoke.mockResolvedValueOnce(undefined);
        // Extract with tar
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // chmod +x
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // Cache release info (writePluginFile) - happens inside downloadBinary before return
        mockInvoke.mockResolvedValueOnce(undefined);
        // Verify downloaded binary - happens after downloadBinary returns
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.139.0"));

        const progressCalls: string[] = [];
        const result = await resolveBinary(HUGO_CONFIG, {
          autoDownload: true,
          onProgress: (phase, message) => progressCalls.push(`${phase}: ${message}`),
        });

        expect(result.source).toBe("downloaded");
        expect(result.version).toBe("0.139.0");
        expect(progressCalls).toContain("download: Downloading hugo...");
      });

      it("throws BinaryResolutionError when autoDownload is false and binary not found", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath
        mockPlatform("darwin", "x64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);

        await expect(
          resolveBinary(HUGO_CONFIG, { autoDownload: false })
        ).rejects.toThrow(BinaryResolutionError);
      });

      it("error includes install instructions when autoDownload is false", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath
        mockPlatform("darwin", "x64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);

        try {
          await resolveBinary(HUGO_CONFIG, { autoDownload: false });
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BinaryResolutionError);
          const resolveError = error as BinaryResolutionError;
          expect(resolveError.phase).toBe("detection");
          expect(resolveError.message).toContain("hugo not found");
          expect(resolveError.message).toContain("Install via package manager");
        }
      });
    });

    describe("version extraction", () => {
      it("extracts version using configured pattern", async () => {
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "hugo v0.140.1+extended darwin/arm64",
          stderr: "",
        });

        const result = await resolveBinary(HUGO_CONFIG);

        expect(result.version).toBe("0.140.1");
      });

      it("returns undefined version when pattern does not match", async () => {
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "some binary v1.0.0",
          stderr: "",
        });

        const result = await resolveBinary({
          ...HUGO_CONFIG,
          versionPattern: /hugo v(\d+\.\d+\.\d+)/i,
        });

        expect(result.version).toBeUndefined();
      });

      it("handles version in stderr", async () => {
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "hugo v0.139.0+extended darwin/arm64",
        });

        const result = await resolveBinary(HUGO_CONFIG);

        expect(result.version).toBe("0.139.0");
      });
    });

    describe("progress callback", () => {
      it("reports progress during detection", async () => {
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck());

        const progressCalls: Array<{ phase: string; message: string }> = [];
        await resolveBinary(HUGO_CONFIG, {
          configuredPath: "/usr/local/bin/hugo",
          onProgress: (phase, message) => progressCalls.push({ phase, message }),
        });

        expect(progressCalls.some(p => p.phase === "detection")).toBe(true);
      });
    });

    describe("error handling", () => {
      it("throws BinaryResolutionError with correct phase on download failure", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath
        mockPlatform("darwin", "arm64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);
        // GitHub API failure
        mockInvoke.mockResolvedValueOnce({
          status: 500,
          ok: false,
          content_type: "text/plain",
          body_base64: btoa("Internal Server Error"),
        });
        // Check cache - no cache
        mockInvoke.mockResolvedValueOnce(false);

        try {
          await resolveBinary(HUGO_CONFIG, { autoDownload: true });
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BinaryResolutionError);
          const resolveError = error as BinaryResolutionError;
          expect(resolveError.phase).toBe("download");
        }
      });

      it("throws when platform has no download source", async () => {
        const configWithoutSource: BinaryConfig = {
          ...HUGO_CONFIG,
          sources: {}, // No sources for any platform
        };

        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath
        mockPlatform("darwin", "arm64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);

        try {
          await resolveBinary(configWithoutSource, { autoDownload: true });
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(BinaryResolutionError);
          const resolveError = error as BinaryResolutionError;
          expect(resolveError.message).toContain("No download source configured");
        }
      });
    });

    describe("GitHub release fetching", () => {
      it("handles rate limiting with cached fallback", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath
        mockPlatform("darwin", "arm64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);
        // GitHub API rate limited
        mockInvoke.mockResolvedValueOnce({
          status: 403,
          ok: false,
          content_type: "application/json",
          body_base64: btoa(JSON.stringify({ message: "rate limit exceeded" })),
        });
        // Check cache file exists
        mockInvoke.mockResolvedValueOnce(true);
        // Read cache file
        mockInvoke.mockResolvedValueOnce(
          JSON.stringify({ version: "0.138.0", tag: "v0.138.0", cachedAt: new Date().toISOString() })
        );
        // Download - mkdir
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // Download - curl
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // Create bin directory (writePluginFile for .gitkeep)
        mockInvoke.mockResolvedValueOnce(undefined);
        // Extract with tar
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // chmod +x
        mockInvoke.mockResolvedValueOnce({ success: true, exit_code: 0, stdout: "", stderr: "" });
        // Cache release info (writePluginFile) - happens inside downloadBinary before return
        mockInvoke.mockResolvedValueOnce(undefined);
        // Verify downloaded binary - happens after downloadBinary returns
        mockInvoke.mockResolvedValueOnce(mockBinaryCheck("0.138.0"));

        const result = await resolveBinary(HUGO_CONFIG, { autoDownload: true });

        expect(result.version).toBe("0.138.0");
      });

      it("throws when rate limited and no cache available", async () => {
        // PATH check fails
        mockInvoke.mockResolvedValueOnce(mockBinaryNotFound());
        // Platform detection for getPluginBinPath
        mockPlatform("darwin", "arm64");
        // Plugin storage check fails
        mockInvoke.mockResolvedValueOnce(false);
        // Rate limited
        mockInvoke.mockResolvedValueOnce({
          status: 403,
          ok: false,
          content_type: "application/json",
          body_base64: btoa("{}"),
        });
        // No cache
        mockInvoke.mockResolvedValueOnce(false);

        await expect(
          resolveBinary(HUGO_CONFIG, { autoDownload: true })
        ).rejects.toThrow(/rate limit/i);
      });
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
