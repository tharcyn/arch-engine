/**
 * F-4: Deterministic federation-portable handler stack sorting.
 *
 * Produces identical stack order across repositories, registries,
 * mirrors, and transport seams. Does not depend on runtime insertion order.
 *
 * Sort precedence (stable tuple comparison, ascending):
 *   1. authorityTierWeight   — lower authority executes earlier
 *   2. registryPriorityWeight — lower registry priority executes earlier
 *   3. namespaceWeight        — lexicographic namespace ordering
 *   4. overlayPriority        — explicit override precedence
 *   5. overlayDeclaredOrder   — intra-pack deterministic ordering
 *   6. overlaySourceId        — string lexicographic tiebreaker
 *   7. overlayVersion         — semver lexical normalized tiebreaker
 */

import { OverlayHandlerMetadata, OverlayAuthorityTier } from './seamContracts.js';

// ─── Authority tier weight mapping ──────────────────────────────────────────
// Higher number executes later (lower authority executes earlier).

const AUTHORITY_TIER_WEIGHT: Record<number, number> = {
  [OverlayAuthorityTier.UNTRUSTED_EXTERNAL]: 100,
  [OverlayAuthorityTier.SIGNED_EXTERNAL_PACK]: 200,
  [OverlayAuthorityTier.TRUSTED_POLICY_PACK]: 300,
  [OverlayAuthorityTier.CORE_INTERNAL]: 400
};

const DEFAULT_AUTHORITY_TIER_WEIGHT = 100;

// ─── Registry priority weight mapping ───────────────────────────────────────
// Deterministic registry precedence. Higher number executes later.

const REGISTRY_PRIORITY_WEIGHT: Record<string, number> = {
  'core': 400,
  'official': 300,
  'partner': 200,
  'external': 100
};

const DEFAULT_REGISTRY_PRIORITY_WEIGHT = 50; // unknown

/**
 * Handler sort key — a stable tuple used for deterministic comparison.
 *
 * This is a pure function that does not depend on runtime state.
 */
export type HandlerSortKey = readonly [
  authorityTierWeight: number,
  registryWeight: number,
  namespaceWeight: string,
  overlayPriority: number,
  overlayDeclaredOrder: number,
  overlaySourceId: string,
  overlayVersion: string
];

/**
 * Compute the canonical sort key for a handler.
 *
 * All fields resolve to deterministic defaults when metadata is missing.
 * This guarantees that sorting always produces stable output regardless
 * of handler metadata completeness.
 */
export function computeHandlerSortKey(
  handler: OverlayHandlerMetadata,
  contextAuthorityTier?: OverlayAuthorityTier
): HandlerSortKey {
  // Authority tier weight: use handler's context authority or fallback to UNTRUSTED
  const tierValue = contextAuthorityTier ?? OverlayAuthorityTier.UNTRUSTED_EXTERNAL;
  const authorityTierWeight = AUTHORITY_TIER_WEIGHT[tierValue] ?? DEFAULT_AUTHORITY_TIER_WEIGHT;

  // Registry priority weight
  const registrySource = handler.overlayRegistrySource ?? '';
  const registryWeight = REGISTRY_PRIORITY_WEIGHT[registrySource] ?? DEFAULT_REGISTRY_PRIORITY_WEIGHT;

  // Namespace weight: stable lexicographic ordering (empty string as default)
  const namespaceWeight = handler.overlayNamespace ?? '';

  // Priority override (default 0)
  const overlayPriority = handler.overlayPriority ?? 0;

  // Declared order (default 0)
  const overlayDeclaredOrder = handler.overlayDeclaredOrder ?? 0;

  // Source ID and version — always present on OverlayHandlerMetadata
  const overlaySourceId = handler.overlaySourceId;
  const overlayVersion = handler.overlayVersion;

  return [
    authorityTierWeight,
    registryWeight,
    namespaceWeight,
    overlayPriority,
    overlayDeclaredOrder,
    overlaySourceId,
    overlayVersion
  ] as const;
}

/**
 * Compare two handler sort keys using stable tuple comparison.
 *
 * Returns negative if a < b, positive if a > b, 0 if equal.
 *
 * Comparison order:
 *   1. authorityTierWeight (number, ascending)
 *   2. registryWeight (number, ascending)
 *   3. namespaceWeight (string, lexicographic ascending)
 *   4. overlayPriority (number, ascending)
 *   5. overlayDeclaredOrder (number, ascending)
 *   6. overlaySourceId (string, lexicographic ascending)
 *   7. overlayVersion (string, lexicographic ascending)
 */
function compareHandlerSortKeys(a: HandlerSortKey, b: HandlerSortKey): number {
  // Numeric comparisons (indices 0, 1, 3, 4)
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];

  // String comparison (index 2: namespace)
  if (a[2] !== b[2]) return a[2] < b[2] ? -1 : 1;

  // Numeric comparisons (indices 3, 4)
  if (a[3] !== b[3]) return a[3] - b[3];
  if (a[4] !== b[4]) return a[4] - b[4];

  // String tiebreakers (indices 5, 6)
  if (a[5] !== b[5]) return a[5] < b[5] ? -1 : 1;
  if (a[6] !== b[6]) return a[6] < b[6] ? -1 : 1;

  return 0;
}

/**
 * Sort an overlay handler stack into deterministic federation-portable execution order.
 *
 * This function:
 *   • is stable (preserves relative order of equal elements)
 *   • is pure (no side effects)
 *   • is deterministic (identical inputs always produce identical output)
 *   • does not depend on runtime insertion order
 *   • does not use Date, random, insertion order, array index, or runtime hash seed
 *
 * @param handlerStack - The handlers to sort
 * @param contextAuthorityTier - The activation context's authority tier (used as uniform weight)
 * @returns A new sorted array (does not mutate original)
 */
export function sortOverlayHandlerStackByPrecedence(
  handlerStack: readonly OverlayHandlerMetadata[],
  contextAuthorityTier?: OverlayAuthorityTier
): readonly OverlayHandlerMetadata[] {
  if (handlerStack.length <= 1) {
    return handlerStack;
  }

  // Pre-compute sort keys for all handlers (avoids redundant recomputation during sort)
  const keyed = handlerStack.map((handler, _index) => ({
    handler,
    key: computeHandlerSortKey(handler, contextAuthorityTier)
  }));

  // Array.prototype.sort() is stable in all modern JS engines (ES2019+).
  keyed.sort((a, b) => compareHandlerSortKeys(a.key, b.key));

  return keyed.map(entry => entry.handler);
}
