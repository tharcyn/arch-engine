/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Hashing
 * ═══════════════════════════════════════════════════════════
 *
 *  AGP v1 hash algorithms:
 *    - per-record `payloadHash`  : `b3:<64-hex>`  (BLAKE3)
 *    - public `snapshotDigest`   : `sha256:<64-hex>` (SHA-256)
 *    - `inputDigest` (provenance): `sha256:<64-hex>` (SHA-256)
 *
 *  Why BLAKE3 internal? Faster, modern, content-address friendly.
 *  Why SHA-256 public? Compatibility with OCI / SLSA / in-toto /
 *  Sigstore ecosystems consuming `snapshotDigest` as a subject.
 *
 *  Implementation:
 *    - BLAKE3: `@noble/hashes/blake3` (audited, pure JS, zero
 *      transitive deps).
 *    - SHA-256: Node's built-in `node:crypto`.
 */

import { createHash } from 'node:crypto';
import { blake3 } from '@noble/hashes/blake3';

import { canonicalJson } from './canonicalize.js';
import type { AgpRecord, AgpRecordFamily } from './types.js';

const TEXT_ENCODER = new TextEncoder();

/**
 * Hex-encode the bytes from a BLAKE3 / SHA-256 digest.
 */
function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * BLAKE3 hash over UTF-8-encoded bytes; returns `b3:<64-hex>`.
 */
export function b3Hex(bytes: Uint8Array | string): string {
  const buf =
    typeof bytes === 'string' ? TEXT_ENCODER.encode(bytes) : bytes;
  const digest = blake3(buf);
  return `b3:${toHex(digest)}`;
}

/**
 * SHA-256 hash over UTF-8-encoded bytes; returns `sha256:<64-hex>`.
 */
export function sha256Hex(bytes: Uint8Array | string): string {
  const h = createHash('sha256');
  if (typeof bytes === 'string') {
    h.update(bytes, 'utf8');
  } else {
    h.update(Buffer.from(bytes));
  }
  return `sha256:${h.digest('hex')}`;
}

/**
 * Compute `payloadHash` for a record. Operates on the payload
 * bytes only — never on the outer envelope. Pure function.
 */
export function payloadHashFor(payload: Record<string, unknown>): string {
  return b3Hex(canonicalJson(payload));
}

/**
 * Compose a record `id` from family + kind + payloadHash. Locked
 * formula per spec §11.2:
 *
 *   id = "agp:" + family + ":" + kind + ":" + payloadHash
 */
export function recordIdFor(
  family: AgpRecordFamily,
  kind: string,
  payloadHash: string,
): string {
  return `agp:${family}:${kind}:${payloadHash}`;
}

/**
 * Assemble a record object with deterministic `payloadHash` and
 * `id`. Keeps the construction logic in one place so families
 * can't accidentally diverge on field ordering.
 */
export function buildRecord(args: {
  family: AgpRecordFamily;
  kind: string;
  plane: AgpRecord['plane'];
  payload: Record<string, unknown>;
}): AgpRecord {
  const payloadHash = payloadHashFor(args.payload);
  const id = recordIdFor(args.family, args.kind, payloadHash);
  return {
    schemaVersion: 'agp.record.v1',
    family: args.family,
    kind: args.kind,
    id,
    plane: args.plane,
    payloadHash,
    payload: args.payload,
  };
}

/**
 * Compute the snapshot digest per spec §11.5.
 *
 * Steps:
 *   1. Take the snapshot payload as-built.
 *   2. Drop `emittedAt`.
 *   3. Filter `records[]` to factual-plane entries.
 *   4. JCS-canonicalise the projection.
 *   5. SHA-256 the bytes.
 *
 * The caller stamps the resulting digest into `snapshot.snapshotDigest`
 * AFTER computation.
 */
export function computeSnapshotDigest(payload: Record<string, unknown>): string {
  const projection = projectForSnapshotDigest(payload);
  return sha256Hex(canonicalJson(projection));
}

function projectForSnapshotDigest(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...payload };
  // Drop emittedAt (excluded from digest per spec §10.5 / §11.5).
  delete copy.emittedAt;
  // Filter records[] to factual plane only.
  const records = (copy.records as unknown as ReadonlyArray<{
    plane: string;
  }>) ?? [];
  copy.records = records.filter((r) => r && r.plane === 'factual');
  return copy;
}
