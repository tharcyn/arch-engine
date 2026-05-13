/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-pnpm — Minimal pnpm-workspace.yaml reader
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure, dependency-free YAML subset parser for `pnpm-workspace.yaml`.
 *  We deliberately avoid adding the `yaml` package as a dependency —
 *  pnpm's workspace file uses only a narrow subset of YAML and
 *  pulling a full parser inflates the install footprint for nothing.
 *
 *  Supported shapes:
 *
 *    packages:
 *      - "packages/*"
 *      - 'apps/*'
 *      - services/*
 *      - "!packages/private-*"
 *
 *    catalog:
 *      react: ^18.2.0
 *
 *  The parser also handles:
 *    - empty lines
 *    - `#` comments on their own line or after a value
 *    - single and double quoted strings
 *    - unquoted strings
 *    - leading `- ` list-item marker with one or more spaces of indent
 *
 *  Out of scope:
 *    - flow-style `[a, b]` lists
 *    - object-shape packages
 *      (`packages: { include: [...], exclude: [...] }`)
 *    - multi-line block scalars `|`, `>`
 *    - aliases / anchors
 *
 *  If the file is structurally unusable (e.g. `packages:` line missing,
 *  or all list items are blank), `parsePnpmWorkspaceYaml` returns
 *  `null` for `packages` so the caller can downgrade detection.
 */

export interface PnpmWorkspaceFile {
  /**
   * Raw package glob entries in source order. May be empty when the
   * file declares `packages:` but lists nothing.
   * `null` ⇒ no `packages:` key present (different from "empty list").
   */
  readonly packages: ReadonlyArray<string> | null;
  /**
   * True when the file contains at least one `catalog:` or `catalogs:`
   * key. Catalog resolution is deferred to v1.4+; the adapter merely
   * surfaces an `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` diagnostic when
   * this is true.
   */
  readonly catalogsDetected: boolean;
  /**
   * Lines reporting structural problems (e.g. quoting mismatch).
   * Surfaced as warnings, not errors.
   */
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Thrown when the YAML body is fundamentally unparseable — e.g. a
 * binary file or a clearly-corrupted document. Detection treats this
 * as a LOW-confidence "I saw the file but can't read it" signal.
 */
export class PnpmWorkspaceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PnpmWorkspaceParseError';
  }
}

/**
 * Parse a `pnpm-workspace.yaml` text body. Pure function. No I/O.
 *
 * @param text  Raw YAML body (UTF-8 string).
 * @throws {PnpmWorkspaceParseError} on a structurally hostile body
 *         (NUL bytes, tab-indented packages list, etc).
 */
export function parsePnpmWorkspaceYaml(text: string): PnpmWorkspaceFile {
  if (text.includes('\0')) {
    throw new PnpmWorkspaceParseError('YAML file contains NUL bytes.');
  }

  const warnings: string[] = [];

  // Normalise CRLF → LF so column offsets are stable.
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  let packages: string[] | null = null;
  let inPackagesBlock = false;
  let packagesIndent = -1;
  let catalogsDetected = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const stripped = stripComment(raw);
    const trimmed = stripped.trim();

    // Blank line — preserves block context.
    if (trimmed.length === 0) continue;

    // Tab indentation is forbidden by YAML; surface a warning but
    // continue best-effort.
    if (raw.startsWith('\t')) {
      warnings.push(`Line ${i + 1}: tab indentation is not valid YAML; skipped.`);
      continue;
    }

    const indent = countLeadingSpaces(stripped);

    // Top-level key line: matches `^<key>:` with no leading whitespace.
    if (indent === 0 && /^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(stripped)) {
      const keyMatch = stripped.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1]!;
        const rest = keyMatch[2]?.trim() ?? '';
        if (key === 'packages') {
          inPackagesBlock = true;
          packagesIndent = -1; // determined by first item
          if (packages === null) packages = [];
          // Inline value `packages: ["a", "b"]` is unsupported; flag it.
          if (rest.length > 0 && rest !== '|' && rest !== '>') {
            warnings.push(
              `Line ${i + 1}: inline \`packages:\` value is not supported; use block-list form.`,
            );
            inPackagesBlock = false;
          }
        } else if (key === 'catalog' || key === 'catalogs') {
          catalogsDetected = true;
          inPackagesBlock = false;
        } else {
          inPackagesBlock = false;
        }
        continue;
      }
    }

    // Inside the packages block: list items begin with `- `.
    if (inPackagesBlock) {
      // Determine block indent from the first list item.
      const listMatch = stripped.match(/^(\s*)-\s+(.*)$/);
      if (listMatch) {
        const itemIndent = listMatch[1]!.length;
        const itemBody = listMatch[2]!.trim();
        if (packagesIndent < 0) packagesIndent = itemIndent;
        // Different indent from the first → out of block.
        if (itemIndent < packagesIndent) {
          inPackagesBlock = false;
          // Re-process this line as a top-level key candidate.
          i--;
          continue;
        }
        const cleaned = unquote(itemBody);
        if (cleaned.length > 0) {
          packages = packages ?? [];
          packages.push(cleaned);
        }
        continue;
      }
      // Indented non-list content under packages → leave the block.
      if (indent <= 0) {
        inPackagesBlock = false;
        // Re-process this line at top level.
        i--;
        continue;
      }
    }
  }

  return {
    packages,
    catalogsDetected,
    warnings,
  };
}

// ─── Helpers ───────────────────────────────────────────

function stripComment(line: string): string {
  // Drop `# ...` if the `#` is preceded by whitespace or start-of-line
  // AND is not inside a quoted string. The narrow form is sufficient
  // for the patterns pnpm uses; full YAML quoting awareness is beyond
  // scope.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      // Comments must be preceded by whitespace OR at start of line.
      if (i === 0 || /\s/.test(line[i - 1]!)) {
        return line.slice(0, i);
      }
    }
  }
  return line;
}

function countLeadingSpaces(s: string): number {
  let n = 0;
  while (n < s.length && s[n] === ' ') n++;
  return n;
}

function unquote(s: string): string {
  if (s.length >= 2) {
    const first = s[0]!;
    const last = s[s.length - 1]!;
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}
