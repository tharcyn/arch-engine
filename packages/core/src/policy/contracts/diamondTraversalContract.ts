export const DIAMOND_TRAVERSAL_CONTRACT_VERSION = 'v1';

/**
 * DiamondTraversalContract_v1 guarantees the following traversal invariants:
 * - DFS traversal algorithm
 * - Parent-before-child insertion (post-order equivalent)
 * - First-encounter precedence (siblings and diamonds are deduplicated globally via first encounter)
 * - Duplicate interception before insertion
 * - Path-scoped cycle detection only (no cross-branch cycle detection)
 * - Sibling reuse permitted
 * - Diamond reuse permitted
 */
export interface DiamondTraversalContract {
  version: typeof DIAMOND_TRAVERSAL_CONTRACT_VERSION;
}
