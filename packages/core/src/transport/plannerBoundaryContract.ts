/**
 * Phase 4.12 Objective 6: Planner Boundary Contract
 *
 * Documents and exports constants describing loader-owned surfaces,
 * planner-consumable authoritative surfaces, and planner-forbidden
 * recomputation/mutation surfaces.
 *
 * This is importable and enforceable in Phase 5.
 */

export const PLANNER_BOUNDARY_CONTRACT_VERSION = 'v1';

/**
 * Surfaces produced by the loader kernel that are authoritative.
 * Phase 5 must consume these directly — recomputation is forbidden.
 */
export const AUTHORITATIVE_LOADER_SURFACES = [
  'stackIndex',
  'dependencyDepth',
  'dependencyAdjacencySurface',
  'dependencyGraphShapeHash',
  'closureGraphHash',
  'policyStackFingerprint',
  'extendedPolicyStackFingerprint',
  'manifestDigestSetHash',
  'registrySourceHash',
  'namespaceSetHash',
  'explainabilityGraphHash'
] as const;

/**
 * Surfaces that Phase 5 may read but must not mutate.
 */
export const PLANNER_READONLY_SURFACES = [
  'snapshotEnvelope',
  'loaderTrustMetadata',
  'loaderClosureMetadata',
  'registryProvenance',
  'activeTrustScopes',
  'stackTopologicalOrder'
] as const;

/**
 * Surfaces that Phase 5 must never recompute.
 * These are loader-owned computations with deterministic identity semantics.
 */
export const PLANNER_FORBIDDEN_RECOMPUTATION_SURFACES = [
  'closureGraphHash',
  'trustScopeHash',
  'trustPolicyHash',
  'policyStackFingerprint',
  'extendedPolicyStackFingerprint',
  'dependencyGraphShapeHash',
  'registrySourceHash',
  'manifestDigestSetHash',
  'namespaceSetHash',
  'explainabilityGraphHash',
  'stackIndex',
  'dependencyDepth',
  'dependencyAdjacencySurface'
] as const;

/**
 * Surfaces that Phase 5 must never mutate.
 * Deeply frozen by the loader kernel post-pipeline.
 */
export const PLANNER_FORBIDDEN_MUTATION_SURFACES = [
  'executionMetadata',
  'snapshotEnvelope',
  'dependencyAdjacencySurface',
  'loaderTrustMetadata',
  'loaderClosureMetadata'
] as const;

export type AuthoritativeLoaderSurface = typeof AUTHORITATIVE_LOADER_SURFACES[number];
export type PlannerReadonlySurface = typeof PLANNER_READONLY_SURFACES[number];
export type PlannerForbiddenRecomputationSurface = typeof PLANNER_FORBIDDEN_RECOMPUTATION_SURFACES[number];
export type PlannerForbiddenMutationSurface = typeof PLANNER_FORBIDDEN_MUTATION_SURFACES[number];
