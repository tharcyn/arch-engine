import { describe, test, expect } from 'vitest';
import { assessFederationExecutionPreflight } from '../../src/policy/assessFederationExecutionPreflight';
import type { TrustPolicyConfig } from '../../src/trust/TrustPolicyConfig';

describe('Phase 15A assessFederationExecutionPreflight', () => {

    test('returns allowed when fully compatible', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'permissive'
        };

        const result = assessFederationExecutionPreflight(
            trustConfig,
            'policy-lock.json',
            undefined, // no lockfile => permissive allows it
            [], undefined, {}, {}, {}, {}, undefined, undefined, []
        );

        expect(result.allowed).toBe(true);
        expect(result.overallStatus).toBe('ready');
    });

    test('returns blocked and invalid for broken trust config', () => {
        const result = assessFederationExecutionPreflight(
            { enforcementMode: 'require-signature' } as any,
            'policy-lock.json',
            undefined,
            [],
            undefined, {}, {}, {}, {}, undefined, []
        );

        expect(result.allowed).toBe(false);
        expect(result.overallStatus).toBe('invalid');
        expect(result.primaryBlockReason).toBe('TRUST_POLICY_INVALID');
        expect(result.suggestedNextAction).toContain('Inspect trust.json configuration');
    });

    test('returns degraded but allowed under permissive mode for capability missing', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'permissive'
        };

        const result = assessFederationExecutionPreflight(
            trustConfig,
            'policy-lock.json',
            undefined,
            [],
            undefined, {}, {}, {}, {}, {},
            { 
                // fake dataset to trigger activeDataset checks
                topology_dataset_identity: { dataset_id: 'test' }
            } as any, 
            [{
                policyPackId: 'pack',
                description: '', category: '',
                requiredDatasetCapabilities: ['missing_cap']
            }]
        );

        // Under permissive, missing capability does not block
        expect(result.allowed).toBe(true);
        expect(result.overallStatus).toBe('degraded');
        expect(result.contributingFindings.some(f => f.includes('Dataset runtime compatibility: incompatible'))).toBe(true);
        expect(result.contributingFindings.some(f => f.includes('1 or more policy packs are incompatible'))).toBe(true);
    });

    test('returns blocked under strict mode for capability missing', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'require-signature',
            lockfileSigners: {
                'test': { key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----', allowedOperations: ['verify'] }
            }
        };

        const result = assessFederationExecutionPreflight(
            trustConfig,
            'policy-lock.json',
            undefined, // no lockfile -> blocked by enforcement!
            [],
            undefined, {}, {}, {}, {},
            undefined, 
            []
        );

        // In strict mode without a lockfile, enforcement blocks it.
        expect(result.allowed).toBe(false);
        expect(result.overallStatus).toBe('blocked');
        expect(result.primaryBlockReason).toBe('LOCKFILE_ENFORCEMENT_BLOCKED');
    });

    test('returns blocked under strict mode for policy execution incompatible', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'require-signature',
            lockfileSigners: {
                'test': { key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----', allowedOperations: ['verify'] }
            }
        };

        const lockfile = {
            schemaVersion: '1.0.0',
            datasetIdentity: { topologyDatasetIdentity: 'ds' },
            registries: []
        };

        const result = assessFederationExecutionPreflight(
            trustConfig,
            'policy-lock.json',
            lockfile as any,
            [{ registryUrl: 'ds', packs: [] }],
            { topologyDatasetIdentity: 'ds', datasetSemver: '1.0.0', datasetFormatIdentifier: 'arch_engine_topology_export_v1', topologySchemaVersion: '1.0.0', datasetLineage: { derivationPath: [], originDatasetId: 'ds' } } as any, // matched
            {}, {}, {}, {}, {},
            { topology_dataset_identity: { dataset_id: 'ds' } } as any, 
            [{
                policyPackId: 'pack',
                description: '', category: '',
                requiredDatasetCapabilities: ['missing_cap']
            }]
        );

        expect(result.allowed).toBe(false);
        expect(result.overallStatus).toBe('blocked');
        expect(result.primaryBlockReason).toBe('LOCKFILE_ENFORCEMENT_BLOCKED');
    });
});
