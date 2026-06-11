# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
