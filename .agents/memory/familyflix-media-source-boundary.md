---
name: FamilyFlix media-source boundary
description: Keep legacy static video URLs out of browser bundles.
---

The legacy FamilyFlix catalog contains direct media URLs alongside title metadata. Importing its runtime module into the Vite client can ship those URLs to every visitor, even when the player is supposed to be rights-gated.

**Why:** A visual restoration initially pulled the legacy catalog into the browser bundle, exposing archive media URLs outside the approval and playback checks.

**How to apply:** Keep client-side title types in a URL-free module. Public browse and playback should use the rights-reviewed API; never import the runtime legacy catalog into a public client component.
