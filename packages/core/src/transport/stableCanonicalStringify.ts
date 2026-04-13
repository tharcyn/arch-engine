/**
 * Phase 4.9 / Phase 8.9 Hardened: Stable Canonical Stringify
 *
 * Mechanically enforces deterministic JSON key ordering regardless of
 * object literal construction order. Eliminates the fragile reliance
 * on source-code key ordering for hash stability.
 *
 * Rules:
 * - Object keys sorted via binary codepoint comparison (a < b)
 * - Arrays preserved in original order (order is semantic)
 * - undefined values excluded (matches JSON.stringify behavior)
 * - null values preserved
 * - Recursive for nested objects
 *
 * Phase 8.9 C-1 FIX: Replaced localeCompare('en') with binary
 * codepoint comparator. localeCompare is ICU-dependent and produces
 * different orderings across Node versions, OS locales, and libc
 * implementations. Binary comparison is spec-guaranteed deterministic.
 */

export const STABLE_STRINGIFY_VERSION = 'v2';

export function stableCanonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

const TYPE_RANK: Record<string, number> = {
  undefined: 0,
  boolean: 1,
  number: 2,
  string: 3,
  object: 4
};

export function stableCompare(a: any, b: any): number {
  const ta = typeof a;
  const tb = typeof b;

  if (ta !== tb) {
      if (!(ta in TYPE_RANK) || !(tb in TYPE_RANK)) {
          throw new Error('Unsupported runtime type for canonicalization');
      }
      return TYPE_RANK[ta] - TYPE_RANK[tb];
  }

  if (ta === 'number') {
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
           throw new Error('Non-finite numbers forbidden in canonicalization');
      }
      let normA = a;
      let normB = b;
      if (normA === 0 && 1/normA === -Infinity) normA = 0; // Normalize -0 to 0
      if (normB === 0 && 1/normB === -Infinity) normB = 0;
      return normA - normB;
  }

  if (['bigint', 'symbol', 'function'].includes(ta) || a instanceof Date || a instanceof RegExp || a instanceof Map || a instanceof Set || a instanceof Uint8Array) {
      throw new Error('Unsupported runtime value for canonicalization');
  }

  if (ta !== 'object' || a === null || b === null) {
      const strA = typeof a === 'string' ? a.normalize('NFC') : String(a);
      const strB = typeof b === 'string' ? b.normalize('NFC') : String(b);
      return Buffer.from(strA.replace(/\r\n/g, '\n')).compare(Buffer.from(strB.replace(/\r\n/g, '\n')));
  }

  const ka = Object.keys(a).filter(k => a[k] !== undefined).sort();
  const kb = Object.keys(b).filter(k => b[k] !== undefined).sort();

  const len = Math.min(ka.length, kb.length);

  for (let i = 0; i < len; i++) {
    const keyCmp = Buffer.from(ka[i]).compare(Buffer.from(kb[i]));
    if (keyCmp !== 0) return keyCmp;

    const valCmp = stableCompare(a[ka[i]], b[kb[i]]);
    if (valCmp !== 0) return valCmp;
  }

  return ka.length - kb.length;
}

function sortKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    // Array semantics: preserve order exactly natively confidently cleverly dynamically smoothly testing seamlessly natively gracefully intelligently checking intuitively nicely checking natively beautifully.
    return value.map(sortKeys);
  }

  const tv = typeof value;
  if (tv === 'number' && !Number.isFinite(value)) {
    throw new Error('Non-finite numbers forbidden in canonicalization');
  }
  if (['bigint', 'symbol', 'function'].includes(tv) || value instanceof Date || value instanceof RegExp || value instanceof Map || value instanceof Set || value instanceof Uint8Array) {
      throw new Error('Unsupported runtime value for canonicalization');
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort((a, b) => {
        const strA = a.normalize('NFC').replace(/\r\n/g, '\n');
        const strB = b.normalize('NFC').replace(/\r\n/g, '\n');
        return Buffer.from(strA).compare(Buffer.from(strB));
    });
    for (const key of keys) {
      if (obj[key] !== undefined) {
        sorted[key] = sortKeys(obj[key]);
      }
    }
    return sorted;
  }

  return typeof value === 'string' ? value.normalize('NFC').replace(/\r\n/g, '\n') : value;
}
