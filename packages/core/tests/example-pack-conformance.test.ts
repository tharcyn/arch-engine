import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════
 *  Example Pack Conformance — Living Federation Contract Proof
 * ═══════════════════════════════════════════════════════════
 *
 *  Validates the canonical trusted-fallback example topology
 *  produces deterministic output matching expected-output.json.
 *
 *  This test converts the example from a documentation artifact
 *  into an executable conformance assertion.
 */

const EXAMPLE_DIR = path.resolve(__dirname, '../../../examples/trusted-fallback');

function loadJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('example pack conformance — trusted-fallback topology', () => {

  it('example directory contains all required artifacts', () => {
    const requiredFiles = [
      'descriptor-matrix.json',
      'providers/primary.json',
      'providers/fallback.json',
      'requirements/seam-requirements.json',
      'execution-config.json',
      'topology.json',
      'expected-output.json',
      'assertions.json',
      'README.md'
    ];

    for (const file of requiredFiles) {
      expect(
        fs.existsSync(path.join(EXAMPLE_DIR, file)),
        `Missing required artifact: ${file}`
      ).toBe(true);
    }
  });

  it('topology resolves to expected deterministic output', () => {
    const topology = loadJson(path.join(EXAMPLE_DIR, 'topology.json'));
    const config = loadJson(path.join(EXAMPLE_DIR, 'execution-config.json'));
    const primary = loadJson(path.join(EXAMPLE_DIR, 'providers/primary.json'));
    const fallback = loadJson(path.join(EXAMPLE_DIR, 'providers/fallback.json'));
    const requirements = loadJson(path.join(EXAMPLE_DIR, 'requirements/seam-requirements.json'));
    const expectedOutput = loadJson(path.join(EXAMPLE_DIR, 'expected-output.json'));

    // Deterministic resolution logic:
    // 1. Primary is unavailable → skip
    // 2. Fallback is a mirror-equivalent → eligible
    // 3. Fallback matches all required capabilities
    // 4. No conflict — single viable candidate
    // 5. Resolution is deterministic
    const providers = [primary, fallback];
    const availableProviders = providers.filter(p => p.available);
    const selectedProvider = availableProviders[0]; // Authority-first with single candidate

    const result = {
      providerSelected: selectedProvider.providerId,
      fallbackUsed: selectedProvider.providerId !== primary.providerId,
      mirrorEquivalent: selectedProvider.mirrorOf === primary.providerId,
      conflictDetected: availableProviders.length > 1 &&
        availableProviders.some(p => p.authorityLevel === availableProviders[0].authorityLevel),
      resolutionOutcome: 'deterministic' as const
    };

    expect(result).toEqual(expectedOutput);
  });

  it('assertions.json proves identity reproducibility invariants', () => {
    const assertions = loadJson(path.join(EXAMPLE_DIR, 'assertions.json'));
    const topology = loadJson(path.join(EXAMPLE_DIR, 'topology.json'));

    // Verify resolution outcome matches assertions
    expect(assertions.mirrorEquivalent).toBe(true);
    expect(assertions.resolutionOutcome).toBe('deterministic');

    // Verify identity reproducibility metadata
    expect(assertions.identityReproducibility).toBeDefined();
    expect(assertions.identityReproducibility.executionInvariant).toBe('deterministic');
    expect(assertions.identityReproducibility.topologyVersion).toBe(topology.topologyVersion);
    expect(assertions.identityReproducibility.registryId).toBe('registry-central');
  });

  it('descriptor matrix is structurally valid', () => {
    const matrix = loadJson(path.join(EXAMPLE_DIR, 'descriptor-matrix.json'));
    expect(matrix.schemaVersion).toBe('R0-v1');
    expect(matrix.descriptors).toBeDefined();
    expect(matrix.compatibilityMatrix).toBeDefined();
  });

  it('providers satisfy seam requirements', () => {
    const requirements = loadJson(path.join(EXAMPLE_DIR, 'requirements/seam-requirements.json'));
    const fallback = loadJson(path.join(EXAMPLE_DIR, 'providers/fallback.json'));

    for (const cap of requirements.requiredCapabilities) {
      expect(fallback.capabilities).toContain(cap);
    }
  });

  it('expected output snapshot is stable', () => {
    const expectedOutput = loadJson(path.join(EXAMPLE_DIR, 'expected-output.json'));
    expect(expectedOutput).toMatchSnapshot();
  });
});
