import { createHash } from 'crypto';
import type { ArchPolicyPackBundleFormat } from './ArchPolicyPackBundleFormat.js';
import type { PolicyPackBundleManifest } from './PolicyPackBundleManifest.js';
import { verifyPolicyPackBundleSignature } from './verifyPolicyPackBundleSignature.js';

export interface PolicyPackBundleLoadResult {
    readonly bundleValid: boolean;
    readonly bundleManifest: PolicyPackBundleManifest | null;
    readonly bundleCompatibilityVerified: boolean;
    readonly bundleDiagnostics: readonly string[];
}

function hashJSON(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export function loadPolicyPackBundle(
    bundle: ArchPolicyPackBundleFormat,
    currentCapabilities: readonly string[],
    currentDatasetSchemas: readonly string[],
    currentExecutionMode: 'single-provider' | 'multi-provider-federated',
    signatureRequirement: 'required' | 'optional' | 'none'
): PolicyPackBundleLoadResult {
    const diagnostics: string[] = [];

    if (bundle.bundleFormatVersion !== '1') {
        diagnostics.push(`Unsupported bundle format version: ${bundle.bundleFormatVersion}`);
        return {
            bundleValid: false,
            bundleManifest: null,
            bundleCompatibilityVerified: false,
            bundleDiagnostics: diagnostics
        };
    }

    // Verify signature
    const sigResult = verifyPolicyPackBundleSignature(bundle, signatureRequirement);
    if (!sigResult.signatureValid) {
        diagnostics.push(...sigResult.verificationDiagnostics);
        return {
            bundleValid: false,
            bundleManifest: null,
            bundleCompatibilityVerified: false,
            bundleDiagnostics: diagnostics
        };
    }

    // Decode payload
    let manifest: PolicyPackBundleManifest;
    try {
        const payloadStr = Buffer.from(bundle.bundlePayload, 'base64').toString('utf-8');
        manifest = JSON.parse(payloadStr);
    } catch (e) {
        diagnostics.push('Failed to parse bundle payload.');
        return {
            bundleValid: false,
            bundleManifest: null,
            bundleCompatibilityVerified: false,
            bundleDiagnostics: diagnostics
        };
    }

    // Verify manifest hashes
    if (hashJSON(manifest) !== bundle.bundleManifestHash) {
        diagnostics.push('Bundle manifest hash mismatch. Payload tampered.');
        return {
            bundleValid: false,
            bundleManifest: manifest,
            bundleCompatibilityVerified: false,
            bundleDiagnostics: diagnostics
        };
    }

    if (hashJSON(manifest.dependencyClosure) !== bundle.bundleDependencyGraphHash) {
        diagnostics.push('Bundle dependency graph hash mismatch.');
        return {
            bundleValid: false,
            bundleManifest: manifest,
            bundleCompatibilityVerified: false,
            bundleDiagnostics: diagnostics
        };
    }

    // Check capability and compatibility mismatch
    const currentCapHash = hashJSON([...currentCapabilities].sort());
    const currentDatasetHash = hashJSON([...currentDatasetSchemas].sort());
    const currentModeHash = hashJSON(currentExecutionMode);

    let compatibilityVerified = true;

    if (currentCapHash !== bundle.bundleCapabilitySnapshotHash) {
        diagnostics.push('Execution capability mismatch with bundle snapshot.');
        compatibilityVerified = false;
    }

    if (currentDatasetHash !== bundle.bundleDatasetCompatibilitySnapshotHash) {
        diagnostics.push('Execution dataset schema mismatch with bundle snapshot.');
        compatibilityVerified = false;
    }

    if (currentModeHash !== bundle.bundleExecutionModeSnapshotHash) {
        diagnostics.push('Execution mode mismatch with bundle snapshot.');
        compatibilityVerified = false;
    }

    if (compatibilityVerified) {
        diagnostics.push('Bundle loaded and compatibility verified successfully.');
    }

    return {
        bundleValid: true,
        bundleManifest: manifest,
        bundleCompatibilityVerified: compatibilityVerified,
        bundleDiagnostics: diagnostics
    };
}
