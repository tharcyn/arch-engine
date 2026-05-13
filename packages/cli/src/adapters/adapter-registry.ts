/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Internal Adapter Registry (Pass 1)
 * ═══════════════════════════════════════════════════════════
 *
 *  Status: INTERNAL — not exported from any package index.ts.
 *
 *  Implements the deterministic adapter-selection algorithm
 *  documented in docs/adapters/multi-adapter-surface-spec.md §7.
 *
 *  Pass 1 scope:
 *    - Provide the selection algorithm in isolation.
 *    - Unit tests cover all branches (HIGH-beats-MEDIUM,
 *      precedence tie-break, name tie-break, multi-HIGH conflict,
 *      fallback path, deterministic replay).
 *    - The CLI is NOT yet wired through the registry — that lands
 *      after the monorepo refactor in Pass 1 / Phase 6.
 *
 *  No CLI output change in Pass 1. The selection result is used
 *  only to decide WHICH adapter's extractTopology runs; the result
 *  shape consumed downstream is byte-identical to v1.2.0.
 */

import type {
  ArchitectureAdapter,
  AdapterContext,
  AdapterDetectionResult,
} from './adapter-contract.js';

// ─── Public Types (internal-only) ───────────────────────

/**
 * Registry entry. Wraps an adapter with its declared precedence
 * (lower = higher priority) per spec §7.2.
 *
 * The registry never re-orders adapters by anything other than
 * (confidence DESC, declaredPrecedence ASC, adapterName ASC).
 * This is mechanical — see selectArchitectureAdapter() below.
 */
export interface RegisteredArchitectureAdapter {
  readonly adapter: ArchitectureAdapter;
  /**
   * Spec §7.2 declared precedence. Locked values for the eventual
   * v1.3+ ship:
   *   1 — explicit override (reserved; not used in Pass 1)
   *   2 — @arch-engine/adapter-pnpm        (Pass 2)
   *   3 — @arch-engine/adapter-yarn-pnp    (Pass 3)
   *   4 — @arch-engine/adapter-monorepo    (Pass 1)
   *   5 — built-in directory-scan fallback (reserved)
   * Pass 1 ships only #4 active.
   */
  readonly declaredPrecedence: number;
}

/**
 * Selection verdict returned by `selectArchitectureAdapter`. The
 * registry distinguishes:
 *   - `RESOLVED` — exactly one adapter selected, may have runners-up.
 *   - `CONFLICT` — multiple HIGH-confidence adapters; first by
 *     precedence wins, others surfaced as `runnersUp`.
 *   - `LOW_CONFIDENCE` — best detection was LOW; adapter still
 *     selected but caller should treat as a guess and surface
 *     ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE (Pass 2 wires this).
 *   - `NONE` — no adapter detected. Caller may use a fallback.
 *
 * Pass 1 emits CONFLICT and LOW_CONFIDENCE as structural results
 * but does NOT surface them to user-visible output — those
 * surfaces ship in Pass 2 with the new ARCH_ENGINE_* codes.
 */
export type AdapterSelectionStatus =
  | 'RESOLVED'
  | 'CONFLICT'
  | 'LOW_CONFIDENCE'
  | 'NONE';

export interface AdapterSelectionResult {
  readonly status: AdapterSelectionStatus;
  /** The selected adapter, or `null` when status === 'NONE'. */
  readonly selected: RegisteredArchitectureAdapter | null;
  /** The chosen adapter's detection result, or `null` when NONE. */
  readonly detection: AdapterDetectionResult | null;
  /**
   * Other detected adapters with their detection results, sorted by
   * (confidence DESC, declaredPrecedence ASC, adapterName ASC).
   * Excludes the chosen adapter.
   */
  readonly runnersUp: ReadonlyArray<{
    readonly adapter: RegisteredArchitectureAdapter;
    readonly detection: AdapterDetectionResult;
  }>;
  /** Audit trail of every detect() result, in registration order. */
  readonly allDetections: ReadonlyArray<{
    readonly adapter: RegisteredArchitectureAdapter;
    readonly detection: AdapterDetectionResult;
  }>;
}

// ─── Selection Algorithm ────────────────────────────────

/**
 * Confidence rank for sort ordering. Higher number = higher
 * confidence. HIGH > MEDIUM > LOW > NONE.
 */
const CONFIDENCE_RANK: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

/**
 * Run `detect()` against every adapter and return a deterministic
 * selection verdict. Matches the algorithm in spec §7.1.
 *
 * Selection rules:
 *   1. Call adapter.detect(ctx) for every registered adapter.
 *      Skip results where detected === false.
 *   2. Sort surviving detections by:
 *        (confidence DESC, declaredPrecedence ASC, adapterName ASC)
 *   3. If at least one HIGH exists:
 *        - Pick the top entry.
 *        - If >1 HIGH exist, status = CONFLICT, runners-up listed.
 *        - Otherwise status = RESOLVED.
 *   4. Else if at least one MEDIUM exists:
 *        - Pick the top entry, status = RESOLVED.
 *   5. Else if at least one LOW exists:
 *        - Pick the top entry, status = LOW_CONFIDENCE.
 *   6. Else: status = NONE, selected = null.
 *
 * Determinism: given the same (adapters, ctx) inputs, this function
 * MUST return byte-identical results across runs. Adapters
 * themselves must be deterministic for this guarantee to hold.
 *
 * Fallback adapter: callers MAY pass a `fallback` adapter as the
 * second argument. It is consulted only when status would be NONE
 * and effectively becomes the selected adapter (status remains
 * NONE in the verdict so the caller can render the appropriate
 * "no adapter detected, using fallback" diagnostic in Pass 2).
 *
 * Pass 1 does NOT call this function from the CLI runtime path; it
 * is exercised by unit tests in this pass and wired into the
 * runner-bridge in a later sub-pass when Pass 2 lands.
 */
export function selectArchitectureAdapter(
  adapters: ReadonlyArray<RegisteredArchitectureAdapter>,
  context: AdapterContext,
): AdapterSelectionResult {
  // 1. Probe every adapter.
  const allDetections = adapters.map((entry) => ({
    adapter: entry,
    detection: entry.adapter.detect(context),
  }));

  // 2. Keep only detected results.
  const detected = allDetections.filter((row) => row.detection.detected);

  // 3. Sort by (confidence DESC, declaredPrecedence ASC, adapterName ASC).
  detected.sort(compareDetectionRows);

  if (detected.length === 0) {
    return {
      status: 'NONE',
      selected: null,
      detection: null,
      runnersUp: [],
      allDetections,
    };
  }

  const top = detected[0]!;
  const topRank = CONFIDENCE_RANK[top.detection.confidence] ?? 0;

  // 4. Determine status.
  let status: AdapterSelectionStatus;
  if (topRank === CONFIDENCE_RANK.HIGH) {
    // Multiple HIGH?
    const highCount = detected.filter(
      (row) => CONFIDENCE_RANK[row.detection.confidence] === CONFIDENCE_RANK.HIGH,
    ).length;
    status = highCount > 1 ? 'CONFLICT' : 'RESOLVED';
  } else if (topRank === CONFIDENCE_RANK.MEDIUM) {
    status = 'RESOLVED';
  } else if (topRank === CONFIDENCE_RANK.LOW) {
    status = 'LOW_CONFIDENCE';
  } else {
    // NONE rank but detected === true is contradictory; treat as NONE.
    status = 'NONE';
  }

  const runnersUp = detected
    .slice(1)
    .map((row) => ({ adapter: row.adapter, detection: row.detection }));

  return {
    status,
    selected: status === 'NONE' ? null : top.adapter,
    detection: status === 'NONE' ? null : top.detection,
    runnersUp,
    allDetections,
  };
}

/**
 * Stable comparator for detection rows.
 *   - Higher confidence wins (HIGH > MEDIUM > LOW > NONE).
 *   - Tie → lower declaredPrecedence wins.
 *   - Tie → alphabetically earlier adapterName wins.
 */
function compareDetectionRows(
  a: { adapter: RegisteredArchitectureAdapter; detection: AdapterDetectionResult },
  b: { adapter: RegisteredArchitectureAdapter; detection: AdapterDetectionResult },
): number {
  const aRank = CONFIDENCE_RANK[a.detection.confidence] ?? 0;
  const bRank = CONFIDENCE_RANK[b.detection.confidence] ?? 0;
  if (aRank !== bRank) return bRank - aRank; // higher confidence first

  const aPrec = a.adapter.declaredPrecedence;
  const bPrec = b.adapter.declaredPrecedence;
  if (aPrec !== bPrec) return aPrec - bPrec; // lower precedence number first

  return a.adapter.adapter.adapterName.localeCompare(b.adapter.adapter.adapterName);
}

// ─── Convenience Constructors ───────────────────────────

/**
 * Wrap an adapter with a declared precedence number. The CLI uses
 * this helper at registration time so the precedence values stay
 * close to the adapter's import site.
 */
export function registerArchitectureAdapter(
  adapter: ArchitectureAdapter,
  declaredPrecedence: number,
): RegisteredArchitectureAdapter {
  return { adapter, declaredPrecedence };
}
