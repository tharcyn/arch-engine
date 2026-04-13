/**
 * ═══════════════════════════════════════════════════════════
 *  Entity Resolver — Canonical Entity Identity Resolution
 * ═══════════════════════════════════════════════════════════
 *
 *  Replaces ALL substring-based entity matching (entity.name.includes())
 *  with deterministic identity resolution using the entity adjacency map.
 *
 *  Resolution chain (in priority order):
 *    1. Exact entity_id match
 *    2. Exact entity_key match (adjacency map key)
 *    3. Exact short class name match (FQCNs → short name)
 *    4. Exact FQCN match
 *
 *  This module MUST be the ONLY entity matching mechanism used
 *  by the enforcement engine and impact simulator. Any use of
 *  `.includes()` for entity matching is a correctness bug.
 *
 *  Forward-portable to: @arch-engine/core/identity
 */

// ─── Entity Index ───────────────────────────────────────

export interface IndexedEntity {
  /** Adjacency map key (e.g. class_name, route identity) */
  entity_key: string;

  /** Stable deterministic entity_id (e.g. svc_inventory-ledger-service_4b7e2e9b) */
  entity_id: string;

  /** Short class name (e.g. InventoryLedgerService) */
  short_name: string;

  /** Fully qualified class name (e.g. App\\Services\\InventoryLedgerService) */
  fqcn: string;
}

// ─── Entity Resolver ────────────────────────────────────

export class EntityResolver {
  /** entity_id → IndexedEntity */
  private byId: Map<string, IndexedEntity> = new Map();

  /** entity_key → IndexedEntity */
  private byKey: Map<string, IndexedEntity> = new Map();

  /** short_name (lowercase) → IndexedEntity[] (may have collisions) */
  private byShortName: Map<string, IndexedEntity[]> = new Map();

  /** FQCN → IndexedEntity */
  private byFqcn: Map<string, IndexedEntity> = new Map();

  /** Set of all known entity_ids for O(1) membership checks */
  private allIds: Set<string> = new Set();

  /** Set of all known entity_keys for O(1) membership checks */
  private allKeys: Set<string> = new Set();

  /**
   * Build the resolver from the adjacency map.
   *
   * @param adjacencyMap The loaded entity-adjacency-map.json
   */
  constructor(adjacencyMap: Record<string, any>) {
    for (const [key, node] of Object.entries(adjacencyMap)) {
      const entityId = node.entity_id || '';
      const shortName = key.includes('\\') ? key.split('\\').pop()! : key;
      const fqcn = key;

      const entry: IndexedEntity = {
        entity_key: key,
        entity_id: entityId,
        short_name: shortName,
        fqcn,
      };

      if (entityId) {
        this.byId.set(entityId, entry);
        this.allIds.add(entityId);
      }

      this.byKey.set(key, entry);
      this.allKeys.add(key);

      // Short name index (lowercase for case-insensitive lookup)
      const lowerShort = shortName.toLowerCase();
      if (!this.byShortName.has(lowerShort)) {
        this.byShortName.set(lowerShort, []);
      }
      this.byShortName.get(lowerShort)!.push(entry);

      this.byFqcn.set(fqcn, entry);
    }
  }

  /**
   * Resolve an entity name/key/id to its canonical identity.
   *
   * Resolution chain (strict, no substring matching):
   *   1. Exact entity_id match
   *   2. Exact entity_key match
   *   3. Exact FQCN match
   *   4. Exact short class name match (case-insensitive)
   *
   * @returns The matched entity, or null if no exact match found
   */
  resolve(identifier: string): IndexedEntity | null {
    // 1. Exact entity_id
    if (this.byId.has(identifier)) {
      return this.byId.get(identifier)!;
    }

    // 2. Exact entity_key
    if (this.byKey.has(identifier)) {
      return this.byKey.get(identifier)!;
    }

    // 3. Exact FQCN
    if (this.byFqcn.has(identifier)) {
      return this.byFqcn.get(identifier)!;
    }

    // 4. Exact short class name (case-insensitive, unambiguous only)
    const lowerName = identifier.toLowerCase();
    const shortMatches = this.byShortName.get(lowerName);
    if (shortMatches && shortMatches.length === 1) {
      return shortMatches[0];
    }

    return null;
  }

  /**
   * Check if an entity name/key matches a reference name.
   * Uses strict identity resolution — NO substring matching.
   *
   * @param entityName   The entity to check (e.g. short class name, FQCN, entity_id)
   * @param referenceName The reference to match against (e.g. from authority records)
   * @returns true if they resolve to the same entity
   */
  matches(entityName: string, referenceName: string): boolean {
    const entityResolved = this.resolve(entityName);
    const referenceResolved = this.resolve(referenceName);

    // Both resolve: check identity
    if (entityResolved && referenceResolved) {
      return entityResolved.entity_key === referenceResolved.entity_key;
    }

    // One resolves, one doesn't: try short-name fallback
    if (entityResolved) {
      return entityResolved.short_name.toLowerCase() === referenceName.toLowerCase()
          || entityResolved.entity_key === referenceName
          || entityResolved.fqcn === referenceName;
    }

    if (referenceResolved) {
      return referenceResolved.short_name.toLowerCase() === entityName.toLowerCase()
          || referenceResolved.entity_key === entityName
          || referenceResolved.fqcn === entityName;
    }

    // Neither resolves: string equality only (no substring)
    return entityName === referenceName
        || entityName.toLowerCase() === referenceName.toLowerCase();
  }

  /**
   * Check if a reference string matches an entity, supporting
   * FQCN-to-short-name normalization.
   *
   * Used for matching authority records (e.g. forbidden_writers)
   * against resolved entities.
   *
   * @param entityName     Short class name of the entity
   * @param referenceStr   The reference string (may be FQCN, short name, or entity_id)
   * @returns true if the reference identifies the same entity
   */
  referenceMatchesEntity(entityName: string, referenceStr: string): boolean {
    // Normalize the reference: if it's a FQCN, extract short name
    const refShort = referenceStr.includes('\\')
      ? referenceStr.split('\\').pop()!
      : referenceStr;

    // Try exact identity resolution first
    if (this.matches(entityName, referenceStr)) return true;
    if (this.matches(entityName, refShort)) return true;

    return false;
  }

  /**
   * Filter canonical edges that involve a specific entity.
   * Uses identity-based matching instead of substring matching.
   *
   * @param edges      Array of canonical edges (source/target/type)
   * @param entityName The entity name to filter by
   * @returns          Edges where source OR target matches the entity
   */
  filterEdgesForEntity(
    edges: Array<{ source: string; target: string; type: string; [key: string]: any }>,
    entityName: string,
  ): Array<{ source: string; target: string; type: string; [key: string]: any }> {
    const resolved = this.resolve(entityName);
    if (!resolved) {
      // Fallback: exact string match only (no substring)
      return edges.filter(e =>
        e.source === entityName || e.target === entityName
      );
    }

    return edges.filter(e => {
      const sourceMatch =
        e.source === resolved.entity_key ||
        e.source === resolved.short_name ||
        e.source === resolved.fqcn ||
        e.source === resolved.entity_id;

      const targetMatch =
        e.target === resolved.entity_key ||
        e.target === resolved.short_name ||
        e.target === resolved.fqcn ||
        e.target === resolved.entity_id;

      return sourceMatch || targetMatch;
    });
  }

  /**
   * Get the count of indexed entities.
   */
  get size(): number {
    return this.byKey.size;
  }
}
