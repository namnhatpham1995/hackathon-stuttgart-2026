import { normaliseWhitespace, validateCitations } from "./citations";
import type {
  Citation,
  ExpectedValues,
  Finding,
  FindingStatus,
  Observation,
  PageText,
  Requirement,
  RequirementSet,
} from "./types";
import { evidenceTypeLabels, findingSchema } from "./types";

/**
 * Observation fields are the keys of `ExpectedValues`, plus the names group 6
 * asks the model for: `validityEnd` (`YYYY-MM-DD`), `accepted` (`yes` when the
 * page explicitly accepts the packaging), and the traceability links
 * `resinBatch`, `productionLot` and `shipment`. Expiry is `validityEnd`
 * strictly before the assessment date. There is no expected end date.
 *
 * Precedence when several issues apply: conflicting values on the submitted
 * pages, then identity (part, supplier), then expiry, then revision, grade,
 * material, scope and packaging. The reason lists every issue. A wrong or
 * missing identity never supports the requirement. Absence is MISSING only
 * when processing was complete and every claim still has a valid citation.
 */

const identityFields = ["partNumber", "supplierName"] as const;

type ValueIssue = {
  kind: "identity" | "mismatch";
  field: string;
  expected: string;
  observed: string;
};

type Issue =
  | { kind: "conflict"; field: string; values: string[] }
  | ValueIssue
  | { kind: "expired"; validUntil: string }
  | { kind: "scope"; field: string; expected: string; observed: string }
  | { kind: "missing-field"; field: string }
  | { kind: "bad-date"; value: string };

type FieldState =
  | { state: "absent" }
  | { state: "conflict"; values: string[] }
  | { state: "value"; value: string };

export function decideFindings(input: {
  requirementSet: RequirementSet;
  observations: Observation[];
  citations: Citation[];
  pages: PageText[];
  /** ISO date `YYYY-MM-DD`. Expiry is compared against this, not against a stored expected date. */
  assessmentDate: string;
  /** False when any active document yielded no text. */
  complete: boolean;
}): Finding[] {
  const validCitations = validateCitations(input.citations, input.pages);
  const citationIndex = new Set(validCitations.map(citationKey));

  return input.requirementSet.requirements.map((requirement) =>
    findingSchema.parse(
      decideRequirement({
        requirement,
        observations: input.observations.filter(
          (observation) => observation.requirementId === requirement.id,
        ),
        validCitations,
        citationIndex,
        assessmentDate: input.assessmentDate,
        complete: input.complete,
      }),
    ),
  );
}

function decideRequirement(args: {
  requirement: Requirement;
  observations: Observation[];
  validCitations: Citation[];
  citationIndex: Set<string>;
  assessmentDate: string;
  complete: boolean;
}): Finding {
  const usable = args.observations.filter(
    (observation) => observation.value !== null && args.citationIndex.has(citationKey(observation)),
  );

  if (usable.length === 0) {
    return absenceFinding(args.requirement, args.observations, args.complete);
  }

  const groups = groupedValues(usable);
  const issues = collectIssues(args.requirement, groups, args.assessmentDate);
  const status = statusFor(issues);

  return {
    requirementId: args.requirement.id,
    status,
    evidenceType: args.requirement.kind,
    observed: observedRecord(args.requirement, groups),
    citations: citationsFor(usable, args.validCitations),
    reason:
      issues.length === 0
        ? `The ${evidenceTypeLabels[args.requirement.kind]} supports this requirement.`
        : issues.map((issue) => describe(args.requirement, issue, args.assessmentDate)).join(" "),
    nextAction: nextActionFor(args.requirement, status, issues, args.assessmentDate),
  };
}

function absenceFinding(
  requirement: Requirement,
  observations: Observation[],
  complete: boolean,
): Finding {
  const claimed = observations.some((observation) => observation.value !== null);
  if (claimed) {
    return baseFinding(
      requirement,
      "NEEDS_REVIEW",
      "A cited quote was not found on the cited page, so the finding cannot be confirmed.",
      "Submit the document again so the quoted passage can be checked.",
    );
  }
  if (!complete) {
    return baseFinding(
      requirement,
      "NEEDS_REVIEW",
      "Processing was incomplete, so this requirement cannot be reported as missing.",
      "Replace any document that has no extractable text and assess again.",
    );
  }
  return baseFinding(
    requirement,
    "MISSING",
    missingReason(requirement),
    missingAction(requirement),
  );
}

function baseFinding(
  requirement: Requirement,
  status: FindingStatus,
  reason: string,
  nextAction: string,
): Finding {
  return {
    requirementId: requirement.id,
    status,
    evidenceType: requirement.kind,
    observed: {},
    citations: [],
    reason,
    nextAction,
  };
}

function missingReason(requirement: Requirement): string {
  if (requirement.kind === "traceability_record") {
    return "No traceability record was found in the processed documents.";
  }
  return `No ${evidenceTypeLabels[requirement.kind]} was found in the processed documents.`;
}

function missingAction(requirement: Requirement): string {
  if (requirement.kind === "traceability_record") {
    const part = requirement.expected.partNumber ?? "the part";
    const links = traceLinksFor(requirement).map(label);
    return `Provide a traceability record that links ${listPhrase(links)} for ${part}.`;
  }
  return `Provide the ${evidenceTypeLabels[requirement.kind]} for this requirement.`;
}

function groupedValues(observations: Observation[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const observation of observations) {
    if (observation.value === null) continue;
    const value = observation.value.trim();
    if (value.length === 0) continue;
    const values = groups.get(observation.field) ?? [];
    if (!values.some((existing) => valuesEqual(existing, value))) values.push(value);
    groups.set(observation.field, values);
  }
  return groups;
}

function lookup(groups: Map<string, string[]>, field: string): FieldState {
  const values = groups.get(field) ?? [];
  const value = values[0];
  if (values.length > 1) return { state: "conflict", values };
  if (value === undefined) return { state: "absent" };
  return { state: "value", value };
}

function collectIssues(
  requirement: Requirement,
  groups: Map<string, string[]>,
  assessmentDate: string,
): Issue[] {
  const issues: Issue[] = [];
  for (const [field, values] of groups) {
    if (values.length > 1) issues.push({ kind: "conflict", field, values });
  }

  for (const field of identityFields) {
    const expected = requirement.expected[field];
    if (expected === undefined) continue;
    const found = lookup(groups, field);
    if (found.state === "absent") issues.push({ kind: "missing-field", field });
    else if (found.state === "value" && !identityEqual(field, found.value, expected)) {
      issues.push({ kind: "identity", field, expected, observed: found.value });
    }
  }

  const expiry = lookup(groups, "validityEnd");
  if (requirement.kind === "certificate" || expiry.state !== "absent") {
    if (expiry.state === "absent") issues.push({ kind: "missing-field", field: "validityEnd" });
    else if (expiry.state === "value") {
      const validUntil = canonicalDate(expiry.value);
      const assessed = canonicalDate(assessmentDate);
      if (!validUntil || !assessed) issues.push({ kind: "bad-date", value: expiry.value });
      else if (validUntil < assessed) issues.push({ kind: "expired", validUntil });
    }
  }

  for (const field of Object.keys(requirement.expected) as (keyof ExpectedValues)[]) {
    if (field === "partNumber" || field === "supplierName") continue;
    const expected = requirement.expected[field];
    if (expected === undefined) continue;
    const found = lookup(groups, field);
    if (found.state !== "value") {
      if (found.state === "absent") issues.push({ kind: "missing-field", field });
      continue;
    }
    if (field === "scope" || field === "standard") {
      if (!scopeCovers(found.value, expected)) {
        issues.push({ kind: "scope", field, expected, observed: found.value });
      }
      continue;
    }
    if (!valuesEqual(found.value, expected)) {
      issues.push({ kind: "mismatch", field, expected, observed: found.value });
    }
  }

  if (requirement.kind === "packaging_acceptance") {
    const accepted = lookup(groups, "accepted");
    if (accepted.state === "absent") issues.push({ kind: "missing-field", field: "accepted" });
    else if (accepted.state === "value" && !valuesEqual(accepted.value, "yes")) {
      issues.push({
        kind: "mismatch",
        field: "accepted",
        expected: "yes",
        observed: accepted.value,
      });
    }
  }

  if (requirement.kind === "traceability_record") {
    for (const field of traceLinksFor(requirement)) {
      if (lookup(groups, field).state === "absent") issues.push({ kind: "missing-field", field });
    }
  }

  if (requirement.kind === "packaging_specification") {
    if (lookup(groups, "cartonConfiguration").state === "absent") {
      issues.push({ kind: "missing-field", field: "cartonConfiguration" });
    }
  }

  return issues;
}

function statusFor(issues: Issue[]): FindingStatus {
  if (issues.some((issue) => issue.kind === "conflict")) return "NEEDS_REVIEW";
  if (issues.some((issue) => issue.kind === "identity")) return "MISMATCH";
  if (
    issues.some(
      (issue) =>
        issue.kind === "missing-field" &&
        (issue.field === "partNumber" || issue.field === "supplierName"),
    )
  ) {
    return "NEEDS_REVIEW";
  }
  if (issues.some((issue) => issue.kind === "expired")) return "EXPIRED";
  if (issues.some((issue) => issue.kind === "mismatch" || issue.kind === "scope")) {
    return "MISMATCH";
  }
  if (issues.length > 0) return "NEEDS_REVIEW";
  return "DOCUMENTED";
}

const fieldLabels: Record<string, string> = {
  partNumber: "part",
  productName: "product name",
  revision: "revision",
  material: "material",
  grade: "grade",
  supplierName: "supplier",
  scope: "scope",
  standard: "standard",
  cartonConfiguration: "carton configuration",
  packagingCode: "packaging code",
  packagingRevision: "packaging revision",
  validityEnd: "validity end date",
  accepted: "explicit acceptance",
  resinBatch: "resin batch",
  productionLot: "production lot",
  shipment: "shipment",
};

function label(field: string): string {
  return fieldLabels[field] ?? field;
}

function describe(requirement: Requirement, issue: Issue, assessmentDate: string): string {
  switch (issue.kind) {
    case "conflict":
      return `Submitted documents disagree on ${label(issue.field)}: ${issue.values.join(" and ")}.`;
    case "identity":
    case "mismatch":
      if (issue.field === "revision") {
        const noun = requirement.kind === "inspection_report" ? "report" : "document";
        return `Buyer requires revision ${issue.expected}; ${noun} identifies ${issue.observed}.`;
      }
      if (issue.field === "accepted") {
        return "The document does not explicitly accept the packaging.";
      }
      return `Buyer requires ${label(issue.field)} ${issue.expected}; document identifies ${issue.observed}.`;
    case "scope":
      return `Buyer requires ${label(issue.field)} ${issue.expected}; document identifies ${issue.observed}.`;
    case "expired":
      return `The extracted document validity end date ${issue.validUntil} precedes the assessment date ${assessmentDate}.`;
    case "bad-date":
      return `The validity end date "${issue.value}" is not a date this check can compare.`;
    case "missing-field":
      return `The submitted text does not show the ${label(issue.field)}.`;
  }
}

function nextActionFor(
  requirement: Requirement,
  status: FindingStatus,
  issues: Issue[],
  assessmentDate: string,
): string {
  if (status === "DOCUMENTED") return "No further document is needed for this requirement.";
  if (status === "EXPIRED") return `Provide a certificate that is valid on ${assessmentDate}.`;
  if (status === "MISSING") return missingAction(requirement);
  if (status === "NEEDS_REVIEW") {
    if (issues.some((issue) => issue.kind === "conflict")) {
      return "Resolve the conflicting values in the submitted documents and assess again.";
    }
    return "Clarify the submitted evidence and assess again.";
  }

  const partConflict = issues.some(
    (issue) => issue.kind === "identity" && issue.field === "partNumber",
  );
  const revisionMismatch = issues.some(
    (issue) =>
      (issue.kind === "mismatch" || issue.kind === "identity") && issue.field === "revision",
  );
  if (requirement.kind === "inspection_report" && revisionMismatch && !partConflict) {
    const part = requirement.expected.partNumber ?? "the part";
    return `Provide the report for ${part} revision ${requirement.expected.revision}.`;
  }
  return `Provide the ${evidenceTypeLabels[requirement.kind]} that matches the buyer requirement.`;
}

function observedRecord(
  requirement: Requirement,
  groups: Map<string, string[]>,
): Record<string, string | null> {
  const observed: Record<string, string | null> = {};
  for (const field of Object.keys(requirement.expected)) {
    const values = groups.get(field);
    observed[field] = values ? values.join(" / ") : null;
  }
  for (const [field, values] of groups) {
    if (observed[field] === undefined) observed[field] = values.join(" / ");
  }
  return observed;
}

function citationsFor(observations: Observation[], citations: Citation[]): Citation[] {
  const wanted = new Set(observations.map(citationKey));
  return citations.filter((citation) => wanted.has(citationKey(citation)));
}

function citationKey(item: { documentId: string; page: number; quote: string }): string {
  return `${item.documentId}\0${item.page}\0${normaliseWhitespace(item.quote)}`;
}

const defaultTraceLinks = ["resinBatch", "productionLot", "shipment"];

function traceLinksFor(requirement: Requirement): string[] {
  return requirement.traceLinks ?? defaultTraceLinks;
}

function listPhrase(items: string[]): string {
  const withArticle = items.map((item) => `a ${item}`);
  if (withArticle.length <= 1) return withArticle.join("");
  return `${withArticle.slice(0, -1).join(", ")} and ${withArticle.at(-1)}`;
}

/**
 * Equal after case and whitespace folding, or when one side is the other's
 * bracketed short form: "Polypropylene (PP)" equals "PP" and "Polypropylene".
 */
function valuesEqual(observed: string, expected: string): boolean {
  const left = valueForms(observed);
  return valueForms(expected).some((form) => left.includes(form));
}

function valueForms(value: string): string[] {
  const whole = normaliseValue(value);
  const bracketed = /^(.+?)\s*\(([^()]+)\)$/.exec(whole);
  if (!bracketed?.[1] || !bracketed[2]) return [whole];
  return [whole, bracketed[1].trim(), bracketed[2].trim()];
}

/** Supplier names compare without punctuation: "Co. Ltd." equals "Co., Ltd.". */
function identityEqual(field: string, observed: string, expected: string): boolean {
  if (field !== "supplierName") return valuesEqual(observed, expected);
  const fold = (value: string) =>
    normaliseValue(value)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  return fold(observed) === fold(expected);
}

function normaliseValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * True when the expected words appear in order in the observed text, compared by
 * word stem: "injection-moulded plastic components" covers "injection moulding",
 * and "ISO 9001:2015" covers "ISO 9001".
 */
function scopeCovers(observed: string, expected: string): boolean {
  const have = stems(observed);
  const want = stems(expected);
  if (want.length === 0) return true;
  for (let start = 0; start + want.length <= have.length; start += 1) {
    if (want.every((word, offset) => have[start + offset] === word)) return true;
  }
  return false;
}

function stems(value: string): string[] {
  return normaliseValue(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => (word.length > 4 ? word.replace(/(ing|ed|s)$/, "") : word));
}

function canonicalDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}
