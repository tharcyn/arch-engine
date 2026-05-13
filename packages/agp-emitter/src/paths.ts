/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Path safety utilities
 * ═══════════════════════════════════════════════════════════
 *
 *  AGP bundles MUST NOT contain absolute paths (per
 *  `docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md` §10.6).
 *  These helpers detect and reject them at multiple points:
 *
 *    1. validateInput.ts — pre-flight scan of the JSON v2 envelope.
 *    2. record mappers — defensive check while building payloads.
 *    3. emitAgpBundle — final output scan before serialisation.
 *
 *  Detection rules apply to every string value reachable in the
 *  object tree. We tolerate POSIX-relative paths only.
 */

import { AgpEmitterError } from './errors.js';

/**
 * Returns `true` when the value looks like an absolute path or a
 * known unsafe path pattern.
 */
export function looksAbsolute(value: string): boolean {
  if (value.length === 0) return false;
  // POSIX absolute
  if (value.startsWith('/')) return true;
  // Windows drive letter
  if (/^[A-Za-z]:[\\/]/.test(value)) return true;
  // Windows UNC
  if (value.startsWith('\\\\')) return true;
  // file:// URI
  if (value.startsWith('file://')) return true;
  return false;
}

/**
 * Returns `true` when the value is a valid POSIX-relative path that
 * the emitter accepts in bundle payloads. Does NOT allow `..`
 * traversal.
 */
export function isPosixRelativePath(value: string): boolean {
  if (value.length === 0) return false;
  if (looksAbsolute(value)) return false;
  if (value.includes('\\')) return false;
  if (/(^|\/)\.\.($|\/)/.test(value)) return false;
  return true;
}

/**
 * Scan an arbitrary value's string fields for absolute-path
 * patterns. Returns the first offending `(path, value)` pair, or
 * `null` when none are found.
 *
 * Only **path-like** keys are scanned heuristically; arbitrary
 * strings (e.g. `message`) are permitted to contain `/` as long as
 * they are not whole-string absolute paths in known formats.
 *
 * For MVP we scan two categories:
 *
 *   1. String values keyed by likely-path field names
 *      (`path`, `workspacePath`, `relativePath`, `absolutePath`,
 *      `matchedGlobs[*]`, `excludedGlobs[*]`, `sourceFiles[*]`).
 *   2. Whole-string values that look exactly like absolute paths.
 *
 *  The second pass is conservative: it does NOT regex inside long
 *  natural-language strings (diagnostic messages may legitimately
 *  contain `/usr/local`-style examples).
 */
export function scanForAbsolutePaths(
  root: unknown,
  pathPrefix = '$',
): { readonly path: string; readonly value: string } | null {
  if (root === null || root === undefined) return null;
  if (typeof root === 'string') {
    // Heuristic: only flag when the whole string is absolute (no
    // embedded prose). This avoids false positives on natural-language
    // diagnostic messages.
    if (looksAbsolute(root)) return { path: pathPrefix, value: root };
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
      if (isPathLikeKey(key) && typeof value === 'string' && looksAbsolute(value)) {
        return { path: `${pathPrefix}.${key}`, value };
      }
      const r = scanForAbsolutePaths(value, `${pathPrefix}.${key}`);
      if (r) return r;
    }
  }
  return null;
}

const PATH_LIKE_KEYS = new Set([
  'path',
  'workspacePath',
  'relativePath',
  'absolutePath',
  'workspaceFile',
  'inputPath',
  'outputPath',
  'envelopeRef',
]);

function isPathLikeKey(key: string): boolean {
  if (PATH_LIKE_KEYS.has(key)) return true;
  if (key.endsWith('Path')) return true;
  if (key === 'matchedGlobs' || key === 'excludedGlobs' || key === 'rawGlobs') return true;
  if (key === 'sourceFiles') return true;
  return false;
}

/**
 * Throw if any absolute path is found in `root`.
 */
export function rejectAbsolutePathsIn(
  root: unknown,
  context: string,
): void {
  const hit = scanForAbsolutePaths(root);
  if (hit) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_ABSOLUTE_PATH_REJECTED',
      message: `${context}: absolute path detected at ${hit.path}: ${JSON.stringify(hit.value)}`,
      fix: 'AGP bundles must contain only repo-relative POSIX paths. Re-run arch-engine in the target repo so paths are relative.',
      details: { path: hit.path, observed: hit.value },
    });
  }
}
