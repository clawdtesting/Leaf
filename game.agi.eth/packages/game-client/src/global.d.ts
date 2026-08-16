export {};

declare global {
  interface Window {
    setQuestInProgress?: (v: boolean) => void;
    setJobId?: (v: string | null) => void;
    /** Opens the mission-intake form for a building (Phaser -> React bridge). */
    openIntake?: (b: { key: string; name: string; action: string; target: string; details: string }) => void;
  }
}
