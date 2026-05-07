/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Shared help-text fragments
 * ═══════════════════════════════════════════════════════════
 *
 *  Single source of truth for help-text fragments shared
 *  between the root-level `cli.help()` callback and per-
 *  command `.example()` blocks. Centralised so the product
 *  promise, first-run path, and target vocabulary can be
 *  updated in one place.
 *
 *  Per the CLI Experience Specification §4 (P12) and §5,
 *  every command's help must end with a clear pointer to
 *  the next action and a docs URL.
 */

export const PRODUCT_PROMISE = 'Catch architecture drift before merge.';

export const DOCS_URL = 'https://arch-engine.dev';

/**
 * The recommended first-run command path. Each entry is a
 * short instruction, displayed in order. Used by the root
 * help callback only (not by per-command help).
 */
export const FIRST_RUN_PATH: ReadonlyArray<{ step: string; description: string }> = [
  { step: 'arch-engine doctor', description: 'check workspace readiness and adapter signal' },
  { step: 'arch-engine inspect', description: 'review the extracted topology' },
  { step: 'arch-engine analyze', description: 'score architecture signal and risk' },
  { step: 'arch-engine check', description: 'enforce policy rules in CI' },
];

/**
 * The "special" target keywords that `arch-engine explain`
 * recognises. Anything else is treated as a substring search
 * over the canonical edge index (topology nodes/edges).
 *
 * Keep this in sync with `commands/explain.ts`. Adding a new
 * keyword without implementing the corresponding handler is a
 * documentation regression.
 */
export const SUPPORTED_EXPLAIN_TARGETS: ReadonlyArray<{ keyword: string; description: string }> = [
  { keyword: 'regression', description: 'compare current run against the stored stability baseline' },
  { keyword: 'policy', description: 'explain how the active policy pack(s) composed and which rules fired' },
];

/**
 * Returns true if `target` is one of the special keywords.
 * Anything else is interpreted as a substring node/edge search.
 */
export function isSpecialExplainTarget(target: string): boolean {
  return SUPPORTED_EXPLAIN_TARGETS.some((t) => t.keyword === target);
}
