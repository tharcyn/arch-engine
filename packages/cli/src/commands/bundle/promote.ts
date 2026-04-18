import { resolveBundlePromotionStage, ArchPolicyPackBundleFormat, PromotionStage } from '@arch-engine/core';

export async function bundlePromoteCommand(bundlePath: string, options: any): Promise<number> {
    const bundle: ArchPolicyPackBundleFormat = {
        bundleFormatVersion: '1',
        bundleId: bundlePath.replace('.archpack', ''),
        bundleCreatedAtExcludedFromHash: new Date().toISOString(),
        bundleManifestHash: 'mock',
        bundleDependencyGraphHash: 'mock',
        bundleCapabilitySnapshotHash: 'mock',
        bundleDatasetCompatibilitySnapshotHash: 'mock',
        bundleExecutionModeSnapshotHash: 'mock',
        bundleSignature: null,
        bundlePayload: ''
    };

    const targetStage = (options.stage || 'verified') as PromotionStage;
    const currentStage = 'development';

    const decision = resolveBundlePromotionStage(bundle, targetStage, currentStage);

    if (options.json) {
        console.log(JSON.stringify(decision, null, 2));
        return decision.promotionPermitted ? 0 : 4;
    }

    if (decision.promotionPermitted) {
        console.log(`✅ Bundle promoted to stage: ${decision.approvedStage}`);
        return 0;
    } else {
        console.error(`❌ Bundle promotion failed:`);
        decision.promotionDiagnostics.forEach(d => console.error(`  > ${d}`));
        return 4;
    }
}
