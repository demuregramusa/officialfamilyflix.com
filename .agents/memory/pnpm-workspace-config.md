---
name: pnpm workspace configuration rewrites
description: Preserve repository-level package age and platform override policy during dependency changes.
---

In this workspace, a package add/remove command can rewrite `pnpm-workspace.yaml`, normalize platform override keys, and change the lockfile's catalog specifier even when those changes were not intended. The rewrite can remove the configured minimum package release age.

**Why:** An attempted temporary tooling dependency changed the workspace configuration and weakened its package-age guard; the original configuration had to be restored manually.

**How to apply:** After any pnpm dependency change, inspect `git diff` for `pnpm-workspace.yaml` and `pnpm-lock.yaml`. Preserve the original security settings and unrelated catalog/override values; do not accept a broad workspace-file rewrite as routine.
