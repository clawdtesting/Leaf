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

## Backend (hosted separately)

`packages/emperor-backend` is Express + `ts-node`, uses in-memory nonces and a
file-backed `missions.json`, and can spawn agent work — none of which suit
Vercel's serverless model. Host it on a platform that runs a persistent Node
process (Render, Railway, Fly.io, or a VM):

- Build: `pnpm --filter emperor-backend build`
- Start: `pnpm --filter emperor-backend start` (serves on `PORT`, default 3001)
- Set backend secrets there: `ETH_RPC_URL`, `PINATA_JWT`, `OPENSEA_KEY`,
  `OPENSEA_COLLECTION`/`OPENSEA_CHAIN`, `OPERATOR_ADDRESS`, etc.
- Enable CORS for the Vercel domain (the dev server currently allows `*`).
- Point the frontend at it via `VITE_API_BASE`.
