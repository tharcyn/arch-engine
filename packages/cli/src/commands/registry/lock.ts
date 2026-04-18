import { 
    PolicyPackRegistry, 
    resolveFederatedPolicyPackPlan, 
    resolvePolicyPackDependencyGraph,
    generatePolicyPackLockfile
} from '@arch-engine/core';
import * as fs from 'fs';
import * as path from 'path';

export async function registryLockCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    const registry = new PolicyPackRegistry();
    // Dummy populate for CLI demonstration context
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
    const datasetSchemas = ['schema-v1'];
    const executionMode = 'multi-provider-federated';

    const plan = resolveFederatedPolicyPackPlan(allPacks, providers, datasetSchemas, providers);
    
    if (plan.blockedPolicyPacks.length > 0 && plan.eligiblePolicyPacks.length === 0) {
        console.error('❌ Cannot generate lockfile: Capability mismatch detected.');
        return 2;
    }

    const graphResult = resolvePolicyPackDependencyGraph(allPacks, plan.eligiblePolicyPacks);

    if (graphResult.conflicts.length > 0 || graphResult.missingDependencies.length > 0) {
        console.error('❌ Cannot generate lockfile: Dependency conflict or missing dependency detected.');
        if (graphResult.resolutionDiagnostics.length > 0) {
            graphResult.resolutionDiagnostics.forEach(d => console.error(`  - ${d}`));
        }
        return 1;
    }

    const lockfile = generatePolicyPackLockfile(
        graphResult, 
        providers, // mock capability mapping 
        datasetSchemas, 
        executionMode, 
        plan.federatedCapabilityIntersectionHash
    );

    const lockfilePath = path.join(process.cwd(), 'arch-engine.lock.json');
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2));

    console.log(`\n🔒 Generated arch-engine.lock.json`);
    console.log(`Resolved ${lockfile.policyPacks.length} packs in closure.`);
    console.log(`Capability Hash: ${lockfile.capabilityIntersectionHash}\n`);

    return 0;
}
