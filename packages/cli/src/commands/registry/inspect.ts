import { PolicyPackRegistry } from '@arch-engine/core';

export async function registryInspectCommand(packId: string, options: any): Promise<number> {
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

    const pack = registry.listRegisteredPolicyPacks().find(p => p.policyPackId === packId);

    if (!pack) {
        if (options.json) {
            console.log(JSON.stringify({ error: `Pack ${packId} not found` }));
        } else {
            console.error(`❌ Pack ${packId} not found in registry.`);
        }
        return 1; // 1 = no compatible policy packs available (as proxy for not found)
    }

    if (options.json) {
        console.log(JSON.stringify(pack, null, 2));
        return 0;
    }

    console.log(`\n🔍 Inspecting Policy Pack: ${pack.policyPackId}@${pack.policyPackVersion}\n`);
    console.log(`Supported Capabilities: ${pack.supportedCapabilities.join(', ') || 'None'}`);
    console.log(`Required Capabilities: ${pack.requiredCapabilities.join(', ') || 'None'}`);
    console.log(`Supported Schemas: ${pack.supportedDatasetSchemas.join(', ') || 'Any'}`);
    console.log(`Supported Modes: ${pack.supportedExecutionModes.join(', ')}`);
    console.log('');
    return 0;
}
