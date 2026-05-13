/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — JCS-style canonical JSON
 * ═══════════════════════════════════════════════════════════
 *
 *  MVP canonicalisation. Aims for the property the spec needs:
 *  **byte-identical output for byte-identical logical input.**
 *
 *  Approximates RFC 8785 JCS:
 *    - Object keys sorted lexicographically by UTF-16 code unit.
 *    - No insignificant whitespace.
 *    - JSON.stringify-style string escaping.
 *    - Arrays preserved in caller-supplied order.
 *    - Booleans/null emitted as `true`/`false`/`null`.
 *    - Numbers: integers and short decimals via `String(n)`; rejects
 *      `NaN` / `Infinity` / `-Infinity` / non-finite numbers.
 *
 *  Deviations from full RFC 8785:
 *    - Number serialisation differs from RFC 8785 ECMAScript number
 *      formatting in edge cases (very-large floats with exponent
 *      notation). The MVP corpus and Arch-Engine JSON v2 do not
 *      produce such values, so this is safe in practice. The spec
 *      documents the deviation and the v0.2 emitter will tighten
 *      to RFC 8785 number formatting.
 *    - We do NOT NFC-normalise strings (Node strings are already
 *      UTF-16; Arch-Engine JSON v2 input is ASCII / NFC by source).
 *
 *  Output is always a UTF-8-encodable string with no trailing
 *  newline.
 */

import { AgpEmitterError } from './errors.js';

/**
 * Canonicalise a JSON-like value to a deterministic string.
 *
 * Throws `AgpEmitterError(AGP_EMITTER_OUTPUT_VALIDATION_FAILED)`
 * on unrepresentable inputs (BigInt, function, symbol, undefined,
 * NaN/Infinity, circular references).
 */
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
    // JS's String(n) matches JSON.stringify(n) for numbers, which
    // is the de facto "ECMAScript number" form. Adequate for MVP.
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
    // Lexicographic sort by UTF-16 code unit (the default JS
    // string comparison). RFC 8785 §3.2.3 calls for the same.
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) continue; // omit undefined per JCS
      parts.push(`${JSON.stringify(k)}:${emit(v, seen)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw nonRepresentable(`unrepresentable value`);
}

function nonRepresentable(detail: string): AgpEmitterError {
  return new AgpEmitterError({
    code: 'AGP_EMITTER_OUTPUT_VALIDATION_FAILED',
    message: `Cannot canonicalise: ${detail}`,
    fix: 'Remove non-JSON values (BigInt, functions, symbols, undefined, NaN, Infinity) from the input before emitting.',
  });
}
