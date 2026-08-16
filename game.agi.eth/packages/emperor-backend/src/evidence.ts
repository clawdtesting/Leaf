// Vendored from clawdtesting/Eth-Agi (packages/evidence/src/index.ts) — read-only protocol / evidence logic.
// Same-owner reuse; keep in sync with upstream when the ABIs or model change.
import { createHash } from "crypto";
import { readFileSync, statSync } from "fs";

// ── Hashing ──────────────────────────────────────────────────────────────────

export function sha256String(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function sha256Json(obj: unknown): string {
  const s = JSON.stringify(obj, (_, v) =>
    typeof v === "bigint" ? v.toString() : v
  );
  return createHash("sha256").update(s, "utf8").digest("hex");
}

// ── File utilities ────────────────────────────────────────────────────────────

export function getFileSize(filePath: string): number {
  return statSync(filePath).size;
}

export function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    json: "application/json",
    txt: "text/plain",
    md: "text/markdown",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

// ── Artifact Manifest ─────────────────────────────────────────────────────────

export interface ArtifactManifestEntry {
  relative_path: string;
  sha256: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
}

export function validateArtifactManifestEntry(entry: ArtifactManifestEntry): boolean {
  return (
    typeof entry.relative_path === "string" &&
    entry.relative_path.length > 0 &&
    typeof entry.sha256 === "string" &&
    entry.sha256.length === 64 &&
    /^[0-9a-f]{64}$/i.test(entry.sha256) &&
    typeof entry.size_bytes === "number" &&
    entry.size_bytes >= 0 &&
    typeof entry.mime_type === "string" &&
    entry.mime_type.length > 0 &&
    typeof entry.created_at === "string" &&
    !isNaN(Date.parse(entry.created_at))
  );
}

export function validateArtifactManifest(manifest: ArtifactManifestEntry[]): boolean {
  return Array.isArray(manifest) && manifest.every(validateArtifactManifestEntry);
}

// ── Evidence Docket ───────────────────────────────────────────────────────────

export interface EvidenceDocket {
  id: string;
  execution_run_id: string;
  title: string;
  summary: string;
  artifact_manifest: ArtifactManifestEntry[];
  validation_report: string;
  content_hash: string;
  ipfs_cid?: string;
  publication_status: "LOCAL" | "PENDING_IPFS" | "PUBLISHED_IPFS" | "FAILED";
  created_at: Date;
  updated_at: Date;
}

export function validateEvidenceDocket(docket: EvidenceDocket): boolean {
  return (
    typeof docket.id === "string" &&
    docket.id.length > 0 &&
    typeof docket.execution_run_id === "string" &&
    docket.execution_run_id.length > 0 &&
    typeof docket.title === "string" &&
    docket.title.length > 0 &&
    typeof docket.summary === "string" &&
    docket.summary.length > 0 &&
    validateArtifactManifest(docket.artifact_manifest) &&
    typeof docket.validation_report === "string" &&
    docket.validation_report.length > 0 &&
    typeof docket.content_hash === "string" &&
    docket.content_hash.length === 64 &&
    /^[0-9a-f]{64}$/i.test(docket.content_hash) &&
    (docket.ipfs_cid === undefined || typeof docket.ipfs_cid === "string") &&
    ["LOCAL", "PENDING_IPFS", "PUBLISHED_IPFS", "FAILED"].includes(
      docket.publication_status
    ) &&
    docket.created_at instanceof Date &&
    !isNaN(docket.created_at.getTime()) &&
    docket.updated_at instanceof Date &&
    !isNaN(docket.updated_at.getTime())
  );
}
