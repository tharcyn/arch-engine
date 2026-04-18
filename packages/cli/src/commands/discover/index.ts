import { PolicyPackDiscoveryIndex } from '../../../../discovery/src/policy-packs/index.js';
import { DatasetProducerCatalog } from '../../../../discovery/src/datasets/index.js';
import { BundlePromotionChannelIndex } from '../../../../discovery/src/bundles/index.js';

export async function discoverPacksCommand(options: any) {
    const result = { status: PolicyPackDiscoveryIndex.discoverPacks() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function discoverDatasetsCommand(options: any) {
    const result = { status: DatasetProducerCatalog.discoverDatasets() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function discoverBundlesCommand(options: any) {
    const result = { status: BundlePromotionChannelIndex.discoverBundles() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
