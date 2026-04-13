import { describe, it, expect } from 'vitest';
import {
  AUTHORITATIVE_LOADER_SURFACES,
  PLANNER_READONLY_SURFACES,
  PLANNER_FORBIDDEN_RECOMPUTATION_SURFACES,
  PLANNER_FORBIDDEN_MUTATION_SURFACES,
  PLANNER_BOUNDARY_CONTRACT_VERSION
} from '../../src/transport/plannerBoundaryContract.js';

describe('Phase 4.12: Planner Boundary Contract', () => {

  it('Test 1: Authoritative surfaces include stackIndex', () => {
    expect(AUTHORITATIVE_LOADER_SURFACES).toContain('stackIndex');
  });

  it('Test 2: Authoritative surfaces include dependencyDepth', () => {
    expect(AUTHORITATIVE_LOADER_SURFACES).toContain('dependencyDepth');
  });

  it('Test 3: Authoritative surfaces include dependencyAdjacencySurface', () => {
    expect(AUTHORITATIVE_LOADER_SURFACES).toContain('dependencyAdjacencySurface');
  });

  it('Test 4: Authoritative surfaces include closureGraphHash', () => {
    expect(AUTHORITATIVE_LOADER_SURFACES).toContain('closureGraphHash');
  });

  it('Test 5: Authoritative surfaces include policyStackFingerprint', () => {
    expect(AUTHORITATIVE_LOADER_SURFACES).toContain('policyStackFingerprint');
  });

  it('Test 6: Forbidden recomputation includes closureGraphHash', () => {
    expect(PLANNER_FORBIDDEN_RECOMPUTATION_SURFACES).toContain('closureGraphHash');
  });

  it('Test 7: Forbidden mutation includes executionMetadata', () => {
    expect(PLANNER_FORBIDDEN_MUTATION_SURFACES).toContain('executionMetadata');
  });

  it('Test 8: Forbidden mutation includes snapshotEnvelope', () => {
    expect(PLANNER_FORBIDDEN_MUTATION_SURFACES).toContain('snapshotEnvelope');
  });

  it('Test 9: Readonly surfaces include loaderTrustMetadata', () => {
    expect(PLANNER_READONLY_SURFACES).toContain('loaderTrustMetadata');
  });

  it('Test 10: Contract version is v1', () => {
    expect(PLANNER_BOUNDARY_CONTRACT_VERSION).toBe('v1');
  });

});
