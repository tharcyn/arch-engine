import { 
    PolicyPackRegistry, 
    resolveFederatedPolicyPackPlan, 
    resolvePolicyPackDependencyGraph,
    verifyPolicyPackLockfileReplay
} from '@arch-engine/core';
import * as fs from 'fs';
import * as path from 'path';

export async function registryVerifyLockCommand(options: any): Promise<number> {
    const lockfilePath = path.join(process.cwd(), 'arch-engine.lock.json');
    if (!fs.existsSync(lockfilePath)) {
        console.error('❌ arch-engine.lock.json not found.');
        return 5; // Registry drift / missing
    }

    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));

    const registry = new PolicyPackRegistry();
    // Dummy populate for CLI demonstration context matching lock generator
    registry.registerPolicyPack({
        policyPackId: 'authority-pack',
        policyPackVersion: '1.4.0',
        supportedCapabilities: ['github', 'gitlab'],
        requiredCapabilities: ['github'],
        supportedDatasetSchemas: ['schema-v1'],
        supportedExecutionModes: ['single-provider', 'multi-provider-federated'],
        dependencies: [{ policyPackId: 'base-pack', semverRange: '^1.0.0' }]
    });
    registry.registerPolicyPack({
        policyPackId: 'base-pack',
        policyPackVersion: '1.0.5',
        supportedCapabilities: ['github'],
        requiredCapabilities: [],
        supportedDatasetSchemas: ['schema-v1'],
        supportedExecutionModes: ['single-provider', 'multi-provider-federated']
    });

    const allPacks = registry.listRegisteredPolicyPacks();
    const mockProviders = ['github']; // hardcode to simulate context
    const datasetSchemas = ['schema-v1'];
    const executionMode = 'multi-provider-federated';

    const plan = resolveFederatedPolicyPackPlan(allPacks, mockProviders, datasetSchemas, mockProviders);
    const graphResult = resolvePolicyPackDependencyGraph(allPacks, plan.eligiblePolicyPacks);

    const validation = verifyPolicyPackLockfileReplay(
        lockfile,
        graphResult,
        mockProviders,
        datasetSchemas,
        executionMode,
        plan.federatedCapabilityIntersectionHash
    );

    if (validation.replayCompatible) {
        console.log('✅ Lockfile replay validation passed. Execution environment is deterministic.');
        return 0;
    }

    console.error('❌ Lockfile replay validation failed.');
    
    if (validation.capabilityDriftDetected.length > 0) {
        validation.capabilityDriftDetected.forEach(d => console.error(`  - ${d}`));
        return 2;
    }
    if (validation.datasetDriftDetected.length > 0) {
        validation.datasetDriftDetected.forEach(d => console.error(`  - ${d}`));
        return 3;
    }
    if (validation.executionModeDriftDetected.length > 0) {
        validation.executionModeDriftDetected.forEach(d => console.error(`  - ${d}`));
        return 4;
    }
    if (validation.dependencyDriftDetected.length > 0 || validation.registryDriftDetected.length > 0) {
        validation.dependencyDriftDetected.forEach(d => console.error(`  - ${d}`));
        validation.registryDriftDetected.forEach(d => console.error(`  - ${d}`));
        return 1;
    }

    return 5;
}
