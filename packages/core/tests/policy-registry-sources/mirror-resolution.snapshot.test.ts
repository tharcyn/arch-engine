import { describe, test, expect } from 'vitest';
import type { RegistrySourceDescriptor } from '../../src/policy-registry/RegistrySourceDescriptor.js';
import type { RegistryCatalogManifest } from '../../src/policy-registry/RegistryCatalogManifest.js';
import { resolveRegistryMirrorFallback } from '../../src/policy-registry/resolveRegistryMirrorFallback.js';

describe('Mirror Resolution Contract', () => {
    test('resolves fallback from mirror correctly and detects tampered mirror base', () => {
        const sources: RegistrySourceDescriptor[] = [
            {
                registrySourceId: 'primary-source',
                registrySourceType: 'remote-catalog',
                registrySourcePriority: 1,
                registryTrustLevel: 'verified-ecosystem',
                catalogLocation: '',
                catalogFormatVersion: '1',
                signatureRequirement: 'none'
            },
            {
                registrySourceId: 'fallback-mirror',
                registrySourceType: 'filesystem-mirror',
                registrySourcePriority: 2,
                registryTrustLevel: 'verified-internal',
                catalogLocation: '',
                catalogFormatVersion: '1',
                signatureRequirement: 'none'
            }
        ];

        const catalogs = new Map<string, RegistryCatalogManifest>();
        catalogs.set('primary-source', {
            catalogId: 'primary-source',
            catalogVersion: '1',
            catalogGeneratedAtExcludedFromHash: '',
            catalogSignature: null,
            catalogHash: '',
            policyPacks: [
                {
                    policyPackId: 'pack-A',
                    availableVersions: ['1.0.0'], // Missing 1.1.0
                    manifestHashPerVersion: { '1.0.0': 'hash-A' },
                    dependencyGraphHashPerVersion: { '1.0.0': 'dep-A' }
                },
                {
                    policyPackId: 'pack-B',
                    availableVersions: ['1.0.0'],
                    manifestHashPerVersion: { '1.0.0': 'hash-B-real' }, // Notice real hash
                    dependencyGraphHashPerVersion: { '1.0.0': 'dep-B' }
                }
            ]
        });

        catalogs.set('fallback-mirror', {
            catalogId: 'fallback-mirror',
            catalogVersion: '1',
            catalogGeneratedAtExcludedFromHash: '',
            catalogSignature: null,
            catalogHash: '',
            policyPacks: [
                {
                    policyPackId: 'pack-A',
                    availableVersions: ['1.0.0', '1.1.0'], // Provides 1.1.0!
                    manifestHashPerVersion: { '1.0.0': 'hash-A', '1.1.0': 'hash-A2' },
                    dependencyGraphHashPerVersion: { '1.0.0': 'dep-A', '1.1.0': 'dep-A2' }
                },
                {
                    policyPackId: 'pack-B',
                    availableVersions: ['1.0.0', '1.1.0'],
                    manifestHashPerVersion: { '1.0.0': 'hash-B-FAKE', '1.1.0': 'hash-B2' }, // FAKE base hash!
                    dependencyGraphHashPerVersion: { '1.0.0': 'dep-B', '1.1.0': 'dep-B2' }
                }
            ]
        });

        const requirements = [
            { policyPackId: 'pack-A', version: '1.1.0' }, // Missing in primary, okay in mirror
            { policyPackId: 'pack-B', version: '1.1.0' }, // Tampered in mirror!
            { policyPackId: 'pack-C', version: '1.0.0' }  // Missing everywhere
        ];

        const result = resolveRegistryMirrorFallback(requirements, 'primary-source', sources, catalogs);

        expect(result).toMatchInlineSnapshot(`
          {
            "mirrorConflicts": [
              "pack-B@1.1.0",
            ],
            "mirrorDiagnostics": [
              "Resolved pack-A@1.1.0 from mirror fallback-mirror",
              "Mirror conflict: fallback-mirror provides tampered manifest base for pack-B",
              "Could not resolve pack-B@1.1.0 from primary or any mirrors.",
              "Could not resolve pack-C@1.0.0 from primary or any mirrors.",
            ],
            "mirrorFallbackUsed": [
              "fallback-mirror",
            ],
            "resolvedFromMirror": [
              "pack-A@1.1.0",
            ],
          }
        `);
    });
});
