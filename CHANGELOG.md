# Changelog

All notable changes to this project are documented here.

## 0.3.0 - Unreleased

### Added

- Task Run status and result operations.
- GA Monitor snapshot, immediate trigger, cursor pagination, and explicit nullable-field updates.
- Shared exact-body webhook signature verification and contract fixtures.
- n8n CLI build/lint/prerelease tooling, PR CI, consumer package smoke checks, and provenance-ready publishing.

### Changed

- Migrated Search from `/v1beta/search` to `/v1/search` with GA modes and nested advanced settings.
- Migrated Monitor operations from `/v1alpha/monitors` to `/v1/monitors`.
- Updated Task processor and Chat model choices.
- Preserved n8n input/output pairing for multi-item execution and continue-on-fail output.
- Made webhook signature validation the secure default.

### Fixed

- Added the missing package entry point and synchronized source, lockfile, and package versions.
- Corrected repository metadata, license, API path encoding, response normalization, and release checks.

## 0.2.0 - 2025-08-22

- Added Monitor operations and triggers.
- Added Parallel web chat and async Task webhook support.
