# Deploying game.agi.eth to Vercel

The repository is a pnpm monorepo. Vercel hosts the **frontend only**
(`packages/game-client`, a static Vite build). The Emperor backend is a
long-running Express server that holds secrets, writes files, and runs agents —
it does **not** run on Vercel and must be hosted separately (see "Backend").

## 1. Import the project

1. In Vercel: **Add New… → Project**, import the `clawdtesting/Leaf` repo.
2. **Root Directory:** set to `game.agi.eth`.
   This is the pnpm workspace root (it holds `pnpm-workspace.yaml` and
   `pnpm-lock.yaml`). `vercel.json` there pins the rest:
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm --filter game-client build`
   - Output: `packages/game-client/dist`
   - Framework: `vite`
3. Leave Build/Output/Install command overrides empty — `vercel.json` provides them.

## 2. Environment variables (Project → Settings → Environment Variables)

These are **build-time** (Vite inlines them), so add them before the first build
and redeploy after any change. Every `VITE_*` value ships in the public bundle —
only expose browser-safe values here.

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_MANCER_CONTRACT_ADDRESS` | yes | Mancer NFT contract on Robinhood Chain. |
| `VITE_ROBINHOOD_RPC_URL` | yes | Alchemy Robinhood RPC. Use a **domain-restricted** key. |
| `VITE_API_BASE` | for backend features | Deployed backend origin, e.g. `https://api.example.com`. If unset it falls back to `http://localhost:3001`, which won't exist in production — explore + character selection still work (Alchemy path is client-side), but auth/missions/evidence need this set. |
| `VITE_MANCER_MAX_ID` | no | On-chain fallback scan ceiling (default 20000). |

Do **not** put `PINATA_JWT`, `OPENSEA_KEY`, or any signing key here — those are
backend-only secrets.

## 3. Deploy

Push to the production branch (or click Deploy). Vercel builds the static site and
serves `packages/game-client/dist`.

## What works without a backend

The static frontend alone supports: exploring the world, wallet connect, Mancer
ownership check, and the character-selection card — because Mancer enumeration
uses the client-side Alchemy NFT API and on-chain reads. Features that call the
backend (SIWE auth, mission intake, jobs/Evidence Vault, ENS mint) require
`VITE_API_BASE` pointing at a running backend.

## Backend on Render (free)

`packages/emperor-backend` is Express + `ts-node`, uses in-memory nonces and a
file-backed `missions.json`, and can spawn agent work — none of which suit
Vercel's serverless model. It runs as a persistent Node process. A free Render
Blueprint is committed at the repo root: **`render.yaml`**.

**Free-tier caveats:** the service sleeps after ~15 min idle (~50s cold start on
the next request) and the filesystem is ephemeral, so `missions.json` resets on
restart/redeploy. Fine for a demo; move off free once missions must persist.

### Deploy

1. Render → **New → Blueprint**, pick the `clawdtesting/Leaf` repo. It reads
   `render.yaml` (rootDir `game.agi.eth`, build
   `pnpm --filter emperor-backend build`, start `pnpm --filter emperor-backend start`,
   health check `/protocol/status`).
2. Fill in the environment variables Render prompts for (all `sync: false`):
   - `ALLOWED_ORIGINS` = your Vercel URL, e.g. `https://your-app.vercel.app`
     (comma-separate multiple; this locks CORS to your site).
   - `ETH_RPC_URL`, `CHAIN_ID`, `PINATA_JWT`, `OPENSEA_KEY`,
     `OPENSEA_COLLECTION`/`OPENSEA_CHAIN`, `OPERATOR_ADDRESS` as needed.
3. Deploy. Render gives you a URL like `https://emperor-backend.onrender.com`.

### Wire the frontend to it

In Vercel, set `VITE_API_BASE` to the Render URL and redeploy the frontend
(Vite inlines it at build time). The mission pipeline, auth, jobs/Evidence Vault,
and ENS mint then work end-to-end.

### CORS

The backend reads `ALLOWED_ORIGINS`: unset = allow any origin (dev); set = only
those exact origins are allowed (production). See `packages/emperor-backend/.env.example`.
