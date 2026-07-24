# Changelog

## 0.10.0

### Minor Changes

- #738 Thanks [@guoliu](https://github.com/guoliu)! - First publish via the open-source release pipeline. moss-api source consolidated into the moss monorepo; CI build pipeline replaces the standalone repo's build setup.

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `getIdentityPublicKey(purpose, scheme)` and `identitySign(purpose, scheme, payload)` — sign with the project's identity key without ever handling it. moss holds the key and returns a public key or a signature; your plugin builds the bytes and owns the protocol (the same split as a hardware wallet or a Nostr NIP-07 signer). One secp256k1 key serves both `secp256k1-schnorr` (BIP-340, x-only public key — Nostr) and `secp256k1-ecdsa` (DER/low-S over SHA-256, compressed-SEC1 public key — libp2p/IPNS), so an IPNS name derived from it is provably the same identity as the user's Nostr key. `purpose` is mandatory: moss mixes that purpose's domain tag into the signed bytes (for `ipns`, the spec's own `ipns-signature:` separator, so the result is spec-exact), which is what stops a plugin signature from being replayable as seta authentication or as an owner moderation event — pass only the bytes that go inside the tag. Both calls are gated: the manifest must declare `requires: ["identity_sign"]` or the host refuses. New `SigningPurpose` and `SigningScheme` types.
- Generated API reference at [`docs/api/`](docs/api/README.md) — every exported function, type, and interface, built from source doc comments with TypeDoc. Regenerate with `pnpm run docs`; CI flags a reference that has drifted from the source.
- `createMockDialogTracker`, `MockDialogTracker`, and `MockDialogResult` are now exported from `@symbiosis-lab/moss-api/testing`. They were always reachable via `MockTauriContext.dialogTracker` but could not be imported directly, unlike every other mock tracker.
- `httpPostMultipart(url, { textFields, files }, options)` — POST a `multipart/form-data` body (ordered text fields + base64 file parts). Enables binary uploads that the JSON-only `httpPost` cannot express, e.g. uploading image/audio bytes (read via `readSiteFile`) to a syndication target's GraphQL `singleFileUpload`. moss builds the multipart body, generates the boundary, and sets the Content-Type. New `MultipartTextField` / `MultipartFilePart` / `MultipartPostOptions` types.

### Changed (BREAKING)

- `PageNode.unlisted` renamed to `PageNode.draft`. The `unlisted` frontmatter field was removed from moss; page visibility is now expressed via `draft` (a draft renders and is published at its direct URL but is hidden from listings, feeds, sitemap, and navigation).

_Pending publish — cumulative since `0.7.12` (last released on main); full detail under [0.8.0]._

- `SocialComment` social-layer comment type, `contributes.jobs` plugin job descriptor, `startTask()` API, and `exposeAdvisoryPath()` utility.

## [0.8.0] - 2026-06-11

### Added

- `SocialComment` type for social-layer comment data (comments written to the platform, not local).
- `contributes.jobs` descriptor: plugins declare job verbs and amount types, normalized at load time.
- `startTask()` API alongside existing `reportProgress` — `TaskHandle` methods no-op when Tauri is unavailable (safe in test/SSR contexts).
- `exposeAdvisoryPath()` utility — plugins can read advisory output path for the current build.

## [0.8.0-rc.1] - 2026-05-29

### Changed

- Source consolidated into the moss monorepo. Build pipeline replaces the standalone repo's build setup. Continues lineage from `@symbiosis-lab/moss-api@0.7.12`.
- `TaskHandle.noOp()` guard added so API methods are safe to call outside Tauri context.
