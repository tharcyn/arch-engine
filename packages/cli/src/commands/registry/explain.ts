import { PolicyPackRegistry, resolvePolicyPackDependencyGraph, resolveFederatedPolicyPackPlan, resolvePolicyPackVersions } from '@arch-engine/core';

export async function registryExplainCommand(packId: string, options: any): Promise<number> {
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

    const plan = resolveFederatedPolicyPackPlan(allPacks, providers, ['schema-v1'], providers);
    const eligiblePack = plan.eligiblePolicyPacks.find(p => p.policyPackId === packId);
    const blockedPack = plan.blockedPolicyPacks.find(p => p.policyPackId === packId);
    
    let targetPack = eligiblePack || blockedPack;
    if (!targetPack) {
        if (options.json) {
            console.log(JSON.stringify({ error: `Pack ${packId} not found in registry.` }));
        } else {
            console.error(`Error: Pack ${packId} not found.`);
        }
        return 1;
    }

    // Resolve versions manually to populate explain output
    const versionPlan = resolvePolicyPackVersions(allPacks, { [packId]: targetPack.policyPackVersion })[0];
    
    // Resolve dependency graph
    const graphResult = resolvePolicyPackDependencyGraph(allPacks, [targetPack]);

    const output = {
        selectionDecision: eligiblePack ? 'eligible' : 'blocked',
        dependencyClosure: graphResult.dependencyClosure,
        blockingCapabilities: plan.selectionDiagnostics.filter(d => d.includes('capabilities')),
        blockingDatasets: plan.selectionDiagnostics.filter(d => d.includes('schema')),
        blockingExecutionModes: plan.selectionDiagnostics.filter(d => d.includes('mode')),
        resolvedVersion: versionPlan.resolvedPack?.policyPackVersion || null,
        resolutionSource: 'local-registry'
    };

    if (options.json) {
        console.log(JSON.stringify(output, null, 2));
        return 0;
    }

    console.log(`\n📖 --- Registry Explain: ${packId} --- 📖\n`);
    console.log(`Selection Decision: ${output.selectionDecision.toUpperCase()}`);
    console.log(`Resolved Version: ${output.resolvedVersion}`);
    console.log(`Resolution Source: ${output.resolutionSource}`);
    
    console.log(`\nDependency Closure:`);
    output.dependencyClosure.forEach(dep => console.log(`  - ${dep}`));

    if (output.selectionDecision === 'blocked') {
        console.log('\nBlocking Constraints:');
        output.blockingCapabilities.forEach(c => console.log(`  - ${c}`));
        output.blockingDatasets.forEach(d => console.log(`  - ${d}`));
        output.blockingExecutionModes.forEach(m => console.log(`  - ${m}`));
    }
    
    console.log('');
    return 0;
}
