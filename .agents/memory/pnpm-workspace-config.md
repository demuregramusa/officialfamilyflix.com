---
name: pnpm workspace configuration rewrites
description: Preserve repository-level package age and platform override policy during dependency changes.
---

In this workspace, a package add/remove command can rewrite `pnpm-workspace.yaml`, normalize platform override keys, and change the lockfile's catalog specifier even when those changes were not intended. The rewrite can remove the configured minimum package release age.

**Why:** An attempted temporary tooling dependency changed the workspace configuration and weakened its package-age guard; the original configuration had to be restored manually.

**How to apply:** After any pnpm dependency change, inspect `git diff` for `pnpm-workspace.yaml` and `pnpm-lock.yaml`. Preserve the original security settings and unrelated catalog/override values; do not accept a broad workspace-file rewrite as routine.

Server-side WebTorrent also relies on the `node-datachannel` native addon. Its build must be explicitly permitted, and WebTorrent must remain external to the API esbuild bundle so the addon resolves relative to its package rather than the generated server file.

**Why:** Bundling WebTorrent moved the addon's relative native-binary path and prevented the API server from starting; skipping the native package build also left the binary absent.

**How to apply:** If this workspace keeps WebTorrent, preserve its targeted `onlyBuiltDependencies` entry and the API build's WebTorrent externalization. Reassess both if the torrent library changes.
