---
name: Next.js package access
description: Replit package proxy behavior observed while importing a Next.js app
---

Next.js tarball installs for 16.3.3 and 16.2.0 returned HTTP 403 from the Replit package proxy, even though `pnpm view` could resolve those versions. The package directory was not available locally.

**Why:** Installing from an alternate registry would bypass the workspace's package access controls, and moving a full application to another framework risks breaking authentication, database, importer, and playback behavior.

**How to apply:** If another FamilyFlix source archive requires Next.js, verify package access first. Keep the supplied source intact when blocked, and get approval before proposing a Vite/Express port.
