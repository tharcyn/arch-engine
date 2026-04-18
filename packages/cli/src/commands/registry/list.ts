import { PolicyPackRegistry } from '@arch-engine/core';

export async function registryListCommand(options: any): Promise<number> {
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

    const packs = registry.listRegisteredPolicyPacks();

    if (options.json) {
        console.log(JSON.stringify({ availablePacks: packs }, null, 2));
        return 0;
    }

    console.log('\n📦 --- Registered Policy Packs --- 📦\n');
    packs.forEach(p => {
        console.log(`${p.policyPackId}@${p.policyPackVersion}`);
        console.log(`  Capabilities: ${p.supportedCapabilities.join(', ')}`);
        console.log(`  Modes: ${p.supportedExecutionModes.join(', ')}`);
        console.log('');
    });

    return 0;
}
