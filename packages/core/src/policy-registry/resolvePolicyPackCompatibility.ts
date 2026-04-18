import type { RegistryPolicyPackManifest } from './PolicyPackManifest.js';

export interface PolicyPackCompatibilityResult {
    readonly eligible: readonly RegistryPolicyPackManifest[];
    readonly blocked: readonly RegistryPolicyPackManifest[];
    readonly blockingCapabilities: readonly string[];
    readonly blockingDatasets: readonly string[];
    readonly blockingExecutionModes: readonly string[];
}

export function resolvePolicyPackCompatibility(
    packs: readonly RegistryPolicyPackManifest[],
    capabilities: readonly string[],
    datasetSchemas: readonly string[],
    executionMode: 'single-provider' | 'multi-provider-federated'
): PolicyPackCompatibilityResult {
    const eligible: RegistryPolicyPackManifest[] = [];
    const blocked: RegistryPolicyPackManifest[] = [];
    const blockingCapabilities = new Set<string>();
    const blockingDatasets = new Set<string>();
    const blockingExecutionModes = new Set<string>();

    for (const pack of packs) {
        let isBlocked = false;

        // Check required capabilities
        const missingCaps = pack.requiredCapabilities.filter(c => !capabilities.includes(c));
        if (missingCaps.length > 0) {
            isBlocked = true;
            missingCaps.forEach(c => blockingCapabilities.add(c));
        }

        // Check dataset schemas
        if (pack.supportedDatasetSchemas.length > 0) {
            const hasSupportedSchema = datasetSchemas.some(s => pack.supportedDatasetSchemas.includes(s));
            if (!hasSupportedSchema) {
                isBlocked = true;
                pack.supportedDatasetSchemas.forEach(s => blockingDatasets.add(s));
            }
        }

        // Check execution mode
        if (!pack.supportedExecutionModes.includes(executionMode)) {
            isBlocked = true;
            blockingExecutionModes.add(executionMode);
        }

        if (isBlocked) {
            blocked.push(pack);
        } else {
            eligible.push(pack);
        }
    }

    return {
        eligible,
        blocked,
        blockingCapabilities: Array.from(blockingCapabilities).sort(),
        blockingDatasets: Array.from(blockingDatasets).sort(),
        blockingExecutionModes: Array.from(blockingExecutionModes).sort()
    };
}
