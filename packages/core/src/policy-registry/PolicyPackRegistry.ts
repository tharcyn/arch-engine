import * as semver from 'semver';
import type { RegistryPolicyPackManifest } from './PolicyPackManifest.js';

export class PolicyPackRegistry {
    private readonly packs = new Map<string, RegistryPolicyPackManifest[]>();

    public registerPolicyPack(manifest: RegistryPolicyPackManifest): void {
        if (!semver.valid(manifest.policyPackVersion)) {
            throw new Error(`Invalid semver version: ${manifest.policyPackVersion}`);
        }

        const existingVersions = this.packs.get(manifest.policyPackId) || [];
        
        // Ensure no duplicate versions
        if (existingVersions.some(p => p.policyPackVersion === manifest.policyPackVersion)) {
            throw new Error(`Policy pack ${manifest.policyPackId}@${manifest.policyPackVersion} already registered`);
        }

        existingVersions.push(manifest);
        // Sort descending by semver
        existingVersions.sort((a, b) => semver.rcompare(a.policyPackVersion, b.policyPackVersion));
        
        this.packs.set(manifest.policyPackId, existingVersions);
    }

    public listRegisteredPolicyPacks(): readonly RegistryPolicyPackManifest[] {
        const allPacks: RegistryPolicyPackManifest[] = [];
        
        // Deterministic alphabetical order by ID
        const sortedIds = Array.from(this.packs.keys()).sort();
        
        for (const id of sortedIds) {
            allPacks.push(...this.packs.get(id)!);
        }
        
        return allPacks;
    }

    public resolveEligiblePolicyPacks(
        capabilities: readonly string[],
        datasetSchemas: readonly string[],
        executionMode: 'single-provider' | 'multi-provider-federated'
    ): readonly RegistryPolicyPackManifest[] {
        const eligible: RegistryPolicyPackManifest[] = [];
        const allPacks = this.listRegisteredPolicyPacks();

        for (const pack of allPacks) {
            // Check required capabilities
            const meetsCapabilities = pack.requiredCapabilities.every(c => capabilities.includes(c));
            
            // Check dataset schemas
            // Assuming empty array means no specific schema required, or we must intersect
            const meetsSchemas = pack.supportedDatasetSchemas.length === 0 || 
                datasetSchemas.some(s => pack.supportedDatasetSchemas.includes(s));
                
            // Check execution mode
            const meetsMode = pack.supportedExecutionModes.includes(executionMode);

            if (meetsCapabilities && meetsSchemas && meetsMode) {
                // To keep this deterministic, if we have multiple versions of the same pack,
                // we should only include the latest eligible version.
                const alreadyIncluded = eligible.some(e => e.policyPackId === pack.policyPackId);
                if (!alreadyIncluded) {
                    eligible.push(pack);
                }
            }
        }

        return eligible;
    }
}
