/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — JCS-style canonical JSON
 * ═══════════════════════════════════════════════════════════
 *
 *  Independent re-implementation of the same JCS-style canonical
 *  JSON the emitter uses.
 *
 *  IMPORTANT (verifier independence):
 *  The verifier MUST NOT import the emitter's canonicaliser; it
 *  must independently produce the same byte sequence for the same
 *  logical input. If the two ever drift, the verifier should
 *  catch it as a digest mismatch.
 *
 *  Approximates RFC 8785 JCS:
 *    - Object keys sorted lexicographically by UTF-16 code unit.
 *    - No insignificant whitespace.
 *    - JSON.stringify-style string escaping.
 *    - Arrays preserved in caller-supplied order.
 *    - Booleans/null emitted as `true`/`false`/`null`.
 *    - Numbers: integers and short decimals via `String(n)`; rejects
 *      `NaN` / `Infinity` / `-Infinity` / non-finite numbers.
 *    - `undefined` object properties are omitted.
 *
 *  Output is always a UTF-8-encodable string with no trailing
 *  newline.
 */

import { AgpVerifierError } from './errors.js';

export function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  return emit(value, seen);
}

function emit(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return 'null';
  if (value === undefined) {
    throw nonRepresentable('undefined');
  }

  const t = typeof value;
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(value);

  if (t === 'number') {
    const n = value as number;
    if (!Number.isFinite(n)) {
      throw nonRepresentable(`non-finite number ${String(n)}`);
    }
    return String(n);
  }

  if (t === 'bigint' || t === 'function' || t === 'symbol') {
    throw nonRepresentable(`unrepresentable ${t}`);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) throw nonRepresentable('circular reference');
    seen.add(value);
    const parts = value.map((el) => emit(el, seen));
    return `[${parts.join(',')}]`;
  }

  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) throw nonRepresentable('circular reference');
    seen.add(obj);
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) continue;
      parts.push(`${JSON.stringify(k)}:${emit(v, seen)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw nonRepresentable('unrepresentable value');
}

function nonRepresentable(detail: string): AgpVerifierError {
  return new AgpVerifierError({
    code: 'AGP_VERIFIER_INTERNAL_ERROR',
    message: `Cannot canonicalise during verification: ${detail}`,
    fix: 'Bundle contains a non-representable JSON value. Re-emit the bundle.',
  });
}
