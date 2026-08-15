# game.agi.eth — Technical Architecture

## 1. Purpose

game.agi.eth is a Zelda-inspired pixel world serving as a spatial interface
to a real background processing engine.

The game client must remain separated from privileged Montréal.AI execution.

Core boundary:

PLAYER
  ↓
GAME CLIENT
  ↓
GAME BACKEND / INTENT API
  ↓
POLICY + AUTHORIZATION
  ↓
EMPEROR OPERATOR
  ↓
GoalOS / AGIJobManager / Agents / Tools
  ↓
Evidence + Validation
  ↓
RESULT
  ↓
GAME WORLD

---

## 2. Identity Model

### Sovereign operator

emperor.club.agi.eth

This is the privileged operator identity with access to the Montréal.AI
ecosystem.

Players MUST NOT inherit or directly access Emperor privileges.

### Game identity

game.agi.eth

The game is an application/interface operated through Emperor.

### Player identity

A player initially connects through an Ethereum wallet.

If the wallet owns a supported Mancer NFT, the user can select that Mancer
as their playable avatar.

Future identity:

name.game.agi.eth

Possible uses:

- persistent reputation
- guild membership
- mission history
- economic permissions
- operator status
- validation roles
- agent/capability associations

---

## 3. Leaf

Leaf is the primary NPC and narrative interface to the system.

Leaf is NOT the privileged backend itself.

Leaf visually represents communication between the game world and the
background processing engine.

Examples:

AGIJobManager job created
→ Leaf says work has been sent beyond the village.

Evidence validated
→ Leaf says the proof holds.

NovaSeed capability created
→ Nova Garden reacts.

---

## 4. System Layers

### Layer A — Pixel World

Responsibilities:

- rendering
- movement
- combat
- exploration
- NPC interactions
- inventory
- quests
- world state
- Mancer avatars
- buildings/guilds
- Fate Machine UI

This layer must not contain privileged Montréal.AI credentials.

### Layer B — Game Intent Layer

Transforms game actions into structured requests.

Example:

{
  "type": "ECOSYSTEM_RESEARCH",
  "ecosystem": "Robinhood Chain",
  "objective": "Find 10 projects with demonstrated real utility",
  "limit": 10
}

Responsibilities:

- schema validation
- input normalization
- rate limiting
- permissions
- budget classification
- anti-prompt-injection boundary

Never forward unrestricted player text directly to privileged execution.

### Layer C — Emperor Operator

Identity:

emperor.club.agi.eth

Responsibilities:

- accept structured intents
- decide whether work is necessary
- choose execution path
- enforce policy
- control budget
- maintain privileged credentials
- call GoalOS
- create AGIJobManager jobs when necessary
- collect results
- verify execution state
- return normalized results to game.agi.eth

Decision hierarchy:

Request
  ↓
Can resolve from game state/cache?
  → yes: resolve locally

Requires simple agent/tool work?
  → execute locally

Requires complex planning?
  → GoalOS

Requires economically meaningful external work?
  → AGIJobManager

### Layer D — GoalOS

GoalOS is the goal/mission planning layer.

Responsibilities:

- objective constitution
- mission decomposition
- dependency graph
- capability selection
- evidence requirements
- acceptance criteria
- authority boundaries
- stop conditions

GoalOS should not be exposed directly as game UX.

### Layer E — AGIJobManager

Used for real economically meaningful jobs.

Examples:

- ecosystem research
- smart-contract implementation
- smart-contract auditing
- software engineering
- UI/application development
- independent validation

Initial rule:

Only Emperor posts AGIJobManager jobs.

Players may eventually request/fund jobs, but requests still pass through
the Emperor policy boundary.

### Layer F — Evidence / Validation

A successful result is not merely an LLM answer.

Required conceptual chain:

Objective
→ Execution
→ Raw Result
→ Evidence
→ Validation
→ Acceptance
→ Settlement
→ Capability Decision

Game representation:

Quest Record / View Proof

### Layer G — Chronicle

Stores proven reusable capabilities and their boundaries.

A capability should include:

- scope
- version
- successful missions
- known failures
- evidence
- model/tool versions
- expiry
- revocation
- successor information

### Layer H — NovaSeed / RSI

Triggered when current capabilities are insufficient.

Capability Gap
  ↓
Candidate approaches
  ↓
Evaluation
  ↓
Evidence
  ↓
Fresh mission test
  ↓
Promote or reject

No candidate becomes the new capability simply because it looks better.

Fresh-work improvement is required.

---

## 5. World-to-System Mapping

| World | System |
|---|---|
| Leaf | Human-facing system guide |
| Leaf's Keep | Emperor control plane |
| Explorer Guild | Research capability |
| Forge | Engineering / Solidity |
| Auditor Tower | Security / verification |
| Architect Hall | UI / full-stack building |
| Observatory | Frontier monitoring |
| Evidence Vault | Evidence layer |
| Hall of Judgment | Validation |
| Chronicle | Proven capability memory |
| Nova Garden | NovaSeed / capability evolution |
| Fate Machine | DERP-inspired randomness |
| Quest | Mission / job |
| Quest Record | Evidence record |
| Mancer | Player avatar |
| $GAME | Native game-world asset |

---

## 6. DERP-Inspired Random Machine

We do NOT use $DERP.

We are interested in the StonkPit/DERP proof-of-work random mechanism.

Potential architecture:

challenge
+
player/world state
+
bounded browser computation
→ valid proof
→ hash
→ deterministic entropy

Game uses:

- dungeon generation
- fishing
- mining
- rare crafting
- monster mutations
- world discoveries

Real-work uses:

- random audit sampling
- validator selection
- randomized evaluation sets
- NovaSeed tests
- fair allocation

The PoW system must not create a pay-more/get-more hardware race.

---

## 7. $GAME

$GAME is the potential native asset of game.agi.eth.

It is NOT a replacement for real settlement currencies.

Separate:

GAME ECONOMY
→ $GAME

REAL WORK ECONOMY
→ ETH / USDC / AGIJobManager settlement

Possible $GAME utilities are TBD and must not be invented prematurely.

---

## 8. Onchain / Offchain Boundary

### Offchain

- movement
- rendering
- combat
- normal NPC interaction
- ordinary inventory
- local world physics
- most game state

### Potentially Onchain

- ENS identities
- Mancer ownership
- economically significant ownership
- AGI jobs
- settlements
- meaningful proofs
- high-value reputation
- major discoveries
- important world commitments

Rule:

Use blockchain only where ownership, trust, settlement or provenance matters.

---

## 9. Initial Vertical Slice

V0 should contain:

- wallet connection
- Mancer detection
- selectable Mancer avatar
- Leaf
- Zelda-style movement
- small village
- Explorer Guild
- Forge
- Auditor Tower
- locked Nova Garden
- one real research mission
- one evidence/result view

Primary proof:

A player action inside the pixel world launches real background work and
returns a useful, evidenced result.

Example mission:

"Find 10 Robinhood Chain projects with demonstrated real utility."

---

## 10. Architectural Non-Negotiables

1. Never expose Emperor privileged credentials to the client.
2. Never let arbitrary player text directly control privileged agents.
3. Not every game action becomes an AGIJobManager job.
4. Not every Montréal.AI concept needs a visible game mechanic.
5. The game must remain usable while background jobs execute.
6. Agent output is not automatically truth.
7. Evidence and acceptance are distinct from execution.
8. New capabilities require fresh-work validation before promotion.
9. $DERP is not part of the game economy.
10. TickerYard is out of scope.
11. Mancer protocol is not currently a core dependency.
12. $GAME is the only contemplated native game asset.
