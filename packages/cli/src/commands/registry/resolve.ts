import { PolicyPackRegistry, resolveFederatedPolicyPackPlan } from '@arch-engine/core';

export async function registryResolveCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    if (providers.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ error: "Must specify at least one provider using --providers" }));
        } else {
            console.error('Error: Must specify at least one provider using --providers');
        }
        return 1;
    }

    const registry = new PolicyPackRegistry();
    
    // Dummy populate for CLI demonstration context
    registry.registerPolicyPack({
        policyPackId: 'authority-pack',
        policyPackVersion: '1.4.0',
        supportedCapabilities: ['github', 'gitlab'],
        requiredCapabilities: ['github'],
        supportedDatasetSchemas: ['schema-v1'],
        supportedExecutionModes: ['single-provider', 'multi-provider-federated']
    });

    // In a real execution, we'd load the providers and get their actual intersections
    // For resolution context, we'll assume the intersection is exactly the provided providers
    const availablePacks = registry.listRegisteredPolicyPacks();
    const federatedCapabilitiesIntersection = providers; // Mock capability mapping
    const datasetSchemas = ['schema-v1'];

    const plan = resolveFederatedPolicyPackPlan(availablePacks, federatedCapabilitiesIntersection, datasetSchemas);

    if (options.json) {
        console.log(JSON.stringify(plan, null, 2));
        if (plan.eligiblePolicyPacks.length === 0) return 2; // capability mismatch / no eligible
        return 0;
    }

    console.log(`\n🧩 --- Registry Resolution Plan --- 🧩\n`);
    console.log(`Providers: ${providers.join(', ')}`);
    console.log(`Eligible Packs: ${plan.eligiblePolicyPacks.length}`);
    plan.eligiblePolicyPacks.forEach(p => console.log(`  ✅ ${p.policyPackId}@${p.policyPackVersion}`));
    
    console.log(`\nBlocked Packs: ${plan.blockedPolicyPacks.length}`);
    plan.blockedPolicyPacks.forEach(p => console.log(`  ❌ ${p.policyPackId}@${p.policyPackVersion}`));

    if (plan.selectionDiagnostics.length > 0) {
        console.log('\nDiagnostics:');
        plan.selectionDiagnostics.forEach(d => console.log(`  - ${d}`));
    }
    console.log('');
    
    if (plan.eligiblePolicyPacks.length === 0) return 2;
    return 0;
}
