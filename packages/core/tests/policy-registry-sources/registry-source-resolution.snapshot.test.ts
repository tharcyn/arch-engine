import { describe, test, expect } from 'vitest';
import type { RegistrySourceDescriptor } from '../../src/policy-registry/RegistrySourceDescriptor.js';
import type { RegistryCatalogManifest } from '../../src/policy-registry/RegistryCatalogManifest.js';
import { resolveRegistrySources } from '../../src/policy-registry/resolveRegistrySources.js';

describe('Registry Source Resolution Contract', () => {
    test('resolves sources with deterministic priority and trust enforcement', () => {
        const sources: RegistrySourceDescriptor[] = [
            {
                registrySourceId: 'z-mirror', // Alphabetically last, but high priority
                registrySourceType: 'filesystem-mirror',
                registrySourcePriority: 1,
                registryTrustLevel: 'verified-internal',
                catalogLocation: 'file:///tmp/catalog.json',
                catalogFormatVersion: '1',
                signatureRequirement: 'none'
            },
            {
                registrySourceId: 'remote-ecosystem',
                registrySourceType: 'remote-catalog',
                registrySourcePriority: 2,
                registryTrustLevel: 'verified-ecosystem',
                catalogLocation: 'https://registry.example.com',
                catalogFormatVersion: '1',
                signatureRequirement: 'required' // Will fail because signature is omitted
            },
            {
                registrySourceId: 'untrusted-source',
                registrySourceType: 'remote-catalog',
                registrySourcePriority: 3,
                registryTrustLevel: 'unverified',
                catalogLocation: 'https://evil.com',
                catalogFormatVersion: '1',
                signatureRequirement: 'none'
            },
            {
                registrySourceId: 'future-source',
                registrySourceType: 'remote-catalog',
                registrySourcePriority: 4,
                registryTrustLevel: 'verified-ecosystem',
                catalogLocation: 'https://next.com',
                catalogFormatVersion: '2', // Unsupported
                signatureRequirement: 'none'
            }
        ];

        const catalogs = new Map<string, RegistryCatalogManifest>();
        catalogs.set('z-mirror', {
            catalogId: 'z-mirror',
            catalogVersion: '1.0',
            catalogGeneratedAtExcludedFromHash: '',
            policyPacks: [],
            catalogSignature: null,
            catalogHash: 'hash-z'
        });
        catalogs.set('remote-ecosystem', {
            catalogId: 'remote-ecosystem',
            catalogVersion: '1.0',
            catalogGeneratedAtExcludedFromHash: '',
            policyPacks: [],
            catalogSignature: null, // missing required sig
            catalogHash: 'hash-ecosystem'
        });
        catalogs.set('untrusted-source', {
            catalogId: 'untrusted-source',
            catalogVersion: '1.0',
            catalogGeneratedAtExcludedFromHash: '',
            policyPacks: [],
            catalogSignature: null,
            catalogHash: 'hash-evil'
        });
        catalogs.set('future-source', {
            catalogId: 'future-source',
            catalogVersion: '1.0',
            catalogGeneratedAtExcludedFromHash: '',
            policyPacks: [],
            catalogSignature: null,
            catalogHash: 'hash-future'
        });

        // Resolve requiring 'verified-ecosystem' trust level
        const result = resolveRegistrySources(sources, catalogs, 'verified-ecosystem');

        expect(result).toMatchInlineSnapshot(`
          {
            "blockedSources": [
              {
                "catalogFormatVersion": "1",
                "catalogLocation": "https://registry.example.com",
                "registrySourceId": "remote-ecosystem",
                "registrySourcePriority": 2,
                "registrySourceType": "remote-catalog",
                "registryTrustLevel": "verified-ecosystem",
                "signatureRequirement": "required",
              },
              {
                "catalogFormatVersion": "1",
                "catalogLocation": "https://evil.com",
                "registrySourceId": "untrusted-source",
                "registrySourcePriority": 3,
                "registrySourceType": "remote-catalog",
                "registryTrustLevel": "unverified",
                "signatureRequirement": "none",
              },
              {
                "catalogFormatVersion": "2",
                "catalogLocation": "https://next.com",
                "registrySourceId": "future-source",
                "registrySourcePriority": 4,
                "registrySourceType": "remote-catalog",
                "registryTrustLevel": "verified-ecosystem",
                "signatureRequirement": "none",
              },
            ],
            "resolutionDiagnostics": [
              "Source z-mirror resolved successfully.",
              "Source remote-ecosystem blocked: Signature verification failed.",
              "Source untrusted-source blocked: Insufficient trust level.",
              "Source future-source blocked: Unsupported catalog format version 2",
            ],
            "resolvedSources": [
              {
                "catalogFormatVersion": "1",
                "catalogLocation": "file:///tmp/catalog.json",
                "registrySourceId": "z-mirror",
                "registrySourcePriority": 1,
                "registrySourceType": "filesystem-mirror",
                "registryTrustLevel": "verified-internal",
                "signatureRequirement": "none",
              },
            ],
            "schemaFailures": [
              {
                "catalogFormatVersion": "2",
                "catalogLocation": "https://next.com",
                "registrySourceId": "future-source",
                "registrySourcePriority": 4,
                "registrySourceType": "remote-catalog",
                "registryTrustLevel": "verified-ecosystem",
                "signatureRequirement": "none",
              },
            ],
            "signatureFailures": [
              {
                "catalogFormatVersion": "1",
                "catalogLocation": "https://registry.example.com",
                "registrySourceId": "remote-ecosystem",
                "registrySourcePriority": 2,
                "registrySourceType": "remote-catalog",
                "registryTrustLevel": "verified-ecosystem",
                "signatureRequirement": "required",
              },
            ],
            "trustFailures": [
              {
                "catalogFormatVersion": "1",
                "catalogLocation": "https://evil.com",
                "registrySourceId": "untrusted-source",
                "registrySourcePriority": 3,
                "registrySourceType": "remote-catalog",
                "registryTrustLevel": "unverified",
                "signatureRequirement": "none",
              },
            ],
          }
        `);
    });
});
