# FamilyFlix project notes

- This app is part of the Replit pnpm workspace at `artifacts/familyflix`; use the root workspace package manager and the existing managed workflow.
- Keep the current Next.js App Router, Better Auth, Drizzle/PostgreSQL, Cloudflare Stream, and MP4/HLS integrations intact unless a task explicitly changes them.
- The app is served under `/familyflix`; use Next.js `Link` for internal navigation and the base-path helper for browser `fetch`, iframe, and public-asset URLs.
- Do not treat a user attestation or the platform's Creative Commons policy as proof of third-party rights. New media stays unavailable until reviewed and approved.
- Do not run database changes against production. Generate and verify schema changes in development; production schema changes happen only after the user reviews the impact and approves publication.
- Do not add or expose real environment secrets. Use the Replit secrets flow for credentials.
