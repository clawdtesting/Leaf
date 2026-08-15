# game.agi.eth

## A Pixel World Operating a Real Machine Economy

**game.agi.eth** is a persistent, Zelda-inspired pixel world whose visible gameplay is the human interface to a much deeper system: an autonomous background-processing engine designed to perform **real, useful, economically valuable work**.

The project should feel immediately understandable:

> Walk around. Explore. Meet Leaf. Enter buildings. Discover things. Use your Mancer. Complete missions. Build your identity.

But underneath that simple world:

> Goals are interpreted, decomposed, routed to agents, executed, evidenced, validated, settled, learned from and potentially converted into stronger reusable capabilities.

The game is therefore not the ultimate product.

**The world is the interface.
The machine economy is the product.**

---

# 1. The Core Thesis

Most games create an artificial economy whose primary output is more game activity.

A player:

```text
plays
↓
earns resources
↓
buys upgrades
↓
plays more
```

That can be fun, but the economic loop is mostly closed.

`game.agi.eth` introduces an external source of value:

```text
REAL-WORLD OBJECTIVE
        ↓
useful computation / intelligence / engineering
        ↓
VERIFIABLE RESULT
        ↓
REAL ECONOMIC VALUE
```

The game becomes an interface through which humans can interact with this productive system.

The long-term loop becomes:

```text
PLAY
↓
OPERATE CAPABILITIES
↓
PERFORM REAL WORK
↓
PROVE RESULTS
↓
GENERATE VALUE
↓
IMPROVE CAPABILITIES
↓
EXPAND THE WORLD
↓
HANDLE HARDER WORK
```

This is fundamentally different from:

```text
Play-to-Earn
```

The intended model is closer to:

```text
Play-to-Operate
Play-to-Discover
Play-to-Build
Play-to-Coordinate
Play-to-Produce
```

---

# 2. The Project in One Sentence

> **game.agi.eth is a Zelda-like persistent pixel world that acts as a spatial interface to an autonomous AI machine economy performing real work in the background.**

A more technical definition:

> `game.agi.eth` transforms goals into bounded missions, coordinates AI capabilities through the Montréal.AI ecosystem, produces proof-carrying results, and represents that activity as an explorable multiplayer pixel world.

---

# 3. What the Project Is NOT

This distinction needs to remain extremely clear.

`game.agi.eth` is **not**:

* an NFT game with AI features added afterward;
* a Zelda clone;
* a `$GAME` farming application;
* a play-to-earn economy;
* a generic freelancer marketplace;
* a chatbot hidden behind pixel graphics;
* a game that gives arbitrary LLMs direct control of assets;
* an AGIJobManager frontend with Zelda graphics;
* a Mancer protocol application;
* a `$DERP` application.

Those technologies and assets may participate in the system, but none of them individually define the product.

The architecture is:

```text
PIXEL WORLD
        +
REAL GOALS
        +
AUTONOMOUS AGENTS
        +
VERIFIABLE WORK
        +
PROOF / EVIDENCE
        +
ECONOMIC SETTLEMENT
        +
CAPABILITY IMPROVEMENT
```

---

# 4. The Surface: A First-Zelda-Style World

Visually, the game should initially resemble the simplicity and readability of early top-down Zelda.

Characteristics:

* top-down pixel world;
* tile-based environments;
* small villages;
* forests;
* lakes;
* mountains;
* caves;
* ruins;
* hidden passages;
* shops;
* guild buildings;
* NPCs;
* simple action combat;
* inventory;
* resources;
* crafting;
* exploration;
* secrets;
* world events;
* persistent discoveries.

The visual language should remain approachable.

The player should be able to enter `game.agi.eth` without understanding:

* GoalOS;
* AGIJobManager;
* Evidence Dockets;
* AGI Alpha;
* NovaSeed;
* RSI;
* proof systems;
* smart contracts;
* autonomous agents.

Those systems exist **underneath the world**.

---

# 5. Leaf — The Main NPC

Leaf is the principal NPC and iconic character of `game.agi.eth`.

Leaf is based on the Mancer NFT you own.

Leaf is not simply:

> “the tutorial NPC.”

He is the visible representative of the deeper machine.

Conceptually:

```text
LEAF
│
├── world guide
├── mission guide
├── keeper of knowledge
├── keeper of the Machine
├── liaison to Emperor
├── interpreter of proof/results
└── narrative anchor
```

The player should gradually understand that Leaf knows considerably more about how the world operates than ordinary NPCs.

---

# 6. Leaf's Narrative Role

Leaf translates technical infrastructure into understandable game language.

Backend:

```text
GoalOS produced a mission graph.
```

Leaf:

> “The objective is larger than it first appeared. Several paths must be explored.”

Backend:

```text
AGIJobManager job submitted.
```

Leaf:

> “The work has been sent beyond the village.”

Backend:

```text
Independent validator passed the result.
```

Leaf:

> “The proof holds.”

Backend:

```text
NovaSeed produced a new capability.
```

Leaf:

> “Something new has grown in the Garden.”

Backend:

```text
Successor test failed.
```

Leaf:

> “The new path looked stronger, but it could not survive another trial.”

That is how we avoid exposing infrastructure jargon unnecessarily.

---

# 7. Player Identity — Mancer NFTs

A connected user can use a Mancer NFT they own as their playable character.

Initial flow:

```text
CONNECT WALLET
      ↓
DETECT OWNED MANCERS
      ↓
SELECT CHARACTER
      ↓
LOAD PIXEL REPRESENTATION
      ↓
ENTER WORLD
```

This creates a strong connection between:

```text
wallet identity
+
NFT identity
+
game identity
```

Leaf remains the main NPC.

The user's own Mancer becomes **their operator/avatar inside the world**.

Later, users without Mancers can receive a default character so Mancer ownership does not have to become a permanent hard requirement.

---

# 8. Mancer's Place in the Architecture

Mancer should initially be considered primarily an **identity / visual IP layer**.

Relevant:

```text
Mancer NFT
→ character identity
→ visual identity
→ player avatar
→ Leaf
```

Not necessarily relevant yet:

```text
Mancer DEX protocol
Mancer keeper system
Mancer settlement architecture
```

Those could become interesting later, but they should not distort the initial architecture.

---

# 9. The Hidden Core: Background Processing Engine

The central technological product is the background engine.

The game sends **intent** into it.

The engine determines how that intent becomes useful work.

High-level pipeline:

```text
PLAYER / WORLD INTENT
        ↓
GAME INTENT LAYER
        ↓
POLICY ENGINE
        ↓
EMPEROR AGENT
        ↓
GOALOS
        ↓
CAPABILITY / JOB ROUTING
        ↓
AGENTS / TOOLS
        ↓
EVIDENCE
        ↓
VALIDATION
        ↓
ACCEPTANCE
        ↓
SETTLEMENT
        ↓
CAPABILITY MEMORY
        ↓
GAME CONSEQUENCE
```

That is the heart of `game.agi.eth`.

---

# 10. emperor.club.agi.eth

`emperor.club.agi.eth` is initially the **privileged sovereign operator**.

This is a critical architectural choice.

The ordinary `game.agi.eth` user is **not initially posting directly to AGIJobManager**.

Instead:

```text
USER
 ↓
game.agi.eth
 ↓
Emperor
 ↓
Montréal.AI ecosystem
```

Your Emperor agent receives structured input generated through the game and determines what action should actually occur.

---

# 11. Why Emperor Must Sit in the Middle

This gives the architecture:

### Security

Players do not inherit privileged Montréal.AI access.

### Budget control

The system determines whether external work is worth paying for.

### Policy

Users cannot arbitrarily command privileged agents.

### Quality

Requests can be normalized before they become jobs.

### Routing

The system chooses which infrastructure is appropriate.

### Memory

Previous successful approaches can be reused.

### Governance

High-impact actions can require additional validation.

---

# 12. Trust Boundary

The architecture should explicitly separate:

```text
UNTRUSTED
Player input
        ↓
Game UI
        ↓
Game API
        ↓
Intent normalization
        ↓
Policy / authorization
─────────────────────────
PRIVILEGED
        ↓
Emperor Agent
        ↓
GoalOS
        ↓
AGIJobManager
        ↓
external systems
```

Never:

```text
player text
   ↓
privileged agent
   ↓
wallet / contract / money
```

That would create major prompt-injection and authority problems.

---

# 13. Structured Intent

Player input should eventually be transformed into bounded actions.

Instead of sending:

```text
"Find me something cool and then spend whatever you need."
```

Emperor receives something like:

```json
{
  "action": "ECOSYSTEM_RESEARCH",
  "ecosystem": "Robinhood Chain",
  "objective": "Identify projects with genuine utility",
  "candidateLimit": 10,
  "requiredEvidence": [
    "repository",
    "product",
    "contracts",
    "documentation"
  ],
  "budgetClass": "research-small"
}
```

This creates:

* reproducibility;
* policy enforcement;
* cost controls;
* predictable workflows;
* evidence requirements.

---

# 14. GoalOS — The Mission Intelligence Layer

GoalOS should act as the **goal-planning and mission-construction layer**.

The player might express:

> Find 10 projects with real value on Robinhood Chain.

That sounds simple.

GoalOS can translate it into something like:

```text
OBJECTIVE
Identify 10 Robinhood Chain projects with genuine value
│
├── discover candidate universe
│
├── verify project existence
│
├── inspect official documentation
│
├── inspect deployed contracts
│
├── inspect repositories
│
├── determine product utility
│
├── detect obvious low-quality projects
│
├── collect evidence
│
├── establish scoring criteria
│
├── compare candidates
│
└── produce ranked conclusion
```

GoalOS asks:

```text
What exactly is the goal?
What evidence would prove success?
Which capabilities are required?
Which tasks depend on one another?
Which can run concurrently?
Which actions have authority?
What are the stop conditions?
What is the budget?
What should be independently validated?
```

---

# 15. Mission Foundry → Quests

A powerful conceptual mapping is:

```text
GoalOS Mission
=
Game Quest
```

But there are two views.

### Game View

```text
EXPLORER'S GUILD

MISSION:
Survey the Robinhood Frontier

Objective:
Find ten settlements that appear
to create real economic value.

Status:
IN PROGRESS
```

### Technical View

```text
Mission ID: RH-00031
Principal: emperor.club.agi.eth
Objective: identify 10 high-value Robinhood Chain projects
Budget: ...
Required evidence: ...
Acceptance criteria: ...
Execution graph: ...
```

Both describe the same underlying work.

---

# 16. AGIJobManager — Work and Settlement Layer

AGIJobManager enters when Emperor determines that a mission requires real economically meaningful external work.

Conceptually:

```text
Goal
 ↓
GoalOS
 ↓
bounded job
 ↓
AGIJobManager
 ↓
worker / agent
 ↓
deliverable
 ↓
proof
 ↓
validation
 ↓
settlement
```

Not every game action should touch AGIJobManager.

AGIJobManager should be reserved for real jobs.

Examples:

* serious research;
* smart-contract creation;
* smart-contract auditing;
* software implementation;
* engineering tasks;
* UI/frontend building;
* structured validation;
* other valuable agent work.

---

# 17. Example: Research Mission

User requests:

> Find 10 Robinhood Chain projects with actual utility.

Behind the game:

```text
REQUEST
↓
Emperor
↓
GoalOS
↓
candidate discovery
↓
source retrieval
↓
repo inspection
↓
contract inspection
↓
product evaluation
↓
evidence collection
↓
comparative scoring
↓
validation
↓
final report
```

Player sees:

```text
Explorer's Guild
─────────────────
Survey underway...

Scouts dispatched: 4
Candidates discovered: 37
Candidates verified: 16
Final targets: 10

Evidence:
████████░░
```

The animation represents real processing.

---

# 18. Example: Smart Contract Creation

Player enters:

## The Forge

Objective:

> Create a settlement contract with signed offers and a 1% fee.

Real workflow:

```text
requirements
↓
threat model
↓
architecture
↓
Solidity implementation
↓
Foundry tests
↓
static analysis
↓
independent audit
↓
documentation
↓
deliverable
```

Game representation:

```text
THE FORGE

Blueprint received.
Materials assembled.
Smithing...
Testing...
Tempering...
Inspection...

Artifact completed.
```

The “artifact” is actual software.

---

# 19. Example: Smart Contract Audit

Player enters:

## Auditor's Tower

Supplies:

```text
chain
contract address
scope
```

Backend:

```text
retrieve source
↓
architecture analysis
↓
static analysis
↓
manual agent reasoning
↓
attack hypothesis generation
↓
Foundry reproduction
↓
independent review
↓
severity classification
↓
report
```

The game can visualize the smart contract as a dungeon without pretending the dungeon itself is the audit.

Rooms could correspond conceptually to contract modules.

Corruption represents suspicious behavior.

But the real output remains:

```text
SECURITY REPORT
+
TESTS
+
EVIDENCE
```

---

# 20. Example: UI Creation

Player visits:

## Architect Hall

Objective:

> Improve this project's UI.

Background:

```text
clone / inspect repository
↓
run existing application
↓
analyze UX
↓
identify design weaknesses
↓
propose direction
↓
implement
↓
build
↓
visual inspection
↓
iterate
↓
tests
↓
PR / deliverable
```

Inside the world:

Builders work on a structure.

When implementation completes, the building physically changes.

---

# 21. The World as an Architecture Diagram

This is one of the strongest parts of the entire project.

Locations represent capabilities.

Initial example:

```text
                         NOVA GARDEN
                              │
                              │
                              │
 EXPLORER'S GUILD ────── LEAF'S KEEP ────── AUDITOR'S TOWER
                              │
                              │
                              │
                           THE FORGE
```

Eventually:

```text
                            OBSERVATORY
                                │
                           NOVA GARDEN
                                │
                                │
EXPLORER ─── CHRONICLE ─── LEAF'S KEEP ─── HALL OF JUDGMENT
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
            FORGE                           ARCHITECT HALL
              │                                   │
              └────────── EVIDENCE VAULT ─────────┘
```

The world becomes a spatial representation of machine capabilities.

---

# 22. Buildings Represent Capabilities — Not Owned Fantasy Agents

This is an important refinement.

We do **not** initially need:

```text
Player owns Scout
Player owns Smith
Player owns Auditor
```

Instead:

```text
Explorer's Guild
=
research capability

Forge
=
software capability

Auditor Tower
=
security capability

Architect Hall
=
UI / application capability

Nova Garden
=
capability discovery/improvement
```

The actual models/agents remain underneath.

This is substantially cleaner.

---

# 23. Future Agent Ownership

Later, users might operate their own specialized agent stacks.

Example:

```text
simon.game.agi.eth

AUTHORIZED CAPABILITIES

Research
★★★★★

Solidity
★★★★☆

Security
★★★☆☆

UI
★★★★☆
```

But capability ownership should represent something real:

* reputation;
* qualification;
* access;
* specialized workflows;
* proven agents;
* verified execution history.

Not arbitrary RPG statistics.

---

# 24. Evidence Is Fundamental

The system's goal is not simply:

```text
AI generated answer
```

It is:

```text
OBJECTIVE
↓
EXECUTION
↓
RESULT
↓
EVIDENCE
↓
VALIDATION
↓
ACCEPTANCE
```

The distinction is critical.

A research report without sources is weaker.

A smart contract without tests is weaker.

An audit without reproducible evidence is weaker.

A capability improvement without a fresh evaluation is weaker.

---

# 25. Proof-Carrying Missions

Each consequential mission should eventually have a structured record.

Conceptually:

```text
MISSION
│
├── objective
├── principal
├── actor
├── permissions
├── initial state
├── tools
├── costs
├── execution
├── raw output
├── tests
├── evidence
├── independent validation
├── acceptance
├── settlement
├── failure information
├── rollback information
└── capability disposition
```

Inside the game this becomes:

## Quest Record

Example:

```text
QUEST RECORD #1842

Survey the Robinhood Frontier

Operator:
emperor.club.agi.eth

Execution:
Complete

Evidence:
18 verified sources

Independent Review:
PASS

Result:
10 qualifying projects

Settlement:
Complete

Capability:
Research workflow retained
```

---

# 26. Advanced Mode

Normal players should not be overwhelmed.

Default:

```text
MISSION COMPLETE
✓ Result verified
```

Optional:

```text
VIEW PROOF
```

Technical users can inspect:

* AGIJobManager job;
* transaction;
* evidence bundle;
* agents;
* tool versions;
* hashes;
* validator;
* acceptance criteria;
* costs;
* output.

Thus the world serves both:

```text
CASUAL USER
and
POWER USER / DEVELOPER
```

---

# 27. NovaSeed — Creating New Capabilities

NovaSeed should represent the system's ability to **develop a new capability when existing capabilities are insufficient**.

Suppose the system receives:

> Audit this unusual cross-chain account-abstraction contract.

Existing workflows perform poorly.

The engine detects:

```text
Required confidence: 90%
Current confidence: 54%

CAPABILITY GAP DETECTED
```

Instead of simply failing:

```text
NovaSeed
↓
generate candidate approaches
↓
evaluate candidates
↓
stress candidates
↓
select promising approach
↓
test on fresh work
↓
admit or reject
```

Candidate approaches might involve:

```text
different model
+
different tools
+
different prompts
+
different orchestration
+
different decomposition
+
different validators
+
different knowledge
```

---

# 28. Nova Garden

Inside the game, NovaSeed becomes:

## The Nova Garden

Most of the time it is quiet.

When a capability gap appears:

```text
The Garden begins glowing.
```

Leaf:

> “The world needs something we do not yet possess.”

A seed appears.

Candidate capabilities grow.

Some fail.

Some survive.

Eventually:

```text
NEW CAPABILITY DISCOVERED

Cross-Chain Auditor
```

But that capability is only admitted if the evidence supports it.

---

# 29. Recursive Improvement

A new capability should **not automatically replace the old one**.

The sequence should be:

```text
current capability
↓
proposed improvement
↓
controlled evaluation
↓
fresh mission
↓
comparison
↓
promotion / rejection
```

This is critical.

Otherwise the system is simply modifying itself and assuming improvement.

The philosophy should be:

> **No improvement by narrative. Improvement must survive fresh work.**

---

# 30. Chronicle — Machine Memory

Successful capabilities need a governed memory.

Not:

```text
"It worked once, remember forever."
```

Instead:

```text
Capability:
Robinhood ecosystem research v3

Evidence:
passed

Scope:
ecosystem research

Known limits:
private repos unavailable

Model/tool versions:
...

Last validated:
...

Expiry:
...

Successor:
v4 currently under test
```

Inside the world this could become:

## The Chronicle

A great archive containing:

* successful missions;
* major discoveries;
* validated capabilities;
* known failures;
* retired methods;
* world history.

---

# 31. Real Capability = Real Progression

Normal RPG progression:

```text
kill monsters
↓
XP
↓
level 20
```

`game.agi.eth` progression:

```text
useful mission
↓
evidence
↓
successful validation
↓
reputation
↓
access to harder missions
↓
better capabilities
↓
higher economic value
```

Game progression becomes tied to demonstrated competence.

---

# 32. Player Reputation

A player's reputation can eventually reflect:

```text
missions initiated
missions completed
missions accepted
mission value
validation success
failed jobs
disputes
agent performance
cost efficiency
domain expertise
```

Example:

```text
simon.game.agi.eth

Explorer Guild
Master Cartographer

Completed: 81
Accepted: 78
Evidence failures: 2
Disputed: 1

Specialties:
Blockchain Research
Smart Contracts
Ethereum Ecosystems
```

That is far more meaningful than arbitrary XP.

---

# 33. game.agi.eth ENS Identity

Players may eventually mint/claim:

```text
name.game.agi.eth
```

Examples:

```text
alice.game.agi.eth
simon.game.agi.eth
builder.game.agi.eth
```

This should not simply be:

> Pay money for a username.

It should represent an **accountable machine-economy identity**.

---

# 34. ENS Identity Layers

Potential progression:

### Visitor

```text
wallet only
```

Can:

* explore;
* fight;
* fish;
* interact;
* experiment.

### Resident

```text
name.game.agi.eth
```

Gets:

* persistent world identity;
* history;
* reputation;
* house;
* guild memberships;
* achievements.

### Operator

Can:

* initiate real work;
* manage capabilities;
* participate in economic jobs;
* receive settlements;
* operate businesses/guilds.

### Validator

Can:

* verify certain categories of work;
* sign evidence;
* gain verification reputation.

---

# 35. ENS Hierarchy

Conceptually:

```text
emperor.club.agi.eth
        │
        │ sovereign operator
        │
        ▼
    game.agi.eth
        │
        ├── alice.game.agi.eth
        ├── simon.game.agi.eth
        └── builder.game.agi.eth
```

Important:

**game.agi.eth identities do not inherit Emperor's privileges.**

All privileged access continues through the policy-controlled Emperor layer.

---

# 36. DERP / StonkPit — The Random Machine

The project does **not** use `$DERP` as its token.

The relevant part of DERP/StonkPit is the mechanism:

* bounded browser computation;
* proof-of-work challenges;
* short shifts;
* valid proofs;
* deterministic output;
* proof-derived randomness;
* autonomous work concepts.

We want to adapt the **machine**, not the token.

---

# 37. The Fate Machine

Inside the game, the mechanism can be represented as:

## The Fate Machine

Leaf understands it.

Players discover it early.

Instead of:

```text
Math.random()
```

important events can use:

```text
challenge
+
player/world state
+
browser computation
↓
valid proof
↓
hash
↓
entropy
↓
deterministic outcome
```

That creates reproducible randomness.

---

# 38. Example Fate Resolution

Suppose a player discovers an ancient chest.

```text
Chest #1842
+
World Epoch #31
+
Player
+
Challenge
↓
PoW proof
↓
0000189acd...
```

Different parts of the proof determine:

```text
item type
rarity
trait
quantity
special event
```

The developer cannot secretly choose the result afterward.

---

# 39. Game Uses for the Random Machine

Good uses:

* dungeon generation;
* fishing;
* mining;
* rare crafting;
* hidden passages;
* monster traits;
* artifact generation;
* treasure maps;
* procedural discoveries;
* world anomalies.

Bad uses:

* every sword strike;
* ordinary movement;
* opening normal menus;
* routine interactions.

The Machine should feel important.

---

# 40. Economic Uses for the Random Machine

This may ultimately be even more important.

### Random audit sampling

If an agent produces 5,000 results:

```text
proof
↓
select unpredictable sample
↓
validator checks sample
```

No participant chooses the easiest examples.

### Validator selection

Select among eligible validators.

### NovaSeed evaluation

Randomly choose test cases to reduce overfitting.

### Job eligibility lotteries

For limited desirable opportunities.

### Challenge generation

Generate unpredictable verification challenges.

The DERP-inspired machine therefore supports both:

```text
GAME RANDOMNESS
+
WORK VERIFICATION
```

That gives it real architectural value.

---

# 41. `$GAME`

If `game.agi.eth` has a native token, the intended native asset is:

# `$GAME`

Not `$DERP`.

`$DERP` does not become the game currency.

---

# 42. What `$GAME` Represents

`$GAME` should be the **native economic asset of the game world**.

Potential functions could include:

* world resources;
* crafting;
* upgrades;
* guild creation;
* building upgrades;
* marketplace fees;
* cosmetic assets;
* world access;
* staking for certain roles;
* governance;
* reputation-linked economic actions;
* subsidized machine operations;
* game-specific rewards.

However, the final token design should be developed carefully and later.

---

# 43. `$GAME` Must Not Become the Entire Economic System

Real professional jobs should not necessarily be priced exclusively in `$GAME`.

For example:

```text
Real contract audit
Price: 300 USDC
```

may be far more rational than:

```text
Price: 94,283 $GAME
```

Therefore separate:

```text
REAL WORK ECONOMY
        │
     ETH / USDC
        │
        ▼
AGIJobManager / settlement
```

from:

```text
GAME ECONOMY
        │
       $GAME
        │
        ▼
world assets / progression / incentives
```

Those economies can interact without being identical.

---

# 44. The External Economy Sustains the Internal Economy

This is one of the project's biggest innovations.

Typical Web3 game:

```text
new investors
↓
token demand
↓
rewards
↓
players
```

Our desired system:

```text
REAL CUSTOMERS
      ↓
REAL PROBLEMS
      ↓
BACKGROUND ENGINE
      ↓
USEFUL AGENT WORK
      ↓
VERIFIED OUTPUT
      ↓
REAL REVENUE
```

Part of that value can then support:

* infrastructure;
* agents;
* validation;
* development;
* the world;
* possibly `$GAME` economics.

That gives the economy an external productive base.

---

# 45. The Game Can Have Real Gameplay Too

The deeper work architecture does not mean the game itself should be boring.

Gameplay can contain:

### Exploration

* forests;
* caves;
* ruins;
* islands;
* hidden worlds;
* procedural dungeons.

### Combat

* Zelda-style action combat;
* creatures;
* bosses;
* environmental hazards.

### Gathering

* fishing;
* mining;
* plants;
* mushrooms;
* wood;
* artifacts.

### Crafting

* tools;
* weapons;
* potions;
* keys;
* artifacts;
* machines.

### Housing

* houses;
* workshops;
* decorations;
* trophy rooms.

### Economy

* shops;
* trade;
* resources;
* guilds.

### Discovery

* new areas;
* recipes;
* creatures;
* materials;
* secrets.

The point is that **the game layer remains enjoyable even while the deeper engine works**.

---

# 46. Active Gameplay + Background Work

This is a major design pattern.

While the player:

```text
explores
fights
fishes
crafts
talks to NPCs
```

the engine may simultaneously:

```text
research
compile
audit
test
validate
run NovaSeed candidates
produce proofs
```

The player does not stare at loading screens.

They live in the world while work occurs.

---

# 47. The World Visualizes Real Work

Eventually, movement in the village can represent actual backend activity.

Example:

```text
Research mission begins
↓
Explorer NPC leaves Leaf's Keep
```

```text
Audit starts
↓
Auditor enters tower
```

```text
Validation begins
↓
Validator walks to Hall of Judgment
```

```text
New capability experiment
↓
Nova Garden starts glowing
```

```text
Evidence accepted
↓
Courier delivers a scroll to Leaf
```

Thus the world becomes a **live visualization of the autonomous economy**.

---

# 48. External Users Don't Need to Play the Game

Eventually there may be two interfaces.

### Professional interface

```text
"Audit my contract."
```

### Game interface

The same task appears as activity in Auditor's Tower.

Both communicate with:

```text
SAME BACKGROUND ENGINE
```

Architecture:

```text
Professional App
      │
      ▼
┌───────────────────────────┐
│   Background Work Engine  │
└───────────────────────────┘
      ▲
      │
game.agi.eth
```

That greatly increases the project's possible market.

---

# 49. First Discoveries

Important discoveries inside the game can be persistent.

Examples:

* first cave discovered;
* first rare species;
* first crafting combination;
* first artifact;
* first world event;
* first boss defeat.

Record:

```text
DISCOVERY #000481

The Hollow Archive

Discovered by:
simon.game.agi.eth

Epoch:
7

Proof:
0x...
```

This creates genuine history.

---

# 50. Procedural World Expansion

Not every location needs to exist at launch.

A player discovers an entrance.

```text
entrance
+
world state
+
Fate Machine proof
↓
dungeon seed
↓
layout
↓
enemies
↓
secrets
↓
artifact possibilities
```

That dungeon becomes real when discovered.

The world progressively reveals itself.

---

# 51. Dynamic Creatures

The Fate Machine can give persistent creatures traits.

Example:

```text
MURK
Purple Slime

Traits:
Poisonous
Splitting
Cowardly

Players defeated:
8

Age:
19 days
```

If it survives long enough:

```text
ordinary creature
↓
named creature
↓
regional threat
↓
world boss
```

Now the world creates stories by itself.

---

# 52. Item Provenance

Items can accumulate history.

Example:

```text
BRIAR

Iron Sword

Forged by:
smith.game.agi.eth

Materials:
Hollow Mine Iron

Created:
Epoch III

Owners:
4

Boss kills:
2

Repairs:
7
```

Only meaningful provenance needs to be anchored onchain.

Do not put every blade of grass on Ethereum.

---

# 53. Onchain vs Offchain

This distinction must remain disciplined.

### Offchain

* player movement;
* combat animation;
* NPC dialogue;
* routine inventory updates;
* ordinary enemies;
* rendering;
* local game physics.

### Potentially onchain

* ENS identities;
* Mancer ownership;
* meaningful assets;
* high-value settlement;
* AGI jobs;
* first discoveries;
* historically significant artifacts;
* validation proofs;
* economic reputation;
* important world-state commitments.

Principle:

> **Use blockchain where trust, ownership, provenance or settlement actually matters.**

---

# 54. World Epochs

The world can evolve through major epochs.

Example:

```text
EPOCH I
The Awakening

EPOCH II
The Machine

EPOCH III
The Garden

EPOCH IV
The Expansion
```

Each epoch can unlock:

* new buildings;
* new capabilities;
* new territories;
* new world rules;
* new resources;
* new mysteries;
* stronger background systems.

Historical records remain.

---

# 55. Capability Unlocks Can Change the World

This is a particularly strong idea.

Suppose `game.agi.eth` successfully deploys production-grade contract auditing.

The world responds:

```text
AUDITOR'S TOWER HAS BEEN CONSTRUCTED
```

Later:

UI generation becomes production-ready.

```text
ARCHITECT HALL OPENS
```

NovaSeed becomes functional:

```text
NOVA GARDEN AWAKENS
```

Thus:

> **the map expands when the real machine gains capabilities.**

This connects technical progress directly to game progression.

---

# 56. Core World / Machine Mapping

| Pixel World      | Real System                    |
| ---------------- | ------------------------------ |
| Leaf             | Principal guide / interface    |
| Mancer avatar    | User/operator identity         |
| Leaf's Keep      | Emperor control plane          |
| Quest            | Mission                        |
| Quest Board      | Mission intake                 |
| Explorer Guild   | Research capability            |
| Forge            | Engineering / Solidity         |
| Auditor Tower    | Security capability            |
| Architect Hall   | UI / app creation              |
| Observatory      | Frontier monitoring            |
| Evidence Vault   | Evidence storage               |
| Hall of Judgment | Validation                     |
| Chronicle        | Proven capability memory       |
| Nova Garden      | NovaSeed                       |
| New Seed         | Candidate capability           |
| Guild reputation | Proven domain performance      |
| Quest Record     | Evidence Docket / proof record |
| Fate Machine     | DERP-inspired PoW randomness   |
| World expansion  | Capability expansion           |
| `$GAME`          | Native world asset             |
| USDC / ETH       | Real work settlement           |

This table should remain one of the canonical design references.

---

# 57. Montréal.AI Components

The important Montréal.AI concepts are not decoration.

They serve specific architectural roles.

## GoalOS

```text
objective
→ planning
→ decomposition
→ authority
→ execution graph
```

## AGIJobManager

```text
real job
→ worker
→ deliverable
→ proof
→ settlement
```

## AGI Alpha

Agent intelligence / coordination.

## AGI Alpha Node

Runtime / execution / observation infrastructure.

## NovaSeed

```text
capability gap
→ experiment
→ candidate capability
```

## Open-Ended RSI

```text
candidate
→ fresh evaluation
→ measured successor improvement
```

## Evidence / Chronicle

```text
result
→ proof
→ validation
→ governed reusable knowledge
```

Together:

```text
GOAL
 ↓
GoalOS
 ↓
MISSION
 ↓
AGIJobManager
 ↓
AGENTS
 ↓
EVIDENCE
 ↓
VALIDATION
 ↓
CHRONICLE
 ↓
NovaSeed / successor
 ↓
BETTER CAPABILITY
```

---

# 58. First Real Job Categories

Do not launch as a universal job marketplace.

Start where autonomous agents can produce genuine high-value results.

## 1. Ecosystem Research

Example:

> Identify 10 Robinhood Chain projects with real utility.

Deliverables:

* ranked list;
* evidence;
* repositories;
* contracts;
* product analysis;
* risk analysis.

## 2. Smart Contract Development

Example:

> Build a marketplace settlement contract.

Deliverables:

* Solidity;
* tests;
* documentation;
* deployment package.

## 3. Smart Contract Auditing

Example:

> Verify this contract.

Deliverables:

* security findings;
* severity;
* reproduction;
* tests;
* report.

## 4. UI / Application Building

Later:

> Build a better interface for this repository.

Deliverables:

* design;
* implementation;
* working build;
* PR.

These categories fit the initial vision far better than generic mass data processing.

---

# 59. First Version

The first version does **not** need:

* MMO infrastructure;
* 100 regions;
* 50 guilds;
* huge tokenomics;
* thousands of jobs;
* full autonomy;
* complete RSI.

It needs to prove one thing:

> **Can a game-world interaction cause useful background work to occur and return a verified result?**

---

# 60. First Map

Start tiny.

```text
             [ NOVA GARDEN ]
                LOCKED
                   │

[ EXPLORER ] ── [ LEAF ] ── [ AUDITOR ]

                   │

                [ FORGE ]
```

Add:

* a small forest;
* a lake;
* a cave;
* simple combat;
* fishing;
* basic crafting;
* Fate Machine;
* a few NPCs.

Enough to feel like a real game.

---

# 61. First End-to-End Vertical Slice

Example:

### Step 1

Player visits:

```text
game.agi.eth
```

### Step 2

Connect wallet.

### Step 3

Game detects player's Mancer.

### Step 4

Player enters pixel world.

### Step 5

Player meets Leaf.

### Step 6

Leaf introduces Explorer Guild.

### Step 7

Player chooses:

> Survey Robinhood Chain.

### Step 8

Game produces structured intent.

### Step 9

Emperor receives request.

### Step 10

GoalOS decomposes objective.

### Step 11

Agents research candidates.

### Step 12

Evidence is collected.

### Step 13

Validation occurs.

### Step 14

Result returns to Emperor.

### Step 15

Game updates.

### Step 16

Leaf announces:

> “The expedition has returned.”

### Step 17

Player receives:

* report;
* proof;
* reputation;
* world progression.

This alone demonstrates the project thesis.

---

# 62. First Technical Architecture

```text
                       PLAYER
                          │
                    Wallet / Mancer
                          │
                          ▼
┌───────────────────────────────────────────┐
│              game.agi.eth                 │
│                                           │
│ Pixel client                              │
│ World engine                              │
│ Game state                                │
│ Quest interface                           │
│ ENS identity                              │
│ Fate Machine UI                           │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│          GAME INTENT / POLICY API         │
│                                           │
│ Normalize requests                        │
│ Validate permissions                      │
│ Rate limit                                │
│ Budget limits                             │
│ Prevent arbitrary privileged actions      │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│          emperor.club.agi.eth             │
│                                           │
│ Sovereign operator                        │
│ Router                                    │
│ Budget controller                         │
│ Memory                                    │
│ Policy                                    │
└─────────────────────┬─────────────────────┘
                      │
             ┌────────┼─────────┐
             │        │         │
             ▼        ▼         ▼
          GoalOS   Local AI   Tools
             │
             ▼
       AGIJobManager
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
     Agent Agent Validator
       │     │     │
       └─────┼─────┘
             ▼
          Evidence
             │
             ▼
          Acceptance
             │
             ▼
          Settlement
             │
             ▼
          Chronicle
             │
             ▼
         NovaSeed / RSI
```

---

# 63. The Economic Flywheel

The ultimate loop should look like:

```text
REAL OBJECTIVE
      ↓
PAID MISSION
      ↓
AGENT WORK
      ↓
VERIFIED RESULT
      ↓
REVENUE
      ↓
BETTER INFRASTRUCTURE
      ↓
BETTER AGENTS
      ↓
NEW CAPABILITIES
      ↓
HARDER MISSIONS
      ↓
MORE VALUE
```

Simultaneously:

```text
MORE CAPABILITIES
      ↓
MORE BUILDINGS
      ↓
MORE WORLD SYSTEMS
      ↓
MORE GAMEPLAY
      ↓
MORE OPERATORS
      ↓
MORE DISCOVERY
```

The two loops reinforce each other.

---

# 64. The Most Important Product Principle

Every major feature should answer:

> **Does this make the world more enjoyable, or make the machine more useful?**

The strongest features do both.

For example:

### Nova Garden

Game:

> mysterious evolving location.

Machine:

> capability experimentation.

### Fate Machine

Game:

> exciting verifiable randomness.

Machine:

> randomized audit sampling.

### Guilds

Game:

> progression and identity.

Machine:

> capability organization.

### Chronicle

Game:

> world history.

Machine:

> governed capability memory.

Those are the highest-value design decisions.

---

# 65. Long-Term Vision

Imagine `game.agi.eth` years later.

A user enters using:

```text
alice.game.agi.eth
```

Her Mancer walks through a thriving city.

She sees:

* researchers entering Explorer Guild;
* auditors moving through the Tower;
* builders working in Forge;
* validation taking place in the Hall;
* Nova Garden producing a new seed;
* couriers delivering completed evidence;
* Leaf monitoring everything from the Keep.

Those are not decorative NPC animations.

They represent actual work being performed.

Outside the game, a developer requested:

> Audit my contract.

Another founder requested:

> Find the strongest five projects in this ecosystem.

Another project requested:

> Build this interface.

Agents are doing the work.

Validators are checking it.

Payments are settling.

Capabilities are improving.

The world is evolving.

The player is simultaneously:

```text
playing a game
+
operating an economy
+
using AI agents
+
producing real work
+
participating in an evolving machine institution
```

That is the end-state.

---

# 66. Final Project Definition

The deepest definition of `game.agi.eth` is:

> **A persistent digital world in which gameplay is the interface to productive autonomous intelligence.**

The graphics intentionally resemble a simple early RPG.

The infrastructure underneath is sophisticated:

```text
Identity
+
Goals
+
Agents
+
Tools
+
Jobs
+
Proof
+
Validation
+
Settlement
+
Memory
+
Improvement
```

Leaf gives that machine a face.

Mancers give users identity.

GoalOS gives objectives structure.

AGIJobManager gives real work economic form.

Evidence gives results credibility.

NovaSeed gives the system the ability to discover new capabilities.

Recursive evaluation determines whether those capabilities truly improve.

The DERP/StonkPit-inspired machine supplies verifiable computation-derived randomness where uncertainty or unbiased sampling is valuable.

`$GAME` becomes the native asset of the world.

And `emperor.club.agi.eth` remains the initial sovereign bridge between the game and the Montréal.AI machine economy.

---

# The North Star

The test for every future decision should be:

> **If we removed the pixel graphics, would the underlying system still produce something genuinely useful?**

If the answer is yes, the machine has value.

Then ask:

> **If we removed the machine infrastructure, would the world still be enjoyable enough that people want to explore it?**

If the answer is also yes, the game has value.

When both are true:

**game.agi.eth becomes something much bigger than either an AI platform or a Web3 game.**

It becomes a **living interface to productive autonomous intelligence.**
