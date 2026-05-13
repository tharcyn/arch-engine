/**
 * ═══════════════════════════════════════════════════════════
 *  Schema validation checks
 * ═══════════════════════════════════════════════════════════
 *
 *  - snapshot.json against `snapshot.schema.json`
 *  - each record against `record.schema.json`
 *
 *  Schema errors are reported as `AGP_VERIFIER_SCHEMA_VALIDATION_FAILED`
 *  with the Ajv error path and message. Verdict for any error here
 *  is `invalid`.
 */

import type { LoadedSchemas } from '../schemas.js';
import type {
  AgpParsedBundle,
  AgpRecord,
  AgpVerificationIssue,
} from '../types.js';

const SUPPORTED_AGP_MAJOR = 1;
const SUPPORTED_RECORD_SCHEMA_VERSIONS = new Set(['agp.record.v1']);
const SUPPORTED_SNAPSHOT_SCHEMA_VERSIONS = new Set(['agp.snapshot.v1']);

export interface SchemaCheckResult {
  readonly issues: ReadonlyArray<AgpVerificationIssue>;
  /** True when any unsupported_schema condition was hit (verdict short-circuits). */
  readonly unsupportedSchema: boolean;
}

export function runSchemaChecks(
  bundle: AgpParsedBundle,
  schemas: LoadedSchemas,
): SchemaCheckResult {
  const issues: AgpVerificationIssue[] = [];
  let unsupportedSchema = false;

  // ── Version gates ──────────────────────────────────────────
  const agpVer = String(bundle.snapshot.payload?.agpVersion ?? '');
  if (!agpVer || !/^\d+\.\d+\.\d+/.test(agpVer)) {
    issues.push({
      code: 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
      severity: 'error',
      message: `snapshot.payload.agpVersion missing or malformed: ${JSON.stringify(agpVer)}`,
      path: '$.payload.agpVersion',
    });
  } else {
    const major = Number(agpVer.split('.')[0]);
    if (major !== SUPPORTED_AGP_MAJOR) {
      issues.push({
        code: 'AGP_VERIFIER_UNSUPPORTED_AGP_VERSION',
        severity: 'error',
        message: `Unsupported agpVersion: ${agpVer}. Verifier supports AGP v${SUPPORTED_AGP_MAJOR}.x.`,
        observed: agpVer,
        expected: `${SUPPORTED_AGP_MAJOR}.x.x`,
      });
      unsupportedSchema = true;
    }
  }

  const snapshotSchema = String(bundle.snapshot.schemaVersion ?? '');
  if (!SUPPORTED_SNAPSHOT_SCHEMA_VERSIONS.has(snapshotSchema)) {
    issues.push({
      code: 'AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION',
      severity: 'error',
      message: `Unsupported snapshot schemaVersion: ${JSON.stringify(snapshotSchema)}`,
      observed: snapshotSchema,
      expected: [...SUPPORTED_SNAPSHOT_SCHEMA_VERSIONS],
    });
    unsupportedSchema = true;
  }

  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    const sv = String(r.schemaVersion ?? '');
    if (!SUPPORTED_RECORD_SCHEMA_VERSIONS.has(sv)) {
      issues.push({
        code: 'AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION',
        severity: 'error',
        message: `records.ndjson line ${i + 1}: unsupported record schemaVersion ${JSON.stringify(sv)}`,
        recordId: typeof r.id === 'string' ? r.id : undefined,
        family: r.family,
        kind: r.kind,
        lineNumber: i + 1,
        observed: sv,
        expected: [...SUPPORTED_RECORD_SCHEMA_VERSIONS],
      });
      unsupportedSchema = true;
    }
  }

  // If unsupported_schema is true we still continue schema-shape
  // validation so the caller has a fuller picture, but the verdict
  // will be unsupported_schema regardless of downstream issues.

  // ── snapshot.json schema validation ─────────────────────────
  const snapshotOk = schemas.validateSnapshot(bundle.snapshot);
  if (!snapshotOk) {
    for (const e of schemas.snapshotErrors()) {
      issues.push({
        code: 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
        severity: 'error',
        message: `snapshot.json: ${e.message ?? 'failed schema validation'} at ${e.instancePath || '(root)'}`,
        path: `snapshot.json:${e.instancePath || '(root)'}`,
      });
    }
  }

  // ── per-record schema validation ────────────────────────────
  for (let i = 0; i < bundle.records.length; i++) {
    const r = bundle.records[i]!;
    const ok = schemas.validateRecord(r);
    if (!ok) {
      for (const e of schemas.recordErrors()) {
        issues.push({
          code: 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
          severity: 'error',
          message: `records.ndjson line ${i + 1}: ${e.message ?? 'failed schema validation'} at ${e.instancePath || '(root)'}`,
          path: `records.ndjson:${i + 1}${e.instancePath ?? ''}`,
          recordId: typeof r.id === 'string' ? r.id : undefined,
          family: (r as AgpRecord).family,
          kind: (r as AgpRecord).kind,
          lineNumber: i + 1,
        });
      }
    }
  }

  return { issues, unsupportedSchema };
}
