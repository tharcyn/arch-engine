/**
 * ═══════════════════════════════════════════════════════════
 *  Cross-Language Identity Parity Verification Harness
 *  — Phase 2.7
 * ═══════════════════════════════════════════════════════════
 *
 *  Ensures identity determinism across PHP and TS generators.
 *
 *  Validation layers:
 *    1. entity_id hash stability (TS engine self-check)
 *    2. entity_id uniqueness (no collisions)
 *    3. surface identity stability (route keys)
 *    4. cross-file identity determinism (same input → same output)
 *
 *  This harness becomes critical once:
 *    adapter-laravel/ is introduced
 *    because PHP and TS must produce identical entity IDs.
 *
 *  Forward-portable to: @arch-engine/core/identity
 */

import { generateEntityId } from '../entity-id';

// ─── Parity Report ──────────────────────────────────────

export interface ParityCheckResult {
  check_name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  entities_checked: number;
  mismatches: number;
  details: string[];
}

export interface IdentityParityReport {
  generated_at: string;
  overall_status: 'PASS' | 'FAIL';
  checks: ParityCheckResult[];
  summary: {
    total_entities_verified: number;
    total_mismatches: number;
    total_collisions: number;
    total_checks: number;
    passed_checks: number;
  };
}

// ─── Parity Check Engine ────────────────────────────────

/**
 * Check 1: Entity ID determinism.
 * Run generateEntityId() twice with the same inputs
 * and verify identical output.
 */
function checkDeterminism(
  entities: Array<{ class_name: string; file_path: string; entity_type: string }>,
): ParityCheckResult {
  let mismatches = 0;
  const details: string[] = [];

  for (const entity of entities) {
    const id1 = generateEntityId(entity.class_name, entity.file_path, entity.entity_type);
    const id2 = generateEntityId(entity.class_name, entity.file_path, entity.entity_type);

    if (id1 !== id2) {
      mismatches++;
      details.push(`MISMATCH: ${entity.class_name} → id1='${id1}' ≠ id2='${id2}'`);
    }
  }

  return {
    check_name: 'entity_id_determinism',
    status: mismatches === 0 ? 'PASS' : 'FAIL',
    entities_checked: entities.length,
    mismatches,
    details: details.slice(0, 10), // Cap at 10 details
  };
}

/**
 * Check 2: Entity ID uniqueness.
 * Verify no two different entities produce the same ID.
 */
function checkUniqueness(
  entities: Array<{ class_name: string; file_path: string; entity_type: string }>,
): ParityCheckResult {
  const idMap: Map<string, string> = new Map(); // id → class_name
  let collisions = 0;
  const details: string[] = [];

  for (const entity of entities) {
    const id = generateEntityId(entity.class_name, entity.file_path, entity.entity_type);

    if (idMap.has(id)) {
      collisions++;
      details.push(
        `COLLISION: id='${id}' shared by '${idMap.get(id)}' and '${entity.class_name}'`,
      );
    } else {
      idMap.set(id, entity.class_name);
    }
  }

  return {
    check_name: 'entity_id_uniqueness',
    status: collisions === 0 ? 'PASS' : 'FAIL',
    entities_checked: entities.length,
    mismatches: collisions,
    details: details.slice(0, 10),
  };
}

/**
 * Check 3: Stored entity ID matches recomputed ID.
 * Verify that the entity_id stored in generated files
 * matches what generateEntityId() produces now.
 */
function checkStoredParity(
  adjacencyMap: Record<string, any>,
  entitySources: Array<{ entities: any[]; entity_type_field?: string }>,
): ParityCheckResult {
  let checked = 0;
  let mismatches = 0;
  const details: string[] = [];

  for (const source of entitySources) {
    for (const entity of source.entities) {
      const className = entity.class_name || entity.fqcn || '';
      const filePath = entity.file_path || '';
      const entityType = entity.entity_type || source.entity_type_field || '';
      const storedId = entity.entity_id || '';

      if (!className || !filePath || !entityType || !storedId) continue;

      const computedId = generateEntityId(className, filePath, entityType);
      checked++;

      if (computedId !== storedId) {
        mismatches++;
        details.push(
          `MISMATCH: ${className} stored='${storedId}' computed='${computedId}'`,
        );
      }
    }
  }

  return {
    check_name: 'stored_id_parity',
    status: mismatches === 0 ? 'PASS' : 'FAIL',
    entities_checked: checked,
    mismatches,
    details: details.slice(0, 10),
  };
}

/**
 * Check 4: Surface identity stability.
 * Verify that route identity keys are non-empty and unique.
 */
function checkSurfaceIdentity(
  adjacencyMap: Record<string, any>,
): ParityCheckResult {
  const routeKeys = Object.keys(adjacencyMap).filter(k => {
    const node = adjacencyMap[k];
    return (node.entity_id || '').startsWith('rte_');
  });

  let mismatches = 0;
  const details: string[] = [];
  const seen = new Set<string>();

  for (const key of routeKeys) {
    if (!key || key.trim() === '') {
      mismatches++;
      details.push('EMPTY: route with empty identity key');
      continue;
    }

    if (seen.has(key)) {
      mismatches++;
      details.push(`DUPLICATE: route key '${key}' appears multiple times`);
    }
    seen.add(key);
  }

  return {
    check_name: 'surface_identity_stability',
    status: mismatches === 0 ? 'PASS' : 'FAIL',
    entities_checked: routeKeys.length,
    mismatches,
    details: details.slice(0, 10),
  };
}

// ─── Main Runner ────────────────────────────────────────

/**
 * Run the full identity parity harness.
 *
 * @param adjacencyMap  Loaded entity adjacency map
 * @param entitySources Generated entity data from scanners
 * @returns             Identity parity report
 */
export function runParityHarness(
  adjacencyMap: Record<string, any>,
  entitySources: Array<{
    entities: any[];
    entity_type_field?: string;
  }>,
): IdentityParityReport {
  // Build entity list for determinism/uniqueness checks
  const allEntities: Array<{ class_name: string; file_path: string; entity_type: string }> = [];

  for (const source of entitySources) {
    for (const entity of source.entities) {
      const className = entity.class_name || entity.fqcn || '';
      const filePath = entity.file_path || '';
      const entityType = entity.entity_type || source.entity_type_field || '';
      if (className && filePath && entityType) {
        allEntities.push({ class_name: className, file_path: filePath, entity_type: entityType });
      }
    }
  }

  // Run all checks
  const checks: ParityCheckResult[] = [
    checkDeterminism(allEntities),
    checkUniqueness(allEntities),
    checkStoredParity(adjacencyMap, entitySources),
    checkSurfaceIdentity(adjacencyMap),
  ];

  const totalMismatches = checks.reduce((sum, c) => sum + c.mismatches, 0);
  const totalCollisions = checks.find(c => c.check_name === 'entity_id_uniqueness')?.mismatches ?? 0;
  const passedChecks = checks.filter(c => c.status === 'PASS').length;

  return {
    generated_at: 'baseline',
    overall_status: totalMismatches === 0 ? 'PASS' : 'FAIL',
    checks,
    summary: {
      total_entities_verified: allEntities.length,
      total_mismatches: totalMismatches,
      total_collisions: totalCollisions,
      total_checks: checks.length,
      passed_checks: passedChecks,
    },
  };
}
