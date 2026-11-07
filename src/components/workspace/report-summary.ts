import {
  DIMENSION_LABELS,
  type Finding,
  READINESS_DIMENSIONS,
  type ReadinessDimension,
  type Requirement,
} from "./contract";

export type DimensionCount = {
  dimension: ReadinessDimension;
  label: string;
  documented: number;
  open: number;
};

export type PlanAction = {
  requirementId: string;
  nextAction: string;
};

/** Documented and open counts for each readiness dimension. Open is every status other than DOCUMENTED. */
export function dimensionSummary(
  findings: readonly Finding[],
  requirements: readonly Requirement[],
): DimensionCount[] {
  return READINESS_DIMENSIONS.map((dimension) => {
    const inDimension = requirements.filter((requirement) => requirement.dimension === dimension);
    let documented = 0;
    let open = 0;
    for (const requirement of inDimension) {
      const finding = findings.find((item) => item.requirementId === requirement.id);
      if (finding?.status === "DOCUMENTED") documented += 1;
      else open += 1;
    }
    return { dimension, label: DIMENSION_LABELS[dimension], documented, open };
  });
}

function requirementRank(id: string) {
  const match = /(\d+)/.exec(id);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/** One action per unresolved finding, ordered by requirement. */
export function actionPlan(findings: readonly Finding[]): PlanAction[] {
  return findings
    .filter((finding) => finding.status !== "DOCUMENTED")
    .slice()
    .sort((a, b) => requirementRank(a.requirementId) - requirementRank(b.requirementId))
    .map((finding) => ({ requirementId: finding.requirementId, nextAction: finding.nextAction }));
}

export function documentRequestDraft(input: {
  productName: string;
  supplierName: string;
  partNumber: string;
  findings: readonly Finding[];
}): string {
  const actions = actionPlan(input.findings);
  const lines = [
    "Document request",
    `Product: ${input.productName}`,
    `Supplier: ${input.supplierName}`,
    `Part: ${input.partNumber}`,
    "",
    "Please send the documents below. This draft is for you to copy. TradeReady does not send it.",
    "",
  ];
  if (actions.length === 0) {
    lines.push("Nothing to request. Every requirement in this report is documented.");
    return lines.join("\n");
  }
  for (const [index, action] of actions.entries()) {
    lines.push(`${index + 1}. ${action.requirementId}: ${action.nextAction}`);
  }
  return lines.join("\n");
}

export function coveragePhrase(documented: number, open: number) {
  const documentedLabel = documented === 1 ? "1 documented" : `${documented} documented`;
  const openLabel = open === 1 ? "1 open" : `${open} open`;
  return `${documentedLabel} · ${openLabel}`;
}
