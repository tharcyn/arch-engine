import { describe, it, expect } from 'vitest';
import * as coreExports from '../dist/index.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  Public Surface Snapshot — Export Boundary Guard
 * ═══════════════════════════════════════════════════════════
 *
 *  Captures the full set of externally reachable symbols from
 *  the root barrel (@arch-engine/core).
 *
 *  INVARIANT: generateEntityId, EntityResolver, and
 *  RouteIdentityBuilder MUST NOT appear in this list.
 *  Identity helpers are internal-only.
 */

const APPROVED_EXPORTS = [
  'EngineRunner',
  'GOVERNANCE_TELEMETRY_SCHEMA_VERSION',
  'computeGraphStabilityIndex',
  'computeWeightedBlastRadii',
  'evaluatePolicy',
  'loadEngineManifest',
  'loadPolicyConfig',
  'parseEngineManifest',
  'rankAuthorityCrossings',
  'resolveSeverity',
  'validateAdapterCompatibility'
].sort();

const FORBIDDEN_IDENTITY_SYMBOLS = [
  'generateEntityId',
  'EntityResolver',
  'RouteIdentityBuilder',
  'slugify',
  'extractShortName',
  'computeHash'
];

describe('public surface snapshot — root barrel boundary', () => {

  it('exports only approved symbols', () => {
    const actualKeys = Object.keys(coreExports).sort();
    expect(actualKeys).toEqual(APPROVED_EXPORTS);
  });

  it('does not leak identity helpers through root barrel', () => {
    const actualKeys = Object.keys(coreExports);
    for (const forbidden of FORBIDDEN_IDENTITY_SYMBOLS) {
      expect(actualKeys).not.toContain(forbidden);
    }
  });

  it('snapshot matches approved export surface', () => {
    expect(Object.keys(coreExports).sort()).toMatchSnapshot();
  });
});
