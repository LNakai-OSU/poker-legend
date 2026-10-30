# Account server

A ~100-line Cloudflare Worker (free tier is plenty) that stores each account's
password hash and save. The game works without it — saves then stay on the
device — and turns on name + password accounts when `VITE_SYNC_URL` is set.

1. `cd server && npx wrangler kv namespace create SAVES`; paste the id into `wrangler.toml`.
2. Optionally set `ALLOWED_ORIGINS` to your game's origin (e.g. `https://lnakai-osu.github.io`).
3. `npx wrangler deploy` — it prints the worker URL.
4. In GitHub: Settings → Secrets and variables → Actions → Variables → add `VITE_SYNC_URL` = that URL, then re-run the Pages deploy. For local dev put `VITE_SYNC_URL=...` in `.env.local`.

Saves are opaque JSON; a newer build of the game reads an older save by merging
it over fresh state (`reconcile` in `src/game/save.ts`), so updating the game
never needs a server change.
