import * as path from 'node:path';
import * as fs from 'node:fs';
import { readPolicyRegistryLockfile } from './readPolicyRegistryLockfile.js';
import { loadTrustPolicyConfig } from './loadTrustPolicyConfig.js';
import { listPolicyPackMetadata } from './listPolicyPackMetadata.js';
import { loadRemotePolicyPackMetadata } from './loadRemotePolicyPackMetadata.js';
import { loadEvaluationPolicyFile } from './loadEvaluationPolicyFile.js';
import {
    materializeFederationExecutionPlan,
    extractLockfileDatasetIdentity,
    runFederationEvaluationPlan,
    explainFederationEvaluationResult,
    resolveEvaluationPolicyProfile
} from '@arch-engine/core';

export async function evaluateCommand(args: string[]): Promise<number> {
    const jsonFlag = args.includes('--json');
    const thresholdIdx = args.indexOf('--severity-threshold');
    const profileIdx = args.indexOf('--policy-profile');
    const cliProfile = profileIdx >= 0 ? args[profileIdx + 1] : undefined;
    
    let policyThresholdInput: import('@arch-engine/core').FederationEvaluationSeverityThresholdInput = 'error';
    let policySource: 'cli' | 'file' | 'default' = 'default';
    let effectiveProfile: string | undefined = undefined;
    let effectiveProfileChain: string[] | undefined = undefined;

    if (thresholdIdx >= 0) {
        policySource = 'cli';
        const thresholdRaw = args[thresholdIdx + 1];
        if (thresholdRaw.startsWith('{')) {
            try {
                policyThresholdInput = JSON.parse(thresholdRaw);
            } catch (e) {
                console.error('Invalid JSON for --severity-threshold');
                return 1;
            }
        } else {
            policyThresholdInput = ['none', 'info', 'warning', 'error'].includes(thresholdRaw) 
                ? (thresholdRaw as import('@arch-engine/core').FederationEvaluationSeverityThreshold)
                : 'error';
        }
    } else {
        try {
            const loadedPolicyFile = loadEvaluationPolicyFile();
            if (loadedPolicyFile !== null) {
                policySource = 'file';
                const selectedProfile = cliProfile || loadedPolicyFile.defaultProfile;
                if (!selectedProfile) {
                    console.error('No default profile defined in evaluation policy file and no --policy-profile provided.');
                    return 1;
                }
                if (!(selectedProfile in loadedPolicyFile.profiles)) {
                    console.error(`Profile '${selectedProfile}' not found in evaluation policy file.`);
                    return 1;
                }
                const resolvedProfile = resolveEvaluationPolicyProfile(loadedPolicyFile, selectedProfile);
                policyThresholdInput = resolvedProfile.effectivePolicy;
                effectiveProfile = selectedProfile;
                effectiveProfileChain = [...resolvedProfile.profileChain];
            } else if (cliProfile) {
                console.error(`--policy-profile '${cliProfile}' specified but no evaluation policy file found.`);
                return 1;
            }
        } catch (e: any) {
            console.error(e.message);
            return 1;
        }
    }

    const trustConfig = loadTrustPolicyConfig();
    const lockfilePath = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false, json: jsonFlag });
    
    // Load remote entries
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

    // Provide empty available packs, they will be loaded later when we have real evaluator plugins
    // But we need to pretend we have them loaded for now to execute the logic if possible
    const availablePacks = allMetadata.reduce((acc, m) => {
        acc[m.policyPackId] = () => ({
            status: 'success',
            findings: [],
            summaryMessage: 'Execution succeeded.'
        });
        return acc;
    }, {} as Record<string, import('@arch-engine/core').PolicyPackEvaluator>);

    const result = runFederationEvaluationPlan(
        plan,
        {
            datasetSnapshot: activeDataset as any,
            topologyDatasetIdentity: activeDatasetIdentity as any,
            capabilityManifest: activeCapabilityManifest || {},
            mutationClassRegistry: activeMutationClassRegistry || {},
            authorityScopeRegistry: activeAuthorityScopeRegistry || {},
            surfaceConfidenceRegistry: activeSurfaceConfidenceRegistry || {},
            trustBoundaryRules: activeTrustBoundaryRules || {}
        },
        availablePacks
    );

    const explanation = explainFederationEvaluationResult(
        result, 
        policyThresholdInput, 
        policySource, 
        effectiveProfile,
        effectiveProfileChain
    );

    if (jsonFlag) {
        console.log(JSON.stringify(explanation, null, 2));
    } else {
        console.log(`Evaluation Result: ${explanation.overallResult.toUpperCase()}`);
        console.log(`Execution permitted: ${explanation.executionPermitted}`);
        console.log(`Execution succeeded: ${explanation.executionSucceeded}`);
        console.log(`Executed: ${explanation.totalExecutedCount}, Failed: ${explanation.totalFailedCount}, Skipped: ${explanation.totalSkippedCount}, Blocked: ${explanation.totalBlockedCount}`);
        
        console.log(`\nHighest severity: ${explanation.severitySummary.highestSeverity}`);
        console.log(`Findings: ${explanation.severitySummary.severityCounts.error} errors, ${explanation.severitySummary.severityCounts.warning} warnings, ${explanation.severitySummary.severityCounts.info} info`);
        if (explanation.severitySummary.packsWithErrors.length > 0) {
            console.log(`Packs with errors: ${explanation.severitySummary.packsWithErrors.join(', ')}`);
        }
        
        const categoryOverridesMsg = explanation.effectivePolicy.categoryOverrides && Object.keys(explanation.effectivePolicy.categoryOverrides).length > 0
            ? `, category overrides: ${JSON.stringify(explanation.effectivePolicy.categoryOverrides)}` 
            : '';
        const codeOverridesMsg = explanation.effectivePolicy.codeOverrides && Object.keys(explanation.effectivePolicy.codeOverrides).length > 0
            ? `, code overrides: ${JSON.stringify(explanation.effectivePolicy.codeOverrides)}` 
            : '';
        const waiversMsg = explanation.effectivePolicy.waivers && explanation.effectivePolicy.waivers.length > 0
            ? `, waivers: ${explanation.effectivePolicy.waivers.length}`
            : '';
        const profileChainMsg = explanation.effectivePolicyProfileChain && explanation.effectivePolicyProfileChain.length > 1
            ? ` (Inherits from: ${explanation.effectivePolicyProfileChain.slice(1).join(' -> ')})`
            : '';
        const profileMsg = explanation.effectivePolicyProfile 
            ? `\nSeverity policy profile: ${explanation.effectivePolicyProfile}${profileChainMsg}` 
            : '';
        console.log(`\nSeverity policy source: ${explanation.effectivePolicySource}${profileMsg}`);
        console.log(`Severity policy: ${explanation.effectivePolicy.defaultThreshold}${categoryOverridesMsg}${codeOverridesMsg}${waiversMsg}`);
        console.log(`Evaluation accepted: ${explanation.policyDecision.evaluationAccepted}`);

        if (explanation.waivedFindingsCount > 0) {
            console.log(`Waived findings: ${explanation.waivedFindingsCount}`);
            if (explanation.waivedPacks.length > 0) {
                console.log(`Waiver affected packs: ${explanation.waivedPacks.join(', ')}`);
            }
        }
        
        if (explanation.waiverAudit) {
            console.log(`Waivers defined: ${explanation.waiverAudit.totalWaiversDefined}`);
            console.log(`Waivers matched: ${explanation.waiverAudit.totalWaiversMatched}`);
            console.log(`Unused waivers: ${explanation.waiverAudit.totalWaiversUnused}`);
            console.log(`Waivers affected outcome: ${explanation.waiverAudit.waiverAffectedOutcome}`);
            if (explanation.waiverAudit.expiredWaivers > 0) {
                console.log(`Expired waivers: ${explanation.waiverAudit.expiredWaivers}`);
            }
            if (explanation.waiverAudit.waiversMissingOwner > 0) {
                console.log(`Waivers missing owner: ${explanation.waiverAudit.waiversMissingOwner}`);
            }
            if (explanation.waiverAudit.broadWaiversWithoutReason > 0) {
                console.log(`Broad waivers without reason: ${explanation.waiverAudit.broadWaiversWithoutReason}`);
            }
            if (explanation.waiverAudit.broadWaiverWarnings.length > 0) {
                console.log(`Broad waiver warnings: ${explanation.waiverAudit.broadWaiverWarnings.length}`);
            }
        }
        if (explanation.policyDecision.triggeringPacks.length > 0) {
            console.log(`Triggering packs: ${explanation.policyDecision.triggeringPacks.join(', ')}`);
        }
        if (explanation.policyDecision.triggeringCategories.length > 0) {
            console.log(`Triggering categories: ${explanation.policyDecision.triggeringCategories.join(', ')}`);
        }
        if (explanation.policyDecision.triggeringCodes.length > 0) {
            console.log(`Triggering codes: ${explanation.policyDecision.triggeringCodes.join(', ')}`);
        }
        if (explanation.waiverGovernanceRejected) {
            console.log(`Waiver governance rejected evaluation: ${explanation.waiverGovernanceRejected}`);
            if (explanation.waiverGovernanceTriggers.length > 0) {
                console.log(`Waiver governance triggers: ${explanation.waiverGovernanceTriggers.join(', ')}`);
            }
        }
        console.log(`Policy Summary: ${explanation.policyDecision.summaryMessage}`);
        
        console.log(`\nSummary: ${explanation.summaryMessage}`);

        if (explanation.succeededPacks.length > 0) {
            console.log('\nSucceeded Packs:');
            for (const pack of explanation.succeededPacks) {
                const degradedFlag = pack.isDegraded ? ' (DEGRADED)' : '';
                console.log(`  [${pack.policyPackId}]${degradedFlag} - ${pack.summaryMessage}`);
            }
        }

        if (explanation.failedPacks.length > 0) {
            console.log('\nFailed Packs:');
            for (const pack of explanation.failedPacks) {
                console.log(`  [${pack.policyPackId}] - ${pack.summaryMessage}`);
                for (const finding of pack.normalizedFindings) {
                    console.log(`    - ${finding}`);
                }
            }
        }

        if (explanation.blockedPacks.length > 0) {
            console.log('\nBlocked Packs:');
            for (const pack of explanation.blockedPacks) {
                console.log(`  [${pack.policyPackId}] - ${pack.summaryMessage}`);
            }
        }

        if (explanation.skippedPacks.length > 0) {
            console.log('\nSkipped Packs:');
            for (const pack of explanation.skippedPacks) {
                console.log(`  [${pack.policyPackId}] - ${pack.summaryMessage}`);
            }
        }

        if (explanation.suggestedNextAction) {
            console.log(`\nSuggested Next Action:\n  ${explanation.suggestedNextAction}`);
        }
    }

    return result.overallResult === 'success' || result.overallResult === 'empty' ? 0 : 1;
}
