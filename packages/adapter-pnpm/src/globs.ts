/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-pnpm — Glob expansion
 * ═══════════════════════════════════════════════════════════
 *
 *  Deterministic, dependency-free glob expansion for the subset of
 *  patterns pnpm workspaces use:
 *
 *    apps/<star>            — single-segment wildcard
 *    packages/<star>/<star> — two-segment nested wildcard
 *    !packages/skip-<star>  — exclusion (applied AFTER inclusion)
 *
 *  Out of scope for v0.1.0:
 *    `**` (recursive)
 *    brace expansion `{api,web}`
 *    deep wildcards
 *
 *  Always-ignored directories at every recursion level:
 *    node_modules, .git, dist, build, .turbo, .next,
 *    .arch-engine, .pnpm-store
 *
 *  Determinism rules:
 *    - directory listings sorted lexicographically before scan
 *    - exclusion globs evaluated against the relative POSIX path
 *      AFTER inclusion expansion
 *    - relative POSIX paths only — no absolute paths leak out
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ALWAYS_IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.turbo',
  '.next',
  '.arch-engine',
  '.pnpm-store',
]);

/**
 * Expansion of a single workspace glob list. Caller is responsible
 * for filtering by `package.json` presence — this function returns
 * directory paths only.
 */
export interface GlobExpansion {
  /** Sorted, deduplicated, relative POSIX directory paths. */
  readonly matchedDirs: ReadonlyArray<string>;
  /** Sorted, deduplicated, relative POSIX directory paths that were excluded by `!…`. */
  readonly excludedDirs: ReadonlyArray<string>;
  /** Soft warnings (e.g. unsupported pattern dropped). */
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Expand a list of pnpm workspace globs into directory paths
 * (relative POSIX) under `cwd`.
 */
export function expandWorkspaceGlobs(
  cwd: string,
  globs: ReadonlyArray<string>,
): GlobExpansion {
  const warnings: string[] = [];

  // Partition into inclusion and exclusion patterns.
  const includes: string[] = [];
  const excludes: string[] = [];
  for (const raw of globs) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('!')) {
      excludes.push(trimmed.slice(1));
    } else {
      includes.push(trimmed);
    }
  }

  // Sort for determinism — pnpm itself sorts after glob expansion;
  // we sort the inputs to make the iteration order stable too.
  includes.sort();
  excludes.sort();

  const matched = new Set<string>();

  for (const glob of includes) {
    const expansion = expandOne(cwd, glob, warnings);
    for (const dir of expansion) matched.add(dir);
  }

  // Build a regex matcher per exclude pattern.
  const excludeMatchers = excludes
    .map((glob) => buildGlobMatcher(glob, warnings))
    .filter((m): m is RegExp => m !== null);

  const finalMatched: string[] = [];
  const excluded: string[] = [];

  for (const rel of [...matched].sort()) {
    if (excludeMatchers.some((re) => re.test(rel))) {
      excluded.push(rel);
    } else {
      finalMatched.push(rel);
    }
  }

  return {
    matchedDirs: finalMatched,
    excludedDirs: excluded.sort(),
    warnings,
  };
}

// ─── Inclusion expansion ───────────────────────────────

function expandOne(cwd: string, glob: string, warnings: string[]): string[] {
  // Normalise leading `./`
  let pattern = glob;
  if (pattern.startsWith('./')) pattern = pattern.slice(2);

  // Reject patterns containing `..` (security; pnpm doesn't allow
  // them anyway).
  if (pattern.includes('..')) {
    warnings.push(`Glob \`${glob}\` contains \`..\` and is ignored.`);
    return [];
  }

  // Recursive `**` is unsupported in v0.1.0.
  if (pattern.includes('**')) {
    warnings.push(`Glob \`${glob}\` uses \`**\` which is not supported in v0.1.0; skipped.`);
    return [];
  }

  const segments = pattern.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) return [];

  // Walk segments depth-first, expanding each `*` against directory listings.
  const results = new Set<string>();
  walkSegments(cwd, segments, 0, '', results);
  return [...results];
}

function walkSegments(
  cwd: string,
  segments: ReadonlyArray<string>,
  idx: number,
  accumulator: string,
  out: Set<string>,
): void {
  if (idx === segments.length) {
    // Reached the leaf — record the accumulated directory.
    const rel = accumulator.replace(/\/$/, '');
    if (rel.length > 0) out.add(rel);
    return;
  }
  const seg = segments[idx]!;

  if (seg === '*') {
    // Wildcard: enumerate all child directories of `accumulator`.
    const dirAbs = path.join(cwd, accumulator);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    const childDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !ALWAYS_IGNORE.has(name))
      .sort();
    for (const child of childDirs) {
      walkSegments(cwd, segments, idx + 1, joinRel(accumulator, child), out);
    }
    return;
  }

  if (seg.includes('*')) {
    // Partial wildcard segment like `pkg-*`. Build a matcher.
    const dirAbs = path.join(cwd, accumulator);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    const re = segmentToRegex(seg);
    const childDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !ALWAYS_IGNORE.has(name))
      .filter((name) => re.test(name))
      .sort();
    for (const child of childDirs) {
      walkSegments(cwd, segments, idx + 1, joinRel(accumulator, child), out);
    }
    return;
  }

  // Literal segment: descend only if the directory exists.
  if (ALWAYS_IGNORE.has(seg)) return;
  const candidate = joinRel(accumulator, seg);
  const candidateAbs = path.join(cwd, candidate);
  try {
    const st = fs.statSync(candidateAbs);
    if (!st.isDirectory()) return;
  } catch {
    return;
  }
  walkSegments(cwd, segments, idx + 1, candidate, out);
}

function joinRel(left: string, right: string): string {
  if (left.length === 0) return right;
  if (left.endsWith('/')) return `${left}${right}`;
  return `${left}/${right}`;
}

function segmentToRegex(segment: string): RegExp {
  // Replace `*` (non-slash) with `[^/]*`, escape everything else.
  let pattern = '^';
  for (const ch of segment) {
    if (ch === '*') {
      pattern += '[^/]*';
    } else if (/[.+?^${}()|[\]\\]/.test(ch)) {
      pattern += `\\${ch}`;
    } else {
      pattern += ch;
    }
  }
  pattern += '$';
  return new RegExp(pattern);
}

// ─── Exclusion matchers ─────────────────────────────────

function buildGlobMatcher(glob: string, warnings: string[]): RegExp | null {
  let pattern = glob;
  if (pattern.startsWith('./')) pattern = pattern.slice(2);
  if (pattern.includes('..')) {
    warnings.push(`Exclusion glob \`${glob}\` contains \`..\` and is ignored.`);
    return null;
  }
  // Treat `**` as "match any directories" — used in patterns like
  // `!**/node_modules/**` that we want to honour conservatively.
  // Implementation: replace `**` with `.*`, `*` with `[^/]*`,
  // escape other special chars.
  let re = '^';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i += 2;
      // Eat any trailing slash so `!**/x/**` matches both `x` and
      // `a/x` and `a/x/b`.
      if (pattern[i] === '/') i++;
    } else if (ch === '*') {
      re += '[^/]*';
      i++;
    } else if (/[.+?^${}()|[\]\\]/.test(ch)) {
      re += `\\${ch}`;
      i++;
    } else {
      re += ch;
      i++;
    }
  }
  re += '$';
  return new RegExp(re);
}
