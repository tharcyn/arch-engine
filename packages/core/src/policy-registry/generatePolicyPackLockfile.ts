import { createHash } from 'crypto';
import type { RegistryPolicyPackManifest } from './PolicyPackManifest.js';
import type { PolicyPackDependencyGraphResolutionResult } from './resolvePolicyPackDependencyGraph.js';

export interface PolicyPackLockfileEntry {
    readonly policyPackId: string;
    readonly resolvedVersion: string;
    readonly manifestHash: string;
    readonly dependencyHash: string;
    readonly capabilityCompatibilityHash: string;
    readonly datasetCompatibilityHash: string;
    readonly executionModeCompatibilityHash: string;
}

export interface PolicyPackLockfile {
    readonly lockfileVersion: '1';
    readonly generatedAtExcludedFromHash: string;
    readonly policyPacks: readonly PolicyPackLockfileEntry[];
    readonly capabilityIntersectionHash: string;
    readonly datasetCompatibilityHash: string;
    readonly executionModeHash: string;
    readonly federationExecutionHash: string;
}

function hashJSON(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export function generatePolicyPackLockfile(
    graphResult: PolicyPackDependencyGraphResolutionResult,
    federatedCapabilityIntersection: readonly string[],
    datasetSchemas: readonly string[],
    executionMode: string,
    federationExecutionHash: string
): PolicyPackLockfile {
    
    // Sort parameters internally before hashing to ensure stability
    const sortedCaps = [...federatedCapabilityIntersection].sort();
    const sortedSchemas = [...datasetSchemas].sort();

    const capabilityIntersectionHash = hashJSON(sortedCaps);
    const datasetCompatibilityHash = hashJSON(sortedSchemas);
    const executionModeHash = hashJSON(executionMode);

    const policyPacks: PolicyPackLockfileEntry[] = graphResult.resolvedGraph.map(pack => {
        // Manifest hash
        const canonicalManifest = {
            policyPackId: pack.policyPackId,
            policyPackVersion: pack.policyPackVersion,
            supportedCapabilities: [...pack.supportedCapabilities].sort(),
            requiredCapabilities: [...pack.requiredCapabilities].sort(),
            supportedDatasetSchemas: [...pack.supportedDatasetSchemas].sort(),
            supportedExecutionModes: [...pack.supportedExecutionModes].sort(),
            dependencies: [...(pack.dependencies || [])].sort((a, b) => a.policyPackId.localeCompare(b.policyPackId)),
            optionalDependencies: [...(pack.optionalDependencies || [])].sort((a, b) => a.policyPackId.localeCompare(b.policyPackId)),
            conflicts: [...(pack.conflicts || [])].sort()
        };
        const manifestHash = hashJSON(canonicalManifest);
        const dependencyHash = hashJSON({
            dependencies: canonicalManifest.dependencies,
            optionalDependencies: canonicalManifest.optionalDependencies,
            conflicts: canonicalManifest.conflicts
        });

        const packCapHash = hashJSON({ required: canonicalManifest.requiredCapabilities, provided: sortedCaps });
        const packDatasetHash = hashJSON({ supported: canonicalManifest.supportedDatasetSchemas, context: sortedSchemas });
        const packModeHash = hashJSON({ supported: canonicalManifest.supportedExecutionModes, mode: executionMode });

        return {
            policyPackId: pack.policyPackId,
            resolvedVersion: pack.policyPackVersion,
            manifestHash,
            dependencyHash,
            capabilityCompatibilityHash: packCapHash,
            datasetCompatibilityHash: packDatasetHash,
            executionModeCompatibilityHash: packModeHash
        };
    });

    // Ensure strict alphabetical sorting for determinism
    policyPacks.sort((a, b) => a.policyPackId.localeCompare(b.policyPackId));

    return {
        lockfileVersion: '1',
        generatedAtExcludedFromHash: new Date().toISOString(),
        policyPacks,
        capabilityIntersectionHash,
        datasetCompatibilityHash,
        executionModeHash,
        federationExecutionHash
    };
}
