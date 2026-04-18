import { describe, test, expect } from 'vitest';
import type { RegistryCatalogManifest } from '../../src/policy-registry/RegistryCatalogManifest.js';

describe('Catalog Manifest Contract', () => {
    test('manifest shape matches requirements', () => {
        const catalog: RegistryCatalogManifest = {
            catalogId: 'test-catalog',
            catalogVersion: '1.0.0',
            catalogGeneratedAtExcludedFromHash: 'timestamp-excluded',
            catalogSignature: 'valid-sig-test',
            catalogHash: 'mock-hash',
            policyPacks: [
                {
                    policyPackId: 'pack-alpha',
                    availableVersions: ['1.0.0', '1.1.0'],
                    manifestHashPerVersion: {
                        '1.0.0': 'hash-1.0.0',
                        '1.1.0': 'hash-1.1.0'
                    },
                    dependencyGraphHashPerVersion: {
                        '1.0.0': 'deps-1.0.0',
                        '1.1.0': 'deps-1.1.0'
                    }
                }
            ]
        };

        expect(catalog).toMatchInlineSnapshot(`
          {
            "catalogGeneratedAtExcludedFromHash": "timestamp-excluded",
            "catalogHash": "mock-hash",
            "catalogId": "test-catalog",
            "catalogSignature": "valid-sig-test",
            "catalogVersion": "1.0.0",
            "policyPacks": [
              {
                "availableVersions": [
                  "1.0.0",
                  "1.1.0",
                ],
                "dependencyGraphHashPerVersion": {
                  "1.0.0": "deps-1.0.0",
                  "1.1.0": "deps-1.1.0",
                },
                "manifestHashPerVersion": {
                  "1.0.0": "hash-1.0.0",
                  "1.1.0": "hash-1.1.0",
                },
                "policyPackId": "pack-alpha",
              },
            ],
          }
        `);
    });
});
