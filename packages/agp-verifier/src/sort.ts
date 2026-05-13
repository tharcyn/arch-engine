/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Sort-order check
 * ═══════════════════════════════════════════════════════════
 *
 *  Per spec §10.4 + conformance README §6, records.ndjson lines
 *  MUST be sorted by:
 *
 *    (family, kind, primaryKey, payloadHash)
 *
 *  Family primary keys:
 *    node              → payload.nodeId
 *    edge              → payload.from + "|" + payload.to + "|" + payload.type
 *    adapter_evidence  → payload.name
 *    diagnostic        → (severity-rank-desc, code, message) joined
 *    drift             → baseline.snapshotDigest + "|" + current.snapshotDigest + "|" + <kind-subkey>
 *    policy_finding    → payload.findingId
 *    provenance        → payload.command
 *    observation       → (observer.type, observer.model, observer.modelVersion, body.kind)
 *    attestation       → record.kind
 *
 *  Implementation mirrors the emitter's sort.ts independently.
 */

import type { AgpRecord } from './types.js';

const SEVERITY_RANK: Record<string, number> = {
  INTERNAL: 5,
  BLOCKING: 4,
  ERROR: 3,
  WARNING: 2,
  INFO: 1,
};

export function compareRecordsBySortOrder(a: AgpRecord, b: AgpRecord): number {
  if (a.family !== b.family) return a.family < b.family ? -1 : 1;
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;

  const ak = primaryKey(a);
  const bk = primaryKey(b);
  if (ak !== bk) return ak < bk ? -1 : 1;

  if (a.payloadHash !== b.payloadHash) return a.payloadHash < b.payloadHash ? -1 : 1;
  return 0;
}

export function primaryKey(r: AgpRecord): string {
  const p = r.payload as Record<string, unknown>;
  switch (r.family) {
    case 'node':
      return String(p.nodeId ?? '');
    case 'edge':
      return `${p.from ?? ''}|${p.to ?? ''}|${p.type ?? ''}`;
    case 'adapter_evidence':
      return String(p.name ?? '');
    case 'diagnostic': {
      const sev = String(p.severity ?? '');
      const rank = SEVERITY_RANK[sev] ?? 0;
      const rankToken = String(9 - rank);
      return `${rankToken}|${p.code ?? ''}|${p.message ?? ''}`;
    }
    case 'drift': {
      const baseline =
        (p.baseline as Record<string, unknown> | undefined)?.snapshotDigest ?? '';
      const current =
        (p.current as Record<string, unknown> | undefined)?.snapshotDigest ?? '';
      let sub = '';
      if (p.node) sub = `node:${(p.node as { id: string }).id}`;
      else if (p.edge) {
        const e = p.edge as { from: string; to: string; type: string };
        sub = `edge:${e.from}->${e.to}|${e.type}`;
      } else if (p.violation) sub = `violation:${(p.violation as { id: string }).id}`;
      else if (p.severityChange) sub = `severityChange:${(p.severityChange as { id: string }).id}`;
      else if (p.deltas) sub = 'signal';
      return `${baseline}|${current}|${sub}`;
    }
    case 'policy_finding':
      return String(p.findingId ?? '');
    case 'provenance':
      return String(p.command ?? '');
    case 'observation': {
      const ob = p.observer as Record<string, unknown> | undefined;
      const body = p.body as Record<string, unknown> | undefined;
      return `${ob?.type ?? ''}|${ob?.model ?? ''}|${ob?.modelVersion ?? ''}|${body?.kind ?? ''}`;
    }
    case 'attestation':
      return r.kind;
    default:
      return '';
  }
}

/**
 * Identify the first index at which the records[] stream is out of
 * sort order, or -1 when fully sorted.
 */
export function findFirstSortViolation(
  records: ReadonlyArray<AgpRecord>,
): number {
  for (let i = 1; i < records.length; i++) {
    const cmp = compareRecordsBySortOrder(records[i - 1]!, records[i]!);
    if (cmp > 0) return i;
  }
  return -1;
}
