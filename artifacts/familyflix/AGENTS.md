# FamilyFlix project notes

- This app is part of the Replit pnpm workspace at `artifacts/familyflix`; use the root workspace package manager and the existing managed workflow.
- The active app is React 19 + Vite with Wouter, React Query, Better Auth, and the workspace API/Drizzle packages. The preserved Next.js source is reference material and is not served by the active workflow.
- The app is served under `/familyflix`; use Wouter for internal navigation and `import.meta.env.BASE_URL` for browser-facing paths.
- DemureGram is the public platform brand; FamilyFlix is its film and television catalog.
- Never use torrent or magnet sources, and never classify content as Creative Commons or public domain without rights evidence. Every media asset needs its own rights record, admin review, and explicit publication; uploader statements are not proof.
- Keep copyright, privacy, and terms copy marked as draft until reviewed by counsel. Do not invent legal contacts, agent details, rights ownership, or production URLs.
- Do not run database changes against production. Generate and verify additive schema changes in development; production schema changes happen through the user-reviewed Publish flow.
- Do not add or expose real environment secrets. Use the Replit secrets flow for credentials.
