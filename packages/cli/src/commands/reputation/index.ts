import { ReputationEngine } from '../../../../core/src/reputation/index.js';

export async function trustScorePackCommand(options: any) {
    const score = { policyPackQualityScore: ReputationEngine.computePolicyPackQualityScore('pack-a') };
    if (options.json) console.log(JSON.stringify(score, null, 2));
    else console.log(JSON.stringify(score, null, 2));
}

export async function trustScoreBundleCommand(options: any) {
    const score = { bundleReliabilityScore: ReputationEngine.computeBundleReliabilityScore('bundle-a') };
    if (options.json) console.log(JSON.stringify(score, null, 2));
    else console.log(JSON.stringify(score, null, 2));
}

export async function trustScoreRegistryCommand(options: any) {
    const score = { registryCredibilityScore: ReputationEngine.computeRegistryCredibilityScore('registry-a') };
    if (options.json) console.log(JSON.stringify(score, null, 2));
    else console.log(JSON.stringify(score, null, 2));
}

export async function trustScorePublisherCommand(options: any) {
    const score = { publisherTrustScore: ReputationEngine.computePublisherTrustScore('publisher-a') };
    if (options.json) console.log(JSON.stringify(score, null, 2));
    else console.log(JSON.stringify(score, null, 2));
}
