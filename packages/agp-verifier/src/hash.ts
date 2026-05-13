/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Hashing
 * ═══════════════════════════════════════════════════════════
 *
 *  AGP v1 hash algorithms (per spec §11):
 *    - per-record `payloadHash`  : `b3:<64-hex>`  (BLAKE3)
 *    - public `snapshotDigest`   : `sha256:<64-hex>` (SHA-256)
 *
 *  This implementation is independent of the emitter so that
 *  verifier and emitter can be swapped without breaking the
 *  protocol — if their output ever differs, that's a digest
 *  mismatch and the verifier MUST surface it.
 *
 *  Implementation:
 *    - BLAKE3 : `@noble/hashes/blake3`
 *    - SHA-256: Node `node:crypto`
 */

import { createHash } from 'node:crypto';
import { blake3 } from '@noble/hashes/blake3';

import { canonicalJson } from './canonicalize.js';

const TEXT_ENCODER = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

export function b3Hex(bytes: Uint8Array | string): string {
  const buf = typeof bytes === 'string' ? TEXT_ENCODER.encode(bytes) : bytes;
  const digest = blake3(buf);
  return `b3:${toHex(digest)}`;
}

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
 * Recompute payloadHash for a record's payload independently.
 * Pure function: takes only the payload bytes, never the outer
 * envelope.
 */
export function recomputePayloadHash(payload: Record<string, unknown>): string {
  return b3Hex(canonicalJson(payload));
}

/**
 * Compose the canonical record id given (family, kind, payloadHash).
 * Locked formula per spec §11.2:
 *
 *   id = "agp:" + family + ":" + kind + ":" + payloadHash
 */
export function expectedRecordId(
  family: string,
  kind: string,
  payloadHash: string,
): string {
  return `agp:${family}:${kind}:${payloadHash}`;
}

/**
 * Recompute the snapshot digest per spec §11.5.
 *
 * Steps:
 *   1. Take the snapshot payload as-built.
 *   2. Drop `emittedAt`.
 *   3. Filter `records[]` to factual-plane entries only.
 *   4. JCS-canonicalise the projection.
 *   5. SHA-256.
 *
 * Returns `sha256:<64-hex>`.
 *
 * The verifier passes in the parsed `snapshot.payload`. The
 * `snapshotDigest` self-reference in the parent object is NOT
 * included — it doesn't appear inside `payload`.
 */
export function recomputeSnapshotDigest(
  payload: Record<string, unknown>,
): string {
  const projection = projectForSnapshotDigest(payload);
  return sha256Hex(canonicalJson(projection));
}

function projectForSnapshotDigest(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...payload };
  // Drop emittedAt per spec §11.5.
  delete copy.emittedAt;
  // Filter records[] to factual plane only.
  const records = (copy.records as unknown as ReadonlyArray<{
    plane?: string;
  }>) ?? [];
  copy.records = records.filter((r) => r && r.plane === 'factual');
  return copy;
}
