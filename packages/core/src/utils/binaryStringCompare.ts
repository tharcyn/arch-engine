/**
 * Binary codepoint string comparator for deterministic ordering.
 *
 * Replaces localeCompare in all deterministic-critical code paths.
 * localeCompare is ICU-dependent and produces different orderings
 * across Node versions, OS locales, and libc implementations.
 * Binary comparison uses JavaScript's built-in string comparison
 * operators which are spec-guaranteed to use UTF-16 code unit
 * ordering — deterministic across all environments.
 *
 * MUST be used in:
 *   - Capability negotiation sorting
 *   - Dependency closure resolution ordering
 *   - Trust envelope key ordering
 *   - Rejected provider ordering
 *   - Overlay resolution tie-breaking
 *
 * MUST NOT be used for:
 *   - User-facing display sorting (where locale matters)
 */
export function binaryStringCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
