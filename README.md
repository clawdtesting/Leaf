# game.agi.eth

A Zelda-inspired pixel world that is a spatial interface to an autonomous AI
machine economy. Walk the world, connect a wallet, play as a Mancer NFT you own,
enter buildings, and dispatch real background work (research, contract dev,
audits) that returns evidenced results.

- **Frontend** — `game.agi.eth/packages/game-client` (Vite + React + Phaser, static site).
- **Backend** — `game.agi.eth/packages/emperor-backend` (Express; the "Emperor"
  policy/routing layer that holds secrets and runs the mission pipeline).

This is a **pnpm monorepo**; the workspace root is `game.agi.eth/`.

---

## Deploy — do it in this order

You'll deploy the **frontend to Vercel** first (free), then the **backend to
Render** (free), then connect them. Total time ~15 minutes.

### Step 1 — Push is already done

Everything is on the `main` branch of `clawdtesting/Leaf`. Vercel and Render both
deploy straight from GitHub, so there's nothing to upload manually.

### Step 2 — Deploy the frontend to Vercel (free)

1. Go to **vercel.com** → sign in with GitHub → **Add New… → Project**.
2. Import the **`clawdtesting/Leaf`** repository.
3. **Root Directory:** click *Edit* and set it to **`game.agi.eth`**.
   (Leave Build/Output/Install commands empty — `game.agi.eth/vercel.json`
   already defines them.)
4. Open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `VITE_MANCER_CONTRACT_ADDRESS` | `0x797a2e030b7e49107c8f07bf0300ea9cae88ca57` |
   | `VITE_ROBINHOOD_RPC_URL` | your Alchemy Robinhood RPC URL (use a domain-restricted key) |
   | `VITE_API_BASE` | *(leave blank for now — you'll fill it in Step 4)* |

5. Click **Deploy**. When it finishes you get a URL like
   **`https://your-app.vercel.app`** — copy it.

At this point the game is live and playable: exploring, wallet connect, Mancer
check, and character selection all work with **no backend** (they run in the
browser). Missions/auth/Evidence Vault come alive after Step 4.

### Step 3 — Deploy the backend to Render (free)

1. Go to **render.com** → sign in with GitHub → **New → Blueprint**.
2. Pick the **`clawdtesting/Leaf`** repository. Render reads **`render.yaml`**
   automatically (build/start commands, health check — all preconfigured).
3. Render will prompt for the environment variables. Set at least:

   | Name | Value |
   |------|-------|
   | `ALLOWED_ORIGINS` | your Vercel URL from Step 2, e.g. `https://your-app.vercel.app` |
   | `ETH_RPC_URL` | your Ethereum/Robinhood RPC URL (for on-chain reads) |
   | `PINATA_JWT` | your Pinata JWT (for IPFS evidence publishing) |
   | `OPENSEA_KEY` | your OpenSea API key (optional, speeds up Mancer loading) |
   | `OPENSEA_COLLECTION` | `chain-mancers` |

   Leave the others blank unless you need them.
4. Click **Apply / Create**. Render builds and gives you a URL like
   **`https://emperor-backend.onrender.com`** — copy it.

### Step 4 — Connect frontend → backend

1. Back in **Vercel** → your project → **Settings → Environment Variables**.
2. Set **`VITE_API_BASE`** to your Render URL from Step 3
   (e.g. `https://emperor-backend.onrender.com`).
3. Go to **Deployments → ⋯ → Redeploy** (env vars are baked in at build time, so
   a redeploy is required).

Done — the full pipeline (auth, mission intake, jobs, Evidence Vault, ENS mint)
now works end-to-end.

---

## Good to know

- **Render free tier sleeps** after ~15 min of inactivity; the first request
  after that waits ~50 seconds while it wakes up. Normal — not a bug.
- **Render free filesystem is ephemeral**, so `missions.json` resets on restart
  or redeploy. Fine for a demo; add a Render Disk or a database when missions
  must persist.
- **`VITE_*` values ship in the browser bundle.** Only put browser-safe values
  there (a read-only, domain-restricted RPC key is fine). Secrets like
  `PINATA_JWT` and `OPENSEA_KEY` go **only** on the backend (Render).
- Changing any `VITE_*` value requires a **Vercel redeploy** to take effect.

---

## Run it locally

Requires Node 20+ and pnpm.

```bash
cd game.agi.eth
pnpm install

# Frontend env: copy and fill in
cp packages/game-client/.env.example packages/game-client/.env
# Backend env: copy and fill in
cp packages/emperor-backend/.env.example .env

# Terminal 1 — backend on :3001
pnpm --filter emperor-backend dev
# Terminal 2 — frontend on :5173
pnpm --filter game-client dev
```

Open the printed localhost URL. With `VITE_API_BASE` unset, the frontend talks to
the local backend on `http://localhost:3001` automatically.

---

## More docs

- Deployment details & backend hosting notes: `game.agi.eth/docs/DEPLOY_VERCEL.md`
- Product vision: `game.agi.eth/docs/GAME_AGI_CONCEPT.md`
- Architecture: `game.agi.eth/docs/ARCHITECTURE.md`
