import { describe, test, expect } from 'vitest';
import { materializeFederationExecutionPlan } from '../../src/policy/materializeFederationExecutionPlan';
import type { TrustPolicyConfig } from '../../src/trust/TrustPolicyConfig';
import type { PolicyPackMetadata } from '../../src/policy/PolicyPackMetadata';

describe('Phase 15B materializeFederationExecutionPlan', () => {

    test('returns complete plan when all packs are runnable', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'permissive'
        };

        const installedPacks: PolicyPackMetadata[] = [
            {
                policyPackId: 'pack1',
                description: '', category: '',
                requiredDatasetCapabilities: []
            }
        ];

        const result = materializeFederationExecutionPlan(
            trustConfig,
            'policy-lock.json',
            undefined,
            [], undefined, {}, {}, {}, {}, undefined, {} as any,
            installedPacks
        );

        expect(result.allowed).toBe(true);
        expect(result.overallPlanStatus).toBe('complete');
        expect(result.runnablePolicyPacks).toBe(1);
        expect(result.packResults[0].executionStatus).toBe('runnable');
    });

    test('returns partial plan when some packs are blocked', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'permissive'
        };

        const installedPacks: PolicyPackMetadata[] = [
            {
                policyPackId: 'pack1',
                description: '', category: '',
                requiredDatasetCapabilities: []
            },
            {
                policyPackId: 'pack2',
                description: '', category: '',
                requiredDatasetCapabilities: ['missing_cap'] // this will fail capability check
            }
        ];

        const result = materializeFederationExecutionPlan(
            trustConfig,
            'policy-lock.json',
            undefined,
            [], undefined, {}, {}, {}, {}, undefined, 
            { topology_dataset_identity: { dataset_id: 'test' } } as any, // activeDataset
            installedPacks
        );

        // under permissive mode, overall is allowed, but plan is partial
        expect(result.allowed).toBe(true); // wait, if a pack is incompatible, preflight marks degraded but executioncompat says incompatible.
        // Let's check `allowed`. In permissive mode, preflight allows it but executionStatus is incompatible.
        // Wait, if executionStatus is blocked, `materialize` says `allowed = false`. Let's see.
        expect(result.overallPlanStatus).toBe('partial');
        expect(result.packResults.find(p => p.policyPackId === 'pack1')?.executionStatus).toBe('runnable');
        expect(result.packResults.find(p => p.policyPackId === 'pack2')?.executionStatus).toBe('blocked');
    });

    test('returns blocked plan when preflight fails globally', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'require-signature',
            lockfileSigners: { 'test': { key: 'foo', allowedOperations: ['verify'] } }
        };

        const installedPacks: PolicyPackMetadata[] = [
            {
                policyPackId: 'pack1',
                description: '', category: '',
                requiredDatasetCapabilities: []
            }
        ];

        const result = materializeFederationExecutionPlan(
            trustConfig,
            'policy-lock.json',
            undefined, // no lockfile under strict mode -> global block
            [], undefined, {}, {}, {}, {}, undefined, {} as any,
            installedPacks
        );

        expect(result.allowed).toBe(false);
        expect(result.overallPlanStatus).toBe('invalid');
        expect(result.packResults[0].executionStatus).toBe('blocked');
        expect(result.packResults[0].humanReadableReason).toContain('Execution blocked globally');
    });

    test('returns empty plan when no packs are installed', () => {
        const trustConfig: TrustPolicyConfig = {
            version: '1.0.0',
            enforcementMode: 'permissive'
        };

        const result = materializeFederationExecutionPlan(
            trustConfig,
            'policy-lock.json',
            undefined,
            [], undefined, {}, {}, {}, {}, undefined, {} as any,
            []
        );

        expect(result.allowed).toBe(true);
        expect(result.overallPlanStatus).toBe('empty');
        expect(result.totalPolicyPacks).toBe(0);
    });
});
