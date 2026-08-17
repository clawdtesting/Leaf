// emperor-backend/src/persistence.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { MissionRecord } from './emperor';

const DATA_FILE = join(__dirname, '..', '..', 'missions.json');

export class MissionPersistence {
  private missions: Map<string, MissionRecord> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    if (!existsSync(DATA_FILE)) {
      // initialize empty
      this.missions = new Map();
      return;
    }
    try {
      const data = readFileSync(DATA_FILE, 'utf8');
      const parsed: MissionRecord[] = JSON.parse(data);
      this.missions = new Map(parsed.map(m => [m.id, m]));
    } catch (e) {
      console.warn('Failed to load missions database, starting empty:', e);
      this.missions = new Map();
    }
  }

  private save(): void {
    try {
      const data = JSON.stringify(Array.from(this.missions.values()), null, 2);
      writeFileSync(DATA_FILE, data, { encoding: 'utf8', flag: 'w' });
    } catch (e) {
      console.error('Failed to save missions database:', e);
    }
  }

  getMission(id: string): MissionRecord | undefined {
    return this.missions.get(id);
  }

  addMission(mission: MissionRecord): void {
    this.missions.set(mission.id, mission);
    this.save();
  }

  updateMission(mission: MissionRecord): void {
    if (this.missions.has(mission.id)) {
      this.missions.set(mission.id, mission);
      this.save();
    }
  }

  // Optional: get all missions for a user
  getMissionsByUser(userId: string): MissionRecord[] {
    return Array.from(this.missions.values()).filter(m => m.userId === userId);
  }

  // All missions (for the Quest Record / Evidence Vault listing).
  getAll(): MissionRecord[] {
    return Array.from(this.missions.values());
  }

  // Clear all (for testing)
  clear(): void {
    this.missions.clear();
    this.save();
  }
}

// Extend MissionRecord to include userId
export interface MissionRecordWithUser extends MissionRecord {
  userId: string; // wallet address or identity
}