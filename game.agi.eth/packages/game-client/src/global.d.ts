export {};

declare global {
  interface Window {
    setQuestInProgress?: (v: boolean) => void;
    setJobId?: (v: string | null) => void;
  }
}
