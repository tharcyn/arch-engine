/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-yarn-pnp — root manifest reader
 * ═══════════════════════════════════════════════════════════
 *
 *  Safe, dependency-free reader for the bits of a Yarn Berry root
 *  package.json that matter for workspace topology extraction.
 *
 *  Supported shapes for the `workspaces` field:
 *
 *      "workspaces": ["packages/*", "apps/*"]
 *
 *      "workspaces": {
 *        "packages": ["packages/*", "apps/*"]
 *      }
 *
 *  Both forms produce the same normalised `globs` array. The object
 *  form's `nohoist` field, when present, is captured for metadata but
 *  is otherwise ignored (PnP makes hoisting moot).
 *
 *  Additional fields read:
 *    - `name`           — root package name (informational).
 *    - `packageManager` — `yarn@<version>` is captured into
 *                         `packageManagerVersion` deterministically;
 *                         non-yarn values yield `null`.
 *
 *  Out of scope:
 *    - Workspace ranges in object form (`workspaces.foo: "^1"`).
 *    - Resolving extends-style configs.
 *    - .yarnrc.yml parsing — handled at the adapter level when the
 *      file exists alongside this manifest.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface YarnRootManifest {
  readonly name: string | null;
  /** Always-present, always-array (possibly empty) glob list. */
  readonly globs: ReadonlyArray<string>;
  /** True when the source declared an object-form `workspaces`. */
  readonly workspacesObjectForm: boolean;
  /** True when the source declared a `workspaces` field at all. */
  readonly workspacesPresent: boolean;
  /**
   * Parsed yarn version from `packageManager: "yarn@<version>[+sha]"`.
   * `null` when the field is absent or does not identify yarn.
   */
  readonly packageManagerVersion: string | null;
  /** Raw `packageManager` value if present (informational). */
  readonly packageManagerHint: string | null;
  /** Soft warnings (e.g. unsupported workspaces shape). */
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Read and normalise the root `package.json` workspace manifest.
 * Returns `null` when no readable `package.json` exists at `cwd`.
 *
 * Pure I/O: a single readFileSync at `package.json` followed by a
 * JSON.parse. No further filesystem traversal.
 */
export function readYarnRootManifest(cwd: string): YarnRootManifest | null {
  const manifestAbs = path.join(cwd, 'package.json');
  if (!fs.existsSync(manifestAbs)) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(manifestAbs, 'utf-8');
  } catch {
    return null;
  }
  let pkg: any;
  try {
    pkg = JSON.parse(raw);
  } catch {
    return {
      name: null,
      globs: [],
      workspacesObjectForm: false,
      workspacesPresent: false,
      packageManagerVersion: null,
      packageManagerHint: null,
      warnings: ['Root package.json could not be parsed as JSON.'],
    };
  }
  return normaliseManifest(pkg);
}

/**
 * Pure normalisation of a parsed `package.json` body. Exposed so
 * tests can exercise the shape handling without disk I/O.
 */
export function normaliseManifest(pkg: any): YarnRootManifest {
  const warnings: string[] = [];
  const name = typeof pkg?.name === 'string' && pkg.name.length > 0 ? pkg.name : null;

  let globs: string[] = [];
  let workspacesObjectForm = false;
  let workspacesPresent = false;

  const ws = pkg?.workspaces;
  if (Array.isArray(ws)) {
    workspacesPresent = true;
    for (const entry of ws) {
      if (typeof entry === 'string' && entry.length > 0) {
        globs.push(entry);
      } else {
        warnings.push(
          `Ignored non-string entry in package.json#workspaces array.`,
        );
      }
    }
  } else if (ws && typeof ws === 'object') {
    workspacesPresent = true;
    workspacesObjectForm = true;
    const inner = (ws as Record<string, unknown>).packages;
    if (Array.isArray(inner)) {
      for (const entry of inner) {
        if (typeof entry === 'string' && entry.length > 0) {
          globs.push(entry);
        } else {
          warnings.push(
            `Ignored non-string entry in package.json#workspaces.packages array.`,
          );
        }
      }
    } else if (inner !== undefined) {
      warnings.push(
        `package.json#workspaces.packages must be an array of strings.`,
      );
    }
  } else if (ws !== undefined) {
    warnings.push(
      `package.json#workspaces must be an array or an object with a "packages" array.`,
    );
  }

  const packageManagerHint =
    typeof pkg?.packageManager === 'string' ? pkg.packageManager : null;
  const packageManagerVersion = deriveYarnVersion(packageManagerHint);

  return {
    name,
    globs,
    workspacesObjectForm,
    workspacesPresent,
    packageManagerVersion,
    packageManagerHint,
    warnings,
  };
}

/**
 * Parse a `yarn@<version>` `packageManager` hint into the bare
 * version string. Returns `null` when the hint is missing or does
 * not identify yarn. Strips optional Corepack `+<sha>` integrity
 * suffixes deterministically.
 */
export function deriveYarnVersion(hint: string | null): string | null {
  if (typeof hint !== 'string') return null;
  if (!hint.startsWith('yarn@')) return null;
  const rest = hint.slice('yarn@'.length);
  const plusIdx = rest.indexOf('+');
  const version = plusIdx >= 0 ? rest.slice(0, plusIdx) : rest;
  return version.length > 0 ? version : null;
}

/**
 * Minimal `.yarnrc.yml` reader. Extracts the `nodeLinker` value when
 * present using a narrow line-based scan. Does NOT depend on a YAML
 * parser; only reads the value of a top-level `nodeLinker:` key.
 *
 * Returns `null` when the file is absent. Returns
 * `{ nodeLinker: null }` when the file exists but does not declare
 * `nodeLinker:`.
 */
export interface YarnrcReadResult {
  readonly nodeLinker: 'pnp' | 'node-modules' | 'pnpm' | 'unknown' | null;
}

export function readYarnrc(cwd: string): YarnrcReadResult | null {
  const abs = path.join(cwd, '.yarnrc.yml');
  if (!fs.existsSync(abs)) return null;
  let body: string;
  try {
    body = fs.readFileSync(abs, 'utf-8');
  } catch {
    return { nodeLinker: null };
  }
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = stripYamlComment(rawLine);
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    if (m[1] !== 'nodeLinker') continue;
    const value = m[2]!.trim().replace(/^['"]|['"]$/g, '');
    if (value === 'pnp' || value === 'node-modules' || value === 'pnpm') {
      return { nodeLinker: value };
    }
    return { nodeLinker: 'unknown' };
  }
  return { nodeLinker: null };
}

/**
 * Provenance tag for the `nodeLinker` value surfaced in JSON v2
 * `data.adapter.metadata.yarnPnp`. Distinguishes the three sources
 * the v0.1.1+ adapter recognises:
 *
 *   - `"yarnrc"`                 — value parsed verbatim from a
 *                                  top-level `nodeLinker:` key in
 *                                  `.yarnrc.yml`.
 *   - `"inferred_from_pnp_file"` — `.yarnrc.yml` did not declare
 *                                  `nodeLinker`, but a `.pnp.cjs` or
 *                                  `.pnp.loader.mjs` is present at
 *                                  the repository root. Yarn Berry's
 *                                  documented default in that
 *                                  situation is `pnp`, so the adapter
 *                                  reports `nodeLinker: "pnp"` with
 *                                  this provenance tag rather than
 *                                  the previous misleading `null`.
 *   - `"absent"`                 — no explicit value AND no PnP file
 *                                  signal. The adapter leaves
 *                                  `nodeLinker: null` and tags the
 *                                  absence so consumers can
 *                                  distinguish it from the
 *                                  inferred-PnP case.
 *
 * Added in v0.1.1 trust-polish to address P3-1 from the
 * `audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`
 * findings. JSON v2 metadata-only field; does not affect adapter
 * selection, graph extraction, `graphSurfaceHash`, or JSON v1.
 */
export type YarnPnpNodeLinkerSource =
  | 'yarnrc'
  | 'inferred_from_pnp_file'
  | 'absent';

/**
 * Resolve the surfaced `(nodeLinker, nodeLinkerSource)` pair from
 * the explicit value (if any) parsed from `.yarnrc.yml` plus the
 * boolean PnP-file signals collected by the adapter's probe step.
 *
 * Pure function: no I/O, no side effects.
 */
export function resolveNodeLinker(
  yarnrcValue: 'pnp' | 'node-modules' | 'pnpm' | 'unknown' | null,
  pnpFilePresent: boolean,
  pnpLoaderPresent: boolean,
): {
  readonly nodeLinker: 'pnp' | 'node-modules' | 'pnpm' | 'unknown' | null;
  readonly nodeLinkerSource: YarnPnpNodeLinkerSource;
} {
  if (yarnrcValue !== null) {
    return { nodeLinker: yarnrcValue, nodeLinkerSource: 'yarnrc' };
  }
  if (pnpFilePresent || pnpLoaderPresent) {
    return { nodeLinker: 'pnp', nodeLinkerSource: 'inferred_from_pnp_file' };
  }
  return { nodeLinker: null, nodeLinkerSource: 'absent' };
}

function stripYamlComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(line[i - 1]!)) {
        return line.slice(0, i);
      }
    }
  }
  return line;
}
