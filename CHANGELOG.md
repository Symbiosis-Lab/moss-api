# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2026-08-12

### Added

- `getKey(name, algorithm)`, `listKeys()`, and `signWithKey(name, payload)` — a keystore for plugin-owned keys. moss holds the key bytes and signs on request; your plugin never receives them. Keys are scoped to your plugin automatically (no id to pass, no other plugin's key reachable) and need no manifest declaration — creating and using your own key spends nothing of anyone else's. `ed25519` (IPNS's key type) and `secp256k1-schnorr`. New `KeyAlgorithm` and `KeyInfo` types. Replaces the never-shipped `identitySign` API.
- `exposeAdvisoryPath()` utility — plugins can read the advisory output path for the current build. (Listed under 0.8.0 below, but never actually included in a published bundle until now.)
- `createMockDialogTracker`, `MockDialogTracker`, and `MockDialogResult` are now exported from `@symbiosis-lab/moss-api/testing`. They were always reachable via `MockTauriContext.dialogTracker` but could not be imported directly, unlike every other mock tracker.
- Topic guide [`docs/runtime-environment.md`](docs/runtime-environment.md) — the QuickJS plugin-runtime contract: available globals (and the missing ones: Web Streams, `crypto.subtle`, DOM), `fetch` shim limits, path-preserving multipart uploads, console→log-level mapping, the env-var allowlist, config merge precedence (`config.json` > `config.toml` > manifest defaults), the plugin keystore for signing instead of WebCrypto, and why green Node-mock tests don't prove QuickJS compatibility.
- Generated API reference at [`docs/api/`](docs/api/README.md) — every exported function, type, and interface, built from source doc comments with TypeDoc. Regenerate with `pnpm run docs`; CI flags a reference that has drifted from the source.

## [0.10.0] - 2026-06-24

_This entry was reconciled retroactively on 2026-08-12 against the published
npm tarball: 0.10.0 shipped without a changelog cut, so the items below sat
under Unreleased for seven weeks after users could already install them._

### Added

- First publish via the open-source release pipeline (#738). moss-api source consolidated into the moss monorepo; CI build pipeline replaces the standalone repo's build setup.
- `httpPostMultipart(url, { textFields, files }, options)` — POST a `multipart/form-data` body (ordered text fields + base64 file parts). Enables binary uploads that the JSON-only `httpPost` cannot express, e.g. uploading image/audio bytes (read via `readSiteFile`) to a syndication target's GraphQL `singleFileUpload`. moss builds the multipart body, generates the boundary, and sets the Content-Type. New `MultipartTextField` / `MultipartFilePart` / `MultipartPostOptions` types.
- First npm appearance of the [0.8.0] items below: `SocialComment`, `contributes.jobs`, and `startTask()` (`exposeAdvisoryPath()` did not make the bundle; it ships in 0.11.0).

### Changed (BREAKING)

- `PageNode.unlisted` renamed to `PageNode.draft`. The `unlisted` frontmatter field was removed from moss; page visibility is now expressed via `draft` (a draft renders and is published at its direct URL but is hidden from listings, feeds, sitemap, and navigation).

## [0.8.0] - 2026-06-11

_Never published to npm — the `0.8.0` version number was already used by an
unrelated release in January 2026, so this cut skipped npm; its contents first
reached users in 0.10.0 (except `exposeAdvisoryPath`, which ships in 0.11.0)._

### Added

- `SocialComment` type for social-layer comment data (comments written to the platform, not local).
- `contributes.jobs` descriptor: plugins declare job verbs and amount types, normalized at load time.
- `startTask()` API alongside existing `reportProgress` — `TaskHandle` methods no-op when Tauri is unavailable (safe in test/SSR contexts).
- `exposeAdvisoryPath()` utility — plugins can read advisory output path for the current build.

## [0.8.0-rc.1] - 2026-05-29

### Changed

- Source consolidated into the moss monorepo. Build pipeline replaces the standalone repo's build setup. Continues lineage from `@symbiosis-lab/moss-api@0.7.12`.
- `TaskHandle.noOp()` guard added so API methods are safe to call outside Tauri context.
