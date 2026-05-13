/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-yarn-pnp — Glob expansion
 * ═══════════════════════════════════════════════════════════
 *
 *  Deterministic, dependency-free glob expansion for the subset of
 *  patterns Yarn Berry workspaces use. Mirrors the algorithm in
 *  @arch-engine/adapter-pnpm so the two adapters expand the same
 *  glob string to the same matched directories (after applying
 *  PnP-specific always-ignore additions).
 *
 *  Supported patterns:
 *    packages/<star>            — single-segment wildcard
 *    packages/<star>/<star>     — two-segment nested wildcard
 *    !packages/skip-<star>      — exclusion (applied AFTER inclusion)
 *
 *  Out of scope for v0.1.0:
 *    `**` (recursive)
 *    brace expansion `{api,web}`
 *
 *  Always-ignored directories at every recursion level — extends
 *  the pnpm adapter's set with `.yarn/cache`, `.yarn/unplugged`,
 *  and `.yarn/install-state.gz` so we never walk into the Yarn
 *  Berry cache or the install-state archive.
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
  '.yarn',
]);

export interface GlobExpansion {
  /** Sorted, deduplicated, relative POSIX directory paths. */
  readonly matchedDirs: ReadonlyArray<string>;
  /** Sorted, deduplicated, relative POSIX directory paths excluded by `!…`. */
  readonly excludedDirs: ReadonlyArray<string>;
  /** Soft warnings (unsupported pattern dropped). */
  readonly warnings: ReadonlyArray<string>;
}

export function expandWorkspaceGlobs(
  cwd: string,
  globs: ReadonlyArray<string>,
): GlobExpansion {
  const warnings: string[] = [];

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
  includes.sort();
  excludes.sort();

  const matched = new Set<string>();
  for (const glob of includes) {
    for (const dir of expandOne(cwd, glob, warnings)) matched.add(dir);
  }

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

function expandOne(cwd: string, glob: string, warnings: string[]): string[] {
  let pattern = glob;
  if (pattern.startsWith('./')) pattern = pattern.slice(2);

  if (pattern.includes('..')) {
    warnings.push(`Glob \`${glob}\` contains \`..\` and is ignored.`);
    return [];
  }
  if (pattern.includes('**')) {
    warnings.push(
      `Glob \`${glob}\` uses \`**\` which is not supported in v0.1.0; skipped.`,
    );
    return [];
  }

  const segments = pattern.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) return [];

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
    const rel = accumulator.replace(/\/$/, '');
    if (rel.length > 0) out.add(rel);
    return;
  }
  const seg = segments[idx]!;

  if (seg === '*') {
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

function buildGlobMatcher(glob: string, warnings: string[]): RegExp | null {
  let pattern = glob;
  if (pattern.startsWith('./')) pattern = pattern.slice(2);
  if (pattern.includes('..')) {
    warnings.push(`Exclusion glob \`${glob}\` contains \`..\` and is ignored.`);
    return null;
  }
  let re = '^';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i += 2;
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
