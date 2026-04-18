import type { RegistryPolicyPackManifest } from '@arch-engine/core';

export interface PolicyPackManifestOptions {
    policyPackId: string;
    policyPackVersion: string;
    supportedCapabilities: string[];
    requiredCapabilities?: string[];
    supportedDatasetSchemas: string[];
    supportedExecutionModes: string[];
}

export function createPolicyPackManifest(options: PolicyPackManifestOptions): RegistryPolicyPackManifest {
    const execModes = Array.from(new Set(options.supportedExecutionModes))
        .filter(m => m === 'single-provider' || m === 'multi-provider-federated')
        .sort() as ('single-provider' | 'multi-provider-federated')[];

    return {
        policyPackId: options.policyPackId,
        policyPackVersion: options.policyPackVersion,
        supportedCapabilities: Array.from(new Set(options.supportedCapabilities)).sort(),
        requiredCapabilities: Array.from(new Set(options.requiredCapabilities || [])).sort(),
        supportedDatasetSchemas: Array.from(new Set(options.supportedDatasetSchemas)).sort(),
        supportedExecutionModes: execModes
    };
}

export function defineDependencies(deps: string[]): string[] {
    return Array.from(new Set(deps)).sort();
}

export function defineOptionalDependencies(deps: string[]): string[] {
    return Array.from(new Set(deps)).sort();
}

export function defineConflicts(conflicts: string[]): string[] {
    return Array.from(new Set(conflicts)).sort();
}
