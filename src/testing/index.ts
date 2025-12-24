/**
 * Testing utilities for Moss plugins
 *
 * This module provides mock implementations of Tauri IPC commands,
 * enabling integration testing of plugins without a running Tauri app.
 *
 * @example
 * ```typescript
 * import { setupMockTauri, type MockTauriContext } from "@symbiosis-lab/moss-api/testing";
 * import { readFile, writeFile } from "@symbiosis-lab/moss-api";
 *
 * describe("my plugin", () => {
 *   let ctx: MockTauriContext;
 *
 *   beforeEach(() => {
 *     ctx = setupMockTauri();
 *   });
 *
 *   afterEach(() => {
 *     ctx.cleanup();
 *   });
 *
 *   it("reads and writes files", async () => {
 *     // Set up initial file
 *     ctx.filesystem.setFile("/project/input.md", "# Hello");
 *
 *     // Use moss-api functions
 *     const content = await readFile("/project", "input.md");
 *     await writeFile("/project", "output.md", content.toUpperCase());
 *
 *     // Verify
 *     expect(ctx.filesystem.getFile("/project/output.md")?.content).toBe("# HELLO");
 *   });
 * });
 * ```
 *
 * @packageDocumentation
 */

export {
  // Main setup function
  setupMockTauri,
  // Factory functions
  createMockFilesystem,
  createDownloadTracker,
  createMockUrlConfig,
  createMockBinaryConfig,
  createMockCookieStorage,
  createMockBrowserTracker,
  // Types
  type SetupMockTauriOptions,
  type MockTauriContext,
  type MockFilesystem,
  type MockFile,
  type DownloadTracker,
  type MockUrlConfig,
  type MockUrlResponse,
  type MockBinaryConfig,
  type MockBinaryResult,
  type MockCookieStorage,
  type MockBrowserTracker,
} from "./mock-tauri";
