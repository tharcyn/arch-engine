import { describe, test, expect } from 'vitest';
import { assessDatasetRuntimeCompatibility, DEFAULT_ENGINE_RUNTIME_METADATA } from '../../src/policy/assessDatasetRuntimeCompatibility';
import type { EngineRuntimeMetadata } from '../../src/policy/assessDatasetRuntimeCompatibility';
import type { ExternalTopologyDataset } from '../../src/topology/external-topology-types';

function makeDataset(overrides?: Partial<ExternalTopologyDataset>): ExternalTopologyDataset {
    return {
        topology_dataset_identity: { dataset: 'test', producer: 'test' },
        dataset_format_identifier: 'arch_engine_topology_export_v1',
        topology_schema_version: '1.0.0',
        policy_pack_compatibility: {
            authority_pack: '1.0.0',
            rest_contract_pack: '1.0.0',
            journey_pack: '1.0.0'
        },
        topology_capability_manifest: {
            supports_authority_scope: true,
            supports_directionality: true,
            supports_edge_confidence: true
        },
        ...overrides
    };
}

describe('assessDatasetRuntimeCompatibility', () => {
    test('fully compatible dataset returns compatible', () => {
        const result = assessDatasetRuntimeCompatibility(makeDataset());
        expect(result.overallStatus).toBe('compatible');
        expect(result.schemaCompatible).toBe(true);
        expect(result.formatCompatible).toBe(true);
        expect(result.policyPackCompatible).toBe(true);
        expect(result.capabilityCompatible).toBe(true);
    });

    describe('schema compatibility', () => {
        test('unsupported schema version', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({ topology_schema_version: '2.0.0' })
            );
            expect(result.schemaCompatible).toBe(false);
            expect(result.overallStatus).not.toBe('compatible');
            const finding = result.findings.find(f => f.code === 'DATASET_SCHEMA_INCOMPATIBLE');
            expect(finding).toBeDefined();
            expect(finding!.status).toBe('incompatible');
        });

        test('matching schema version', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({ topology_schema_version: '1.0.0' })
            );
            expect(result.schemaCompatible).toBe(true);
            const finding = result.findings.find(f => f.code === 'DATASET_SCHEMA_COMPATIBLE');
            expect(finding).toBeDefined();
        });
    });

    describe('format compatibility', () => {
        test('unknown format identifier', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({ dataset_format_identifier: 'unknown_format_v99' })
            );
            expect(result.formatCompatible).toBe(false);
            expect(result.overallStatus).not.toBe('compatible');
            const finding = result.findings.find(f => f.code === 'DATASET_FORMAT_UNSUPPORTED');
            expect(finding).toBeDefined();
            expect(finding!.status).toBe('incompatible');
        });

        test('supported format identifier', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({ dataset_format_identifier: 'arch_engine_topology_export_v1' })
            );
            expect(result.formatCompatible).toBe(true);
            const finding = result.findings.find(f => f.code === 'DATASET_FORMAT_SUPPORTED');
            expect(finding).toBeDefined();
        });
    });

    describe('policy-pack compatibility', () => {
        test('policy-pack compatibility satisfied', () => {
            const result = assessDatasetRuntimeCompatibility(makeDataset());
            expect(result.policyPackCompatible).toBe(true);
        });

        test('policy-pack compatibility unsatisfied — missing pack', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({
                    policy_pack_compatibility: {
                        authority_pack: '1.0.0',
                        nonexistent_pack: '1.0.0'
                    }
                })
            );
            expect(result.policyPackCompatible).toBe(false);
            const finding = result.findings.find(f => f.code === 'POLICY_PACK_INCOMPATIBLE');
            expect(finding).toBeDefined();
            expect(finding!.message).toContain('nonexistent_pack');
        });

        test('policy-pack compatibility unsatisfied — version range', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({
                    policy_pack_compatibility: {
                        authority_pack: '>=2.0.0'
                    }
                })
            );
            expect(result.policyPackCompatible).toBe(false);
            const finding = result.findings.find(f => f.code === 'POLICY_PACK_INCOMPATIBLE');
            expect(finding).toBeDefined();
        });
    });

    describe('capability negotiation', () => {
        test('missing engine capability', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({
                    topology_capability_manifest: {
                        supports_authority_scope: true,
                        supports_directionality: true,
                        supports_edge_confidence: true,
                        supports_advanced_routing: true
                    }
                })
            );
            expect(result.capabilityCompatible).toBe(false);
            expect(result.overallStatus).not.toBe('compatible');
            const finding = result.findings.find(f => f.code === 'ENGINE_CAPABILITY_MISSING');
            expect(finding).toBeDefined();
            expect(finding!.message).toContain('supports_advanced_routing');
        });

        test('all capabilities present', () => {
            const result = assessDatasetRuntimeCompatibility(makeDataset());
            expect(result.capabilityCompatible).toBe(true);
        });
    });

    describe('overall status composition', () => {
        test('partial compatibility downgrade', () => {
            // Schema and format ok, but missing capability
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({
                    topology_capability_manifest: {
                        supports_authority_scope: true,
                        supports_directionality: true,
                        supports_edge_confidence: true,
                        supports_magic_feature: true
                    }
                })
            );
            expect(result.overallStatus).toBe('partially-compatible');
            expect(result.schemaCompatible).toBe(true);
            expect(result.formatCompatible).toBe(true);
            expect(result.capabilityCompatible).toBe(false);
        });

        test('fully incompatible when all surfaces fail', () => {
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({
                    topology_schema_version: '9.0.0',
                    dataset_format_identifier: 'alien_format',
                    policy_pack_compatibility: { nonexistent: '1.0.0' },
                    topology_capability_manifest: { impossible_cap: true }
                })
            );
            expect(result.overallStatus).toBe('incompatible');
        });

        test('incompatible when single critical surface fails', () => {
            // Only schema is wrong, everything else is fine
            const result = assessDatasetRuntimeCompatibility(
                makeDataset({
                    topology_schema_version: '9.0.0'
                })
            );
            expect(result.overallStatus).toBe('incompatible');
        });
    });

    test('custom engine metadata overrides defaults', () => {
        const customMeta: EngineRuntimeMetadata = {
            supportedSchemaVersions: ['2.0.0'],
            supportedFormatIdentifiers: ['custom_format'],
            installedPolicyPacks: {},
            engineCapabilityRegistry: {}
        };
        const result = assessDatasetRuntimeCompatibility(makeDataset(), customMeta);
        expect(result.schemaCompatible).toBe(false);
        expect(result.formatCompatible).toBe(false);
    });
});
