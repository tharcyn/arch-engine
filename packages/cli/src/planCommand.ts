import * as path from 'node:path';
import * as fs from 'node:fs';
import { readPolicyRegistryLockfile } from './readPolicyRegistryLockfile.js';
import { loadTrustPolicyConfig } from './loadTrustPolicyConfig.js';
import { listPolicyPackMetadata } from './listPolicyPackMetadata.js';
import { loadRemotePolicyPackMetadata } from './loadRemotePolicyPackMetadata.js';
import { materializeFederationExecutionPlan, extractLockfileDatasetIdentity } from '@arch-engine/core';

export async function planCommand(args: string[]): Promise<number> {
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

    const plan = materializeFederationExecutionPlan(
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
        console.log(JSON.stringify(plan, null, 2));
    } else {
        console.log(`Execution Plan: ${plan.overallPlanStatus.toUpperCase()}`);
        console.log(`Allowed: ${plan.allowed ? 'YES' : 'NO'}`);
        console.log(`Packs: ${plan.runnablePolicyPacks} runnable, ${plan.degradedPolicyPacks} degraded, ${plan.blockedPolicyPacks} blocked`);
        
        if (plan.packResults.length > 0) {
            console.log('\nPack Execution Details:');
            for (const pack of plan.packResults) {
                console.log(`  [${pack.policyPackId}] -> ${pack.executionStatus.toUpperCase()} (${pack.compatibilitySummary})`);
                if (pack.humanReadableReason) {
                    console.log(`    Reason: ${pack.humanReadableReason}`);
                }
                if (pack.blockingFindings.length > 0) {
                    for (const finding of pack.blockingFindings) {
                        console.log(`    - ${finding}`);
                    }
                }
            }
        }

        if (plan.suggestedNextAction) {
            console.log(`\nSuggested Next Action:\n  ${plan.suggestedNextAction}`);
        }
    }

    return plan.allowed ? 0 : 1;
}
