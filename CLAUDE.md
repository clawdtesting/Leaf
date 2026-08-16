# game.agi.eth

## Mission

game.agi.eth is a Zelda-1-inspired persistent pixel world that acts as a spatial interface to a real autonomous background-processing economy.

The game UI is not the core product. The core is useful real-world work executed through agents, GoalOS, AGIJobManager, evidence/validation, and capability improvement.

## Canonical project context

Read these before making architecture or product decisions:

- @docs/GAME_AGI_CONCEPT.md
- @docs/MONTREALAI_CONTEXT.md
- @docs/ARCHITECTURE.md
- @docs/REFERENCES.md

## Critical project rules

- Leaf is the main NPC.
- A connected user may use an owned Mancer NFT as their playable character.
- emperor.club.agi.eth is initially the privileged operator into the Montréal.AI ecosystem.
- Ordinary game users do NOT directly inherit Emperor privileges.
- Users do not initially post directly to AGIJobManager.
- Emperor receives structured game intents and decides whether GoalOS / AGIJobManager / other capabilities are required.
- Real jobs should be valuable tasks such as ecosystem research, Solidity development, contract verification/auditing, and UI/application creation.
- DERP/StonkPit is relevant for its browser PoW/random-machine mechanism, NOT the $DERP token.
- If the project has a native asset, it is $GAME.
- $GAME is the game-world asset; real professional settlement may use ETH/USDC.
- TickerYard is out of scope for now.
- Mancer protocol itself is not a core dependency for now.
- Do not turn every Montréal.AI concept into a visible game mechanic.
- The pixel world is the UX; GoalOS/AGIJobManager/evidence/NovaSeed/etc. are mostly background infrastructure.

## Product principle

Every major feature should make either:
1. the world more enjoyable, or
2. the machine more useful.

The strongest features do both.

## North star

If the pixel graphics were removed, the underlying system should still produce genuinely useful work.

If the machine infrastructure were removed, the world should still be enjoyable to explore.