// Canonical capability / action registry for game.agi.eth.
//
// Authoritative source for "what each building can do", derived from the
// Core World / Machine Mapping in docs/GAME_AGI_CONCEPT.md and the
// "Buildings Represent Capabilities" section. A player interaction is
// translated into a structured intent whose `action` MUST be one of the ids
// below; the Emperor then routes it to the appropriate subsystem.

export type Route = 'LOCAL' | 'GOALOS' | 'AGIJOBMANAGER';

export interface ActionDef {
  /** Canonical action id — this is what an intent's `action` field must equal. */
  action: string;
  /** Human-facing capability name. */
  capability: string;
  /** World building that exposes this capability. */
  building: string;
  /** Short description of the real work. */
  description: string;
  /** Budget class used by Emperor policy/cost control. */
  budgetClass: string;
  /** Evidence the result must carry to be acceptable. */
  requiredEvidence: string[];
  /** How Emperor routes the work. */
  route: Route;
}

export const ACTIONS: Record<string, ActionDef> = {
  ECOSYSTEM_RESEARCH: {
    action: 'ECOSYSTEM_RESEARCH',
    capability: 'Research',
    building: "Explorer's Guild",
    description: 'Ecosystem research and fact-finding on projects, chains and protocols.',
    budgetClass: 'research-small',
    requiredEvidence: ['repository', 'product', 'contracts', 'documentation'],
    route: 'GOALOS',
  },
  SMART_CONTRACT_DEVELOPMENT: {
    action: 'SMART_CONTRACT_DEVELOPMENT',
    capability: 'Engineering / Solidity',
    building: 'The Forge',
    description: 'Smart-contract development and software engineering.',
    budgetClass: 'engineering-medium',
    requiredEvidence: ['source', 'tests', 'static-analysis', 'documentation'],
    route: 'AGIJOBMANAGER',
  },
  SMART_CONTRACT_AUDIT: {
    action: 'SMART_CONTRACT_AUDIT',
    capability: 'Security',
    building: 'Auditor Tower',
    description: 'Contract auditing and security verification.',
    budgetClass: 'security-medium',
    requiredEvidence: ['findings', 'severity', 'reproduction', 'tests'],
    route: 'AGIJOBMANAGER',
  },
  UI_APPLICATION_BUILD: {
    action: 'UI_APPLICATION_BUILD',
    capability: 'UI / Application',
    building: 'Architect Hall',
    description: 'Frontend/backend application building, design and implementation.',
    budgetClass: 'engineering-medium',
    requiredEvidence: ['design', 'implementation', 'build', 'tests'],
    route: 'AGIJOBMANAGER',
  },
  FRONTIER_MONITOR: {
    action: 'FRONTIER_MONITOR',
    capability: 'Frontier monitoring',
    building: 'Observatory',
    description: 'Watching for new tech, trends and threats.',
    budgetClass: 'research-small',
    requiredEvidence: ['sources', 'summary'],
    route: 'GOALOS',
  },
  VALIDATION: {
    action: 'VALIDATION',
    capability: 'Validation',
    building: 'Hall of Judgment',
    description: 'Independent checking of evidence; accept/reject results.',
    budgetClass: 'validation-small',
    requiredEvidence: ['checked-artifact', 'verdict'],
    route: 'LOCAL',
  },
  CAPABILITY_DISCOVERY: {
    action: 'CAPABILITY_DISCOVERY',
    capability: 'NovaSeed',
    building: 'Nova Garden',
    description: 'Seed and evaluate a candidate new capability when a gap exists.',
    budgetClass: 'novaseed-small',
    requiredEvidence: ['candidate', 'fresh-evaluation'],
    route: 'GOALOS',
  },
};

export function getAction(id: string): ActionDef | undefined {
  return ACTIONS[id];
}

export function listActions(): ActionDef[] {
  return Object.values(ACTIONS);
}
