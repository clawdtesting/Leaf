// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/protocol/opportunity-score.ts) — read-only protocol / evidence logic.
// Same-owner reuse; keep in sync with upstream when the ABIs or model change.
export interface OpportunityScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "REJECT";
  recommendation: "IMPORT" | "WATCH" | "REVIEW_MANUALLY" | "REJECT";
  reasons: string[];
  risks: string[];
  suggested_next_step: string;
}

export interface ScorableJob {
  budget_hint: string;
  required_artifacts: string[];
  validator_rules: string[];
  risk_level: string;
  status: string;
  raw_metadata: Record<string, unknown>;
  objective: string;
  constraints: string[];
  upstream_contract: string;
}

export function scoreOpportunity(job: ScorableJob): OpportunityScore {
  const reasons: string[] = [];
  const risks: string[] = [];
  let score = 50;

  // Objective clarity
  if (job.objective && job.objective.length > 20) {
    score += 10;
    reasons.push("Clear objective");
  } else if (job.objective && job.objective.length > 0) {
    score += 5;
    reasons.push("Objective present but short");
  } else {
    score -= 10;
    reasons.push("Missing or empty objective");
  }

  // Required artifacts
  if (job.required_artifacts.length > 0) {
    score += Math.min(job.required_artifacts.length * 5, 15);
    reasons.push(`${job.required_artifacts.length} required artifact(s) defined`);
  } else {
    score -= 5;
    reasons.push("No required artifacts defined");
  }

  // Validator rules
  if (job.validator_rules.length > 0) {
    score += 10;
    reasons.push("Validator rules present");
  } else {
    score -= 10;
    reasons.push("Missing validator rules — manual review needed");
  }

  // Risk level
  const riskLower = job.risk_level?.toLowerCase() || "unknown";
  if (riskLower === "low") {
    score += 10;
    reasons.push("Low risk");
  } else if (riskLower === "medium") {
    score += 0;
    reasons.push("Medium risk");
  } else if (riskLower === "high") {
    score -= 15;
    risks.push("High risk job");
  } else if (riskLower === "critical") {
    score -= 25;
    risks.push("Critical risk job — requires escalation review");
  } else {
    score -= 5;
    reasons.push("Unknown risk level");
  }

  // Budget
  const budgetMatch = job.budget_hint?.match(/(\d+(\.\d+)?)/);
  const budgetValue = budgetMatch ? parseFloat(budgetMatch[1]) : 0;
  if (budgetValue > 0) {
    score += 5;
    reasons.push("Budget hint present");
  } else {
    score -= 5;
    reasons.push("No budget hint");
  }

  // Upstream status
  const statusUpper = job.status?.toUpperCase() || "";
  if (statusUpper === "COMPLETED" || statusUpper === "PENDING_MANUAL_REVIEW") {
    score += 5;
    reasons.push(`Status: ${statusUpper}`);
  } else if (statusUpper === "DISPUTED" || statusUpper === "EXPIRED") {
    score -= 15;
    risks.push(`Job status: ${statusUpper}`);
  }

  // Contract source
  if (job.upstream_contract === "AGI_JOB_MANAGER_PRIME") {
    score += 5;
    reasons.push("Prime Discovery job — higher priority source");
  }

  // Constraints
  if (job.constraints.length > 0 && job.constraints[0] !== "manual_import" && job.constraints[0] !== "upstream_constraints_not_parsed") {
    score += 5;
    reasons.push("Structured constraints present");
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Grade
  const grade: OpportunityScore["grade"] = score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : score >= 25 ? "D" : "REJECT";

  // Recommendation
  let recommendation: OpportunityScore["recommendation"];
  let suggested_next_step: string;

  if (score >= 80) {
    recommendation = "IMPORT";
    suggested_next_step = "Import as JobSpec and evaluate for work-loop execution";
  } else if (score >= 50) {
    recommendation = "WATCH";
    suggested_next_step = "Import for monitoring — operator review recommended before execution";
  } else if (score >= 25) {
    recommendation = "REVIEW_MANUALLY";
    suggested_next_step = "Review upstream data manually before importing";
  } else {
    recommendation = "REJECT";
    suggested_next_step = "Reject — insufficient job quality or excessive risk";
  }

  return {
    score,
    grade,
    recommendation,
    reasons,
    risks,
    suggested_next_step,
  };
}
