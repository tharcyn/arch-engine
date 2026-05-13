/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Absolute path scan
 * ═══════════════════════════════════════════════════════════
 *
 *  AGP bundles MUST NOT contain absolute paths (spec §10.6).
 *  This module scans parsed snapshot + record payloads for any
 *  string value that looks absolute. Same detection rules as the
 *  emitter (re-implemented independently for verifier-emitter
 *  decoupling).
 *
 *  False-positive avoidance:
 *    - URLs (`https://`, `http://`, `ftp://`, etc.) are NOT
 *      treated as paths.
 *    - Schema `$id` URLs and `predicateType` URIs are tolerated.
 *    - The scan looks at *whole-string* matches for absolute path
 *      patterns; embedded `/usr/local`-style examples in natural
 *      language are NOT flagged.
 */

const ALLOWED_URL_PREFIXES = ['http://', 'https://', 'ftp://', 'git+'];

/**
 * Returns true when the string is a known URL form. We tolerate
 * these because they're not host-local absolute paths.
 */
function looksLikeUrl(value: string): boolean {
  for (const p of ALLOWED_URL_PREFIXES) {
    if (value.startsWith(p)) return true;
  }
  return false;
}

/**
 * Returns true when the whole string looks like a host-absolute
 * path that AGP forbids.
 */
export function looksAbsolutePath(value: string): boolean {
  if (value.length === 0) return false;
  if (looksLikeUrl(value)) return false;
  // POSIX absolute
  if (value.startsWith('/')) return true;
  // Windows drive letter (with optional separator) — match `C:`,
  // `C:/`, `C:\` etc.
  if (/^[A-Za-z]:[\\/]?/.test(value)) return true;
  // Windows UNC (`\\server\share`)
  if (value.startsWith('\\\\')) return true;
  // file:// URI is a host-absolute reference
  if (value.startsWith('file://')) return true;
  return false;
}

const URL_FIELD_KEYS = new Set([
  '$schema',
  'predicateType',
  'homepage',
  'repository',
  'docsHint',
  'url',
]);

/**
 * Walk the value tree and return the first absolute-path hit, or
 * `null` when none.
 *
 * Skips:
 *   - URL-style strings (http/https/ftp/git+/file://-with-host
 *     when allowed via specific keys).
 *   - The few schema $id / predicateType-style URL fields.
 *
 * Reports the JSON path of the hit (`$.a.b[2].c`).
 */
export function scanForAbsolutePaths(
  root: unknown,
  pathPrefix = '$',
): { readonly path: string; readonly value: string } | null {
  if (root === null || root === undefined) return null;
  if (typeof root === 'string') {
    if (looksAbsolutePath(root)) {
      return { path: pathPrefix, value: root };
    }
    return null;
  }
  if (Array.isArray(root)) {
    for (let i = 0; i < root.length; i++) {
      const r = scanForAbsolutePaths(root[i], `${pathPrefix}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (typeof root === 'object') {
    for (const [key, value] of Object.entries(root as Record<string, unknown>)) {
      // Tolerate `$schema` / `predicateType` URLs as a class.
      if (
        URL_FIELD_KEYS.has(key) &&
        typeof value === 'string' &&
        looksLikeUrl(value)
      ) {
        continue;
      }
      const r = scanForAbsolutePaths(value, `${pathPrefix}.${key}`);
      if (r) return r;
    }
  }
  return null;
}
