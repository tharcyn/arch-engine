/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Programmatic verification entrypoint
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure function: takes a parsed bundle + options, returns a
 *  deterministic verification result.
 *
 *  Orchestrates the check pipeline:
 *
 *    1. structural    (empty records.ndjson)
 *    2. schema        (Ajv against v1 schemas + version gates)
 *    3. identity      (id formula format)
 *    4. hash          (payloadHash recompute + id ↔ payloadHash)
 *    5. manifest      (bijection + cross-ref + duplicates + counts)
 *    6. sort          (records.ndjson sort order)
 *    7. plane         (family ↔ plane invariants)
 *    8. paths         (absolute path scan)
 *    9. digest        (snapshotDigest recompute)
 *   10. attestation   (optional subject digest cross-ref)
 *
 *  Verdict mapping rules:
 *    - Any AGP_VERIFIER_UNSUPPORTED_*  → unsupported_schema
 *    - Any HASH_MISMATCH / ID_MISMATCH / DIGEST_MISMATCH
 *      / ATTESTATION_SUBJECT_MISMATCH
 *      / DUPLICATE_RECORD_ID / DUPLICATE_MANIFEST_ID
 *      / MANIFEST_CROSS_REF_MISMATCH                → tampered
 *    - Any other error                              → invalid
 *    - No errors but warnings present               → valid_with_warnings
 *    - No errors and no warnings                    → valid
 *
 *  The tampered codes are the spec's "content was altered" signals;
 *  invalid covers shape/schema problems.
 */

import { loadSchemas } from './schemas.js';
import { runStructuralChecks } from './checks/parseChecks.js';
import { runSchemaChecks } from './checks/schemaChecks.js';
import { runIdentityFormatChecks } from './checks/identityChecks.js';
import { runHashChecks } from './checks/hashChecks.js';
import { runManifestChecks } from './checks/manifestChecks.js';
import { runSortChecks } from './checks/sortChecks.js';
import { runPlaneChecks } from './checks/planeChecks.js';
import { runPathChecks } from './checks/pathChecks.js';
import { runDigestChecks } from './checks/digestChecks.js';
import { runAttestationChecks } from './checks/attestationChecks.js';

import type {
  AgpParsedBundle,
  AgpRecord,
  AgpRecordFamily,
  AgpVerificationIssue,
  AgpVerificationResult,
  AgpVerificationSummary,
  AgpVerificationVerdict,
  AgpVerifierOptions,
} from './types.js';

const TAMPERED_CODES = new Set<string>([
  'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH',
  'AGP_VERIFIER_RECORD_ID_MISMATCH',
  'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH',
  'AGP_VERIFIER_DUPLICATE_RECORD_ID',
  'AGP_VERIFIER_DUPLICATE_MANIFEST_ID',
  'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH',
  'AGP_VERIFIER_ATTESTATION_SUBJECT_MISMATCH',
]);

const UNSUPPORTED_CODES = new Set<string>([
  'AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION',
  'AGP_VERIFIER_UNSUPPORTED_AGP_VERSION',
]);

export interface VerifyAgpBundleArgs {
  readonly bundle: AgpParsedBundle;
  readonly preIssues?: ReadonlyArray<AgpVerificationIssue>;
  readonly bundlePath?: string;
  readonly options?: AgpVerifierOptions;
}

export function verifyAgpBundle(args: VerifyAgpBundleArgs): AgpVerificationResult {
  const { bundle, preIssues = [], bundlePath, options = {} } = args;
  const schemas = loadSchemas(options.schemaRoot);

  // ── Run all checks. Order matters for issue list grouping but
  // verdict is computed from the final set of codes.
  const issues: AgpVerificationIssue[] = [...preIssues];
  issues.push(...runStructuralChecks(bundle));

  const schemaResult = runSchemaChecks(bundle, schemas);
  issues.push(...schemaResult.issues);

  issues.push(...runIdentityFormatChecks(bundle));
  issues.push(...runHashChecks(bundle));
  issues.push(...runManifestChecks(bundle));
  issues.push(...runSortChecks(bundle));
  issues.push(...runPlaneChecks(bundle));
  issues.push(...runPathChecks(bundle));

  const digestResult = runDigestChecks(bundle);
  issues.push(...digestResult.issues);

  issues.push(...runAttestationChecks(bundle));

  // ── Verdict resolution ────────────────────────────────────
  const verdict = resolveVerdict(issues, schemaResult.unsupportedSchema);

  const summary = buildSummary(bundle, issues, bundlePath);

  const strict = options.strict === true;
  let valid: boolean;
  if (verdict === 'valid') valid = true;
  else if (verdict === 'valid_with_warnings') valid = !strict;
  else valid = false;

  const result: AgpVerificationResult = {
    verdict,
    valid,
    bundlePath,
    summary,
    issues,
    snapshotDigest: bundle.snapshot.snapshotDigest ?? '',
    ...(options.deterministic === true
      ? {}
      : { checkedAt: nowIsoSeconds() }),
  };
  return result;
}

function resolveVerdict(
  issues: ReadonlyArray<AgpVerificationIssue>,
  unsupportedSchema: boolean,
): AgpVerificationVerdict {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const hasUnsupported = errors.some((i) => UNSUPPORTED_CODES.has(i.code));
  if (unsupportedSchema || hasUnsupported) return 'unsupported_schema';
  const tampered = errors.some((i) => TAMPERED_CODES.has(i.code));
  if (tampered) return 'tampered';
  if (errors.length > 0) return 'invalid';
  if (warnings.length > 0) return 'valid_with_warnings';
  return 'valid';
}

function buildSummary(
  bundle: AgpParsedBundle,
  issues: ReadonlyArray<AgpVerificationIssue>,
  bundlePath?: string,
): AgpVerificationSummary {
  const families: Record<string, number> = {};
  for (const r of bundle.records) {
    if (typeof r.family !== 'string') continue;
    families[r.family] = (families[r.family] ?? 0) + 1;
  }

  const plane = (f: AgpRecordFamily): 'factual' | 'evidence' | 'trust' | 'unknown' => {
    switch (f) {
      case 'node':
      case 'edge':
      case 'adapter_evidence':
      case 'diagnostic':
      case 'drift':
      case 'policy_finding':
        return 'factual';
      case 'observation':
        return 'evidence';
      case 'provenance':
      case 'attestation':
        return 'trust';
      default:
        return 'unknown';
    }
  };
  let factual = 0, evidence = 0, trust = 0;
  for (const r of bundle.records) {
    const p = plane(r.family as AgpRecordFamily);
    if (p === 'factual') factual++;
    else if (p === 'evidence') evidence++;
    else if (p === 'trust') trust++;
  }

  const hashing = bundle.snapshot.payload?.hashing as
    | { recordPayload?: string; snapshotDigest?: string }
    | undefined;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const pathLeakCount = issues.filter(
    (i) => i.code === 'AGP_VERIFIER_ABSOLUTE_PATH_LEAK',
  ).length;
  const tamperIssueCount = issues.filter((i) =>
    TAMPERED_CODES.has(i.code),
  ).length;

  return {
    bundlePath,
    snapshotDigest: bundle.snapshot.snapshotDigest ?? '',
    schemaVersion: String(bundle.snapshot.schemaVersion ?? ''),
    agpVersion: String(bundle.snapshot.payload?.agpVersion ?? ''),
    archEngineVersion: String(bundle.snapshot.payload?.archEngineVersion ?? ''),
    sourceCommand: String(bundle.snapshot.payload?.sourceCommand ?? ''),
    totalRecords: bundle.records.length,
    factualRecords: factual,
    evidenceRecords: evidence,
    trustRecords: trust,
    manifestEntries: (bundle.snapshot.payload?.records ?? []).length,
    families,
    algorithms: {
      recordPayload: hashing?.recordPayload ?? 'b3',
      snapshotDigest: hashing?.snapshotDigest ?? 'sha256',
    },
    pathLeakCount,
    tamperIssueCount,
    errorCount,
    warningCount,
  };
}

function nowIsoSeconds(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Re-export for convenience to consumers using the orchestrator
// directly.
export type { AgpParsedBundle, AgpRecord };
