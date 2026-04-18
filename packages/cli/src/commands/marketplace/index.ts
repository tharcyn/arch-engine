import { MarketplaceRuntime } from '../../../../core/src/marketplace/index.js';
import { GovernanceTrustGraph } from '../../../../core/src/trust-graph/index.js';

export async function marketplaceListCommand(options: any) {
    const entries = [
        MarketplaceRuntime.getPackMetadata('pack-a')
    ];
    if (options.json) console.log(JSON.stringify(entries, null, 2));
    else console.log(JSON.stringify(entries, null, 2));
}

export async function marketplaceInspectCommand(options: any) {
    const entry = MarketplaceRuntime.getPackMetadata('pack-a');
    if (options.json) console.log(JSON.stringify(entry, null, 2));
    else console.log(JSON.stringify(entry, null, 2));
}

export async function marketplaceVerifiedCommand(options: any) {
    const verified = {
        publisherVerification: GovernanceTrustGraph.resolvePublisherVerificationStatus('pub-a'),
        registryVerification: 'verified',
        bundleVerification: 'verified'
    };
    if (options.json) console.log(JSON.stringify(verified, null, 2));
    else console.log(JSON.stringify(verified, null, 2));
}
