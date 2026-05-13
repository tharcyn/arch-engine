/**
 * ═══════════════════════════════════════════════════════════
 *  Manifest ↔ records bijection checks
 * ═══════════════════════════════════════════════════════════
 *
 *  Required invariants (spec §16.2 #7 / conformance §5):
 *    - Every snapshot.payload.records[].id has a matching line in
 *      records.ndjson.
 *    - Every line in records.ndjson is referenced exactly once in
 *      snapshot.payload.records[].
 *    - id / family / kind / plane / payloadHash AGREE at every
 *      cross-reference.
 *    - No duplicate record IDs in records.ndjson.
 *    - No duplicate manifest IDs.
 *    - The 13 count fields in snapshot.payload.counts match the
 *      observed record stream + manifest.
 */

import type {
  AgpParsedBundle,
  AgpVerificationIssue,
  AgpRecord,
  AgpSnapshotManifestEntry,
} from '../types.js';

export function runManifestChecks(
  bundle: AgpParsedBundle,
): ReadonlyArray<AgpVerificationIssue> {
  const issues: AgpVerificationIssue[] = [];

  const manifest = (bundle.snapshot.payload.records ?? []) as ReadonlyArray<AgpSnapshotManifestEntry>;
  const records = bundle.records;

  // ── Duplicate detection ─────────────────────────────────────
  const seenRecordIds = new Map<string, number>();
  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (typeof r.id !== 'string') continue;
    const prev = seenRecordIds.get(r.id);
    if (prev !== undefined) {
      issues.push({
        code: 'AGP_VERIFIER_DUPLICATE_RECORD_ID',
        severity: 'error',
        message: `Duplicate record id in records.ndjson: ${r.id} (first seen at line ${prev + 1}, repeated at line ${i + 1})`,
        recordId: r.id,
        lineNumber: i + 1,
      });
    } else {
      seenRecordIds.set(r.id, i);
    }
  }

  const seenManifestIds = new Map<string, number>();
  for (let i = 0; i < manifest.length; i++) {
    const m = manifest[i]!;
    if (typeof m.id !== 'string') continue;
    const prev = seenManifestIds.get(m.id);
    if (prev !== undefined) {
      issues.push({
        code: 'AGP_VERIFIER_DUPLICATE_MANIFEST_ID',
        severity: 'error',
        message: `Duplicate manifest id in snapshot.payload.records[]: ${m.id} (first at index ${prev}, repeated at index ${i})`,
        recordId: m.id,
      });
    } else {
      seenManifestIds.set(m.id, i);
    }
  }

  // ── Bijection ───────────────────────────────────────────────
  const manifestById = new Map<string, AgpSnapshotManifestEntry>();
  for (const m of manifest) {
    if (typeof m.id === 'string') manifestById.set(m.id, m);
  }
  const recordsById = new Map<string, { record: AgpRecord; lineNumber: number }>();
  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (typeof r.id === 'string' && !recordsById.has(r.id)) {
      recordsById.set(r.id, { record: r, lineNumber: i + 1 });
    }
  }

  for (const m of manifest) {
    if (typeof m.id !== 'string') continue;
    if (!recordsById.has(m.id)) {
      issues.push({
        code: 'AGP_VERIFIER_MANIFEST_RECORD_MISSING',
        severity: 'error',
        message: `Manifest entry has no matching record in records.ndjson: ${m.id}`,
        recordId: m.id,
        family: m.family,
        kind: m.kind,
      });
    }
  }
  for (const r of records) {
    if (typeof r.id !== 'string') continue;
    if (!manifestById.has(r.id)) {
      issues.push({
        code: 'AGP_VERIFIER_RECORD_NOT_IN_MANIFEST',
        severity: 'error',
        message: `Record appears in records.ndjson but is not listed in snapshot.payload.records[]: ${r.id}`,
        recordId: r.id,
        family: r.family,
        kind: r.kind,
      });
    }
  }

  // ── Cross-reference field agreement ─────────────────────────
  for (const r of records) {
    if (typeof r.id !== 'string') continue;
    const m = manifestById.get(r.id);
    if (!m) continue;
    if (m.family !== r.family) {
      issues.push({
        code: 'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH',
        severity: 'error',
        message: `Manifest/record family mismatch for ${r.id}: manifest=${m.family}, record=${r.family}`,
        recordId: r.id,
        observed: m.family,
        expected: r.family,
      });
    }
    if (m.kind !== r.kind) {
      issues.push({
        code: 'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH',
        severity: 'error',
        message: `Manifest/record kind mismatch for ${r.id}: manifest=${m.kind}, record=${r.kind}`,
        recordId: r.id,
        observed: m.kind,
        expected: r.kind,
      });
    }
    if (m.plane !== r.plane) {
      issues.push({
        code: 'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH',
        severity: 'error',
        message: `Manifest/record plane mismatch for ${r.id}: manifest=${m.plane}, record=${r.plane}`,
        recordId: r.id,
        observed: m.plane,
        expected: r.plane,
      });
    }
    if (m.payloadHash !== r.payloadHash) {
      issues.push({
        code: 'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH',
        severity: 'error',
        message: `Manifest/record payloadHash mismatch for ${r.id}: manifest=${m.payloadHash}, record=${r.payloadHash}`,
        recordId: r.id,
        observed: m.payloadHash,
        expected: r.payloadHash,
      });
    }
  }

  // ── Counts consistency ──────────────────────────────────────
  const counts = bundle.snapshot.payload.counts ?? {};
  const actualCounts = computeCounts(records);
  for (const [key, expected] of Object.entries(actualCounts)) {
    const declared = (counts as Record<string, unknown>)[key];
    if (typeof declared === 'number' && declared !== expected) {
      issues.push({
        code: 'AGP_VERIFIER_COUNT_MISMATCH',
        severity: 'error',
        message: `snapshot.payload.counts.${key} declared ${declared}, actual ${expected}`,
        path: `$.payload.counts.${key}`,
        observed: declared,
        expected,
      });
    }
  }

  return issues;
}

function computeCounts(records: ReadonlyArray<AgpRecord>): Record<string, number> {
  let nodes = 0, edges = 0, adapterEvidence = 0, diagnostics = 0;
  let drift = 0, policy = 0, prov = 0, obs = 0, att = 0;
  let factual = 0, evidence = 0, trust = 0;
  for (const r of records) {
    switch (r.family) {
      case 'node': nodes++; break;
      case 'edge': edges++; break;
      case 'adapter_evidence': adapterEvidence++; break;
      case 'diagnostic': diagnostics++; break;
      case 'drift': drift++; break;
      case 'policy_finding': policy++; break;
      case 'provenance': prov++; break;
      case 'observation': obs++; break;
      case 'attestation': att++; break;
    }
    switch (r.plane) {
      case 'factual': factual++; break;
      case 'evidence': evidence++; break;
      case 'trust': trust++; break;
    }
  }
  return {
    totalRecords: records.length,
    factualRecords: factual,
    evidenceRecords: evidence,
    trustRecords: trust,
    nodes,
    edges,
    adapterEvidence,
    diagnostics,
    driftRecords: drift,
    policyFindings: policy,
    provenanceRecords: prov,
    observationRecords: obs,
    attestationRecords: att,
  };
}
