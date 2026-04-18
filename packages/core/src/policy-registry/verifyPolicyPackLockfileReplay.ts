import type { PolicyPackLockfile } from './generatePolicyPackLockfile.js';
import { generatePolicyPackLockfile } from './generatePolicyPackLockfile.js';
import type { PolicyPackDependencyGraphResolutionResult } from './resolvePolicyPackDependencyGraph.js';

export interface LockfileReplayValidationResult {
    readonly replayCompatible: boolean;
    readonly registryDriftDetected: readonly string[];
    readonly capabilityDriftDetected: readonly string[];
    readonly datasetDriftDetected: readonly string[];
    readonly executionModeDriftDetected: readonly string[];
    readonly dependencyDriftDetected: readonly string[];
}

export function verifyPolicyPackLockfileReplay(
    lockfile: PolicyPackLockfile,
    currentGraphResult: PolicyPackDependencyGraphResolutionResult,
    currentFederatedCapabilityIntersection: readonly string[],
    currentDatasetSchemas: readonly string[],
    currentExecutionMode: string,
    currentFederationExecutionHash: string
): LockfileReplayValidationResult {
    
    const registryDriftDetected: string[] = [];
    const capabilityDriftDetected: string[] = [];
    const datasetDriftDetected: string[] = [];
    const executionModeDriftDetected: string[] = [];
    const dependencyDriftDetected: string[] = [];

    // Generate a new ephemeral lockfile to compare hashes
    const currentLockfile = generatePolicyPackLockfile(
        currentGraphResult,
        currentFederatedCapabilityIntersection,
        currentDatasetSchemas,
        currentExecutionMode,
        currentFederationExecutionHash
    );

    if (lockfile.capabilityIntersectionHash !== currentLockfile.capabilityIntersectionHash) {
        capabilityDriftDetected.push(`Capability intersection hash mismatch. Expected: ${lockfile.capabilityIntersectionHash}, Found: ${currentLockfile.capabilityIntersectionHash}`);
    }

    if (lockfile.datasetCompatibilityHash !== currentLockfile.datasetCompatibilityHash) {
        datasetDriftDetected.push(`Dataset compatibility hash mismatch.`);
    }

    if (lockfile.executionModeHash !== currentLockfile.executionModeHash) {
        executionModeDriftDetected.push(`Execution mode hash mismatch.`);
    }

    if (lockfile.federationExecutionHash !== currentLockfile.federationExecutionHash) {
        registryDriftDetected.push(`Federation execution hash mismatch.`);
    }

    // Verify each pack entry
    const lockfilePackMap = new Map(lockfile.policyPacks.map(p => [p.policyPackId, p]));
    const currentPackMap = new Map(currentLockfile.policyPacks.map(p => [p.policyPackId, p]));

    for (const [id, lockedPack] of lockfilePackMap.entries()) {
        const currentPack = currentPackMap.get(id);
        if (!currentPack) {
            dependencyDriftDetected.push(`Missing locked pack in current closure: ${id}@${lockedPack.resolvedVersion}`);
            continue;
        }

        if (lockedPack.resolvedVersion !== currentPack.resolvedVersion) {
            dependencyDriftDetected.push(`Version drift for ${id}: Locked ${lockedPack.resolvedVersion}, Resolved ${currentPack.resolvedVersion}`);
        }

        if (lockedPack.manifestHash !== currentPack.manifestHash) {
            registryDriftDetected.push(`Manifest hash drift for ${id}`);
        }

        if (lockedPack.dependencyHash !== currentPack.dependencyHash) {
            dependencyDriftDetected.push(`Dependency hash drift for ${id}`);
        }
    }

    for (const id of currentPackMap.keys()) {
        if (!lockfilePackMap.has(id)) {
            dependencyDriftDetected.push(`New unresolved pack entered closure: ${id}`);
        }
    }

    const replayCompatible = 
        registryDriftDetected.length === 0 &&
        capabilityDriftDetected.length === 0 &&
        datasetDriftDetected.length === 0 &&
        executionModeDriftDetected.length === 0 &&
        dependencyDriftDetected.length === 0;

    return {
        replayCompatible,
        registryDriftDetected,
        capabilityDriftDetected,
        datasetDriftDetected,
        executionModeDriftDetected,
        dependencyDriftDetected
    };
}
