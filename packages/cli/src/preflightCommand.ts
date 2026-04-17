import * as path from 'node:path';
import * as fs from 'node:fs';
import { readPolicyRegistryLockfile } from './readPolicyRegistryLockfile.js';
import { loadTrustPolicyConfig } from './loadTrustPolicyConfig.js';
import { listPolicyPackMetadata } from './listPolicyPackMetadata.js';
import { loadRemotePolicyPackMetadata } from './loadRemotePolicyPackMetadata.js';
import { assessFederationExecutionPreflight, extractLockfileDatasetIdentity } from '@arch-engine/core';

export async function preflightCommand(args: string[]): Promise<number> {
    const jsonFlag = args.includes('--json');
    const trustConfig = loadTrustPolicyConfig();
    const lockfilePath = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false, json: jsonFlag });
    
    // Load remote entries purely to test freshness (options are permissive here because we want to see live state)
    const remoteResult = await loadRemotePolicyPackMetadata({ useLockfile: false, verifyLockfileSignature: false, json: jsonFlag });
    const allMetadata = await listPolicyPackMetadata({ useLockfile: false, verifyLockfileSignature: false, json: jsonFlag });
    
    let activeDatasetIdentity = undefined;
    let activeCapabilityManifest = undefined;
    let activeMutationClassRegistry = undefined;
    let activeAuthorityScopeRegistry = undefined;
    let activeSurfaceConfidenceRegistry = undefined;
    let activeTrustBoundaryRules = undefined;
    let activeDataset = undefined;

    const datasetPath = path.resolve(process.cwd(), 'topology-export.json');
    if (fs.existsSync(datasetPath)) {
        try {
            const ds = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
            if (ds.topology_dataset_identity) {
                const extracted = extractLockfileDatasetIdentity(ds);
                activeDatasetIdentity = extracted.identity;
                activeCapabilityManifest = extracted.capabilityManifest;
                activeMutationClassRegistry = extracted.mutationClassRegistry;
                activeAuthorityScopeRegistry = extracted.authorityScopeRegistry;
                activeSurfaceConfidenceRegistry = extracted.surfaceConfidenceRegistry;
                activeTrustBoundaryRules = extracted.trustBoundaryRules;
                activeDataset = ds;
            }
        } catch {}
    }

    const preflight = assessFederationExecutionPreflight(
        trustConfig,
        lockfilePath,
        lockfile,
        remoteResult.lockEntries,
        activeDatasetIdentity,
        activeCapabilityManifest,
        activeMutationClassRegistry,
        activeAuthorityScopeRegistry,
        activeSurfaceConfidenceRegistry,
        activeTrustBoundaryRules,
        activeDataset,
        allMetadata
    );

    if (jsonFlag) {
        console.log(JSON.stringify(preflight, null, 2));
    } else {
        console.log(preflight.summaryMessage);

        if (!preflight.allowed && preflight.primaryBlockReason) {
            console.log(`\nPrimary Block Reason: ${preflight.primaryBlockReason}`);
        }

        if (preflight.contributingFindings.length > 0) {
            console.log('\nContributing Findings:');
            for (const f of preflight.contributingFindings) {
                console.log(`  - ${f}`);
            }
        }

        const executionCompat = preflight.underlyingReadinessDiagnostic.policyPackExecutionCompatibility;
        if (executionCompat && executionCompat.overallStatus !== 'compatible') {
            let hasPackIncompatibilities = false;
            for (const packResult of executionCompat.packResults) {
                if (packResult.executionStatus !== 'compatible') {
                    if (!hasPackIncompatibilities) {
                        console.log(`\nPack-Level Incompatibilities:`);
                        hasPackIncompatibilities = true;
                    }
                    console.log(`  [${packResult.policyPackId}]: ${packResult.executionStatus}`);
                }
            }
        }

        if (preflight.suggestedNextAction) {
            console.log(`\nSuggested Next Action:\n  ${preflight.suggestedNextAction}`);
        }
    }

    return preflight.allowed ? 0 : 1;
}
