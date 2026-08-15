# game.agi.eth — Technical References

## Purpose

The repositories below are upstream research and implementation references
for game.agi.eth.

They are NOT part of the game repository.

Do not modify them unless explicitly instructed.

Do not blindly copy their architecture.

Inspect the relevant upstream source before making claims about how a
Montréal.AI component works.

Local reference root:

../montrealai-reference/

---

# Primary Montréal.AI References

## AGIJobManager

Local:

../montrealai-reference/AGIJobManager/

Upstream:

https://github.com/MontrealAI/AGIJobManager

Role in game.agi.eth:

- economically meaningful AGI work
- job agreements
- deliverables
- validation
- settlement
- proof-oriented work infrastructure

Use when investigating how real jobs should be represented and settled.

---

## AGI Alpha Agent

Local:

../montrealai-reference/AGI-Alpha-Agent-v0/

Upstream:

https://github.com/MontrealAI/AGI-Alpha-Agent-v0

Role:

- autonomous agent architecture
- meta-agent concepts
- orchestration
- agent reasoning/execution patterns

---

## AGI Alpha Node

Local:

../montrealai-reference/AGI-Alpha-Node-v0/

Upstream:

https://github.com/MontrealAI/AGI-Alpha-Node-v0

Role:

- agent/node runtime
- execution infrastructure
- observability
- telemetry
- operational patterns

---

## Alpha Nova Seeds

Local:

../montrealai-reference/alpha-nova-seeds/

Upstream:

https://github.com/MontrealAI/alpha-nova-seeds

Role:

- capability formation
- proof-first experimentation
- NovaSeed concepts
- new capability creation

game.agi.eth representation:

Nova Garden.

---

## Open-Ended RSI

Local:

../montrealai-reference/alpha-open-ended-rsi-system/

Upstream:

https://github.com/MontrealAI/alpha-open-ended-rsi-system

Role:

- open-ended capability evolution
- recursive improvement
- successor testing
- improvement evaluation

Important principle:

Do not equate self-modification with improvement.

Fresh-work evidence is required.

---

## GoalOS + AGI Alpha Ascension

Local:

../montrealai-reference/goalos-agialpha-ascension/

Upstream:

https://github.com/MontrealAI/goalos-agialpha-ascension

Role:

- GoalOS / AGI Alpha integration
- advanced mission/capability architecture

---

## GoalOS Sovereign Machine Economy

Local:

../montrealai-reference/goalos-agialpha-sovereign-machine-economy/

Upstream:

https://github.com/MontrealAI/goalos-agialpha-sovereign-machine-economy

Role:

- machine economy
- proof-settled autonomous work
- evidence
- validation
- sovereign agent architecture

This repository is especially important to the economic thesis of
game.agi.eth.

---

## GoalOS + AGIJobManager Ascension

Local:

../montrealai-reference/goalos-agijobmanager-ascension/

Upstream:

https://github.com/MontrealAI/goalos-agijobmanager-ascension

Role:

- GoalOS ↔ AGIJobManager integration
- mission-to-job architecture
- bounded work execution

---

## Montréal.AI GitHub Pages / GoalOS Corpus

Local:

../montrealai-reference/MontrealAI.github.io/

Upstream:

https://github.com/MontrealAI/MontrealAI.github.io

Role:

- GoalOS operating doctrine
- Mission Foundry
- Proof & Authority
- Capability Twin
- Model & Agent Auction
- Evidence Dockets
- Chronicle
- Successor Laboratory
- Singularity Navigator
- institutional operating material

This repository contains extensive evolving GoalOS reference material.

---

# Primary Project Documents

## GAME_AGI_CONCEPT.md

Path:

docs/GAME_AGI_CONCEPT.md

Purpose:

Canonical product vision.

Use it to answer:

- What are we building?
- Why does the game exist?
- What is Leaf?
- How do Mancers fit?
- What is the machine economy?
- How should gameplay relate to real work?

---

## ARCHITECTURE.md

Path:

docs/ARCHITECTURE.md

Purpose:

Canonical technical architecture and system boundaries.

When implementation decisions conflict with the broad concept document,
prefer the explicit architectural constraints here unless instructed
otherwise.

---

## MONTREALAI_CONTEXT.md

Path:

docs/MONTREALAI_CONTEXT.md

Purpose:

Curated explanation of how Montréal.AI concepts map into game.agi.eth.

---

## AGI ALPHA Publication

Local project copy:

docs/AGI_ALPHA_Unified_Publication...

Purpose:

Deep conceptual reference for:

- machine labor
- AGI Alpha
- proof
- identity
- settlement
- capability evolution
- broader Montréal.AI thesis

Do not load/read the entire publication for ordinary frontend work.

Consult it when architecture or protocol reasoning requires it.

---

# Reference Usage Rules

Before implementing a Montréal.AI integration:

1. Read the relevant section of GAME_AGI_CONCEPT.md.
2. Read ARCHITECTURE.md.
3. Identify the Montréal.AI component involved.
4. Inspect its actual local upstream repository.
5. Prefer current source code and README documentation over assumptions.
6. Do not modify upstream reference repositories.
7. Use adapters between game.agi.eth and upstream systems where possible.
8. Do not tightly couple the pixel game client directly to Montréal.AI.
9. Record significant integration decisions in game.agi.eth documentation.

---

# Explicitly Out of Scope

For the current phase:

- TickerYard
- $DERP token
- Mancer DEX integration
- broad public AGIJobManager access for game users
- complex $GAME tokenomics
- full autonomous RSI
- universal freelance/job marketplace

These may be reconsidered later but must not influence V0 architecture
without an explicit decision.
