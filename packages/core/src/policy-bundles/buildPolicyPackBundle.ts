import { createHash } from 'crypto';
import type { ArchPolicyPackBundleFormat } from './ArchPolicyPackBundleFormat.js';
import type { PolicyPackBundleManifest } from './PolicyPackBundleManifest.js';
import type { RegistryPolicyPackManifest } from '../policy-registry/PolicyPackManifest.js';
import { resolvePolicyPackDependencyGraph } from '../policy-registry/resolvePolicyPackDependencyGraph.js';
import { resolveFederatedPolicyPackPlan } from '../policy-registry/resolveFederatedPolicyPackPlan.js';

export interface PolicyPackBundleBuildResult {
    readonly bundleId: string;
    readonly bundleHash: string;
    readonly includedPolicyPacks: readonly RegistryPolicyPackManifest[];
    readonly dependencyClosure: readonly string[];
    readonly snapshotHashes: Record<string, string>;
    readonly buildDiagnostics: readonly string[];
    readonly bundleArtifact: ArchPolicyPackBundleFormat | null;
}

function hashJSON(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export function buildPolicyPackBundle(
    bundleId: string,
    bundleVersion: string,
    entryPacks: readonly RegistryPolicyPackManifest[],
    availablePacks: readonly RegistryPolicyPackManifest[],
    federatedCapabilitiesIntersection: readonly string[],
    datasetSchemas: readonly string[],
    executionMode: 'single-provider' | 'multi-provider-federated',
    providerIds: readonly string[],
    lockfileReferenceHash: string | null = null
): PolicyPackBundleBuildResult {
    
    const diagnostics: string[] = [];

    // Resolve compatibility first
    const plan = resolveFederatedPolicyPackPlan(availablePacks, federatedCapabilitiesIntersection, datasetSchemas, providerIds);

    // Filter entry packs to ensure they are eligible
    const eligibleEntryPacks = entryPacks.filter(ep => 
        plan.eligiblePolicyPacks.some(p => p.policyPackId === ep.policyPackId)
    );

    if (eligibleEntryPacks.length !== entryPacks.length) {
        diagnostics.push('Capability, dataset, or execution-mode mismatch detected on entry packs. Bundle build failed.');
        return {
            bundleId,
            bundleHash: '',
            includedPolicyPacks: [],
            dependencyClosure: [],
            snapshotHashes: {},
            buildDiagnostics: diagnostics,
            bundleArtifact: null
        };
    }

    // Resolve dependencies
    const graphResult = resolvePolicyPackDependencyGraph(plan.eligiblePolicyPacks, eligibleEntryPacks);

    if (graphResult.conflicts.length > 0 || graphResult.missingDependencies.length > 0) {
        diagnostics.push('Dependency conflict or missing dependency detected. Bundle build failed.');
        diagnostics.push(...graphResult.resolutionDiagnostics);
        return {
            bundleId,
            bundleHash: '',
            includedPolicyPacks: [],
            dependencyClosure: [],
            snapshotHashes: {},
            buildDiagnostics: diagnostics,
            bundleArtifact: null
        };
    }

    const sortedPacks = [...graphResult.resolvedGraph].sort((a, b) => {
        if (a.policyPackId !== b.policyPackId) {
            return a.policyPackId.localeCompare(b.policyPackId);
        }
        return b.policyPackVersion.localeCompare(a.policyPackVersion); // Semver descending
    });

    const manifest: PolicyPackBundleManifest = {
        bundleId,
        bundleVersion,
        includedPolicyPacks: sortedPacks,
        dependencyClosure: graphResult.dependencyClosure,
        capabilityCompatibilitySnapshot: [...federatedCapabilitiesIntersection].sort(),
        datasetCompatibilitySnapshot: [...datasetSchemas].sort(),
        executionModeCompatibilitySnapshot: executionMode,
        federationCompatibilitySnapshot: [...providerIds].sort(),
        lockfileReferenceHash,
        bundleIntegrityHash: '' // computed next
    };

    const integrityHash = hashJSON({
        bundleId,
        bundleVersion,
        includedPolicyPacks: manifest.includedPolicyPacks,
        dependencyClosure: manifest.dependencyClosure,
        capabilityCompatibilitySnapshot: manifest.capabilityCompatibilitySnapshot,
        datasetCompatibilitySnapshot: manifest.datasetCompatibilitySnapshot,
        executionModeCompatibilitySnapshot: manifest.executionModeCompatibilitySnapshot,
        federationCompatibilitySnapshot: manifest.federationCompatibilitySnapshot
    });

    const finalManifest = { ...manifest, bundleIntegrityHash: integrityHash };

    const artifact: ArchPolicyPackBundleFormat = {
        bundleFormatVersion: '1',
        bundleId,
        bundleCreatedAtExcludedFromHash: new Date().toISOString(),
        bundleManifestHash: hashJSON(finalManifest),
        bundleDependencyGraphHash: hashJSON(finalManifest.dependencyClosure),
        bundleCapabilitySnapshotHash: hashJSON(finalManifest.capabilityCompatibilitySnapshot),
        bundleDatasetCompatibilitySnapshotHash: hashJSON(finalManifest.datasetCompatibilitySnapshot),
        bundleExecutionModeSnapshotHash: hashJSON(finalManifest.executionModeCompatibilitySnapshot),
        bundleSignature: null,
        bundlePayload: Buffer.from(JSON.stringify(finalManifest)).toString('base64')
    };

    diagnostics.push('Bundle built successfully.');

    return {
        bundleId,
        bundleHash: artifact.bundleManifestHash,
        includedPolicyPacks: sortedPacks,
        dependencyClosure: manifest.dependencyClosure,
        snapshotHashes: {
            capability: artifact.bundleCapabilitySnapshotHash,
            dataset: artifact.bundleDatasetCompatibilitySnapshotHash,
            executionMode: artifact.bundleExecutionModeSnapshotHash,
            dependencies: artifact.bundleDependencyGraphHash
        },
        buildDiagnostics: diagnostics,
        bundleArtifact: artifact
    };
}
