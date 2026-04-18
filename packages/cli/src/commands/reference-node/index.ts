import { ReferenceGovernanceNodeRuntime } from '../../../../reference-node/src/index.js';
import { ObserverNodeRuntime } from '../../../../reference-node/src/observer/index.js';
import { AdapterCertificationNodeRuntime } from '../../../../reference-node/src/certifier/index.js';
import { FederationBootstrapNodeRuntime } from '../../../../reference-node/src/federation/index.js';

export async function referenceNodeInspectCommand(options: any) {
    const result = { status: ReferenceGovernanceNodeRuntime.inspectNode() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function referenceNodeCapabilitiesCommand(options: any) {
    const result = { status: ReferenceGovernanceNodeRuntime.inspectCapabilities() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function referenceNodeExportManifestCommand(options: any) {
    const result = { status: ReferenceGovernanceNodeRuntime.exportManifest() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function referenceNodeObserverModeCommand(options: any) {
    const result = { status: ObserverNodeRuntime.initObserverMode() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function referenceNodeCertifyAdapterCommand(options: any) {
    const result = { status: AdapterCertificationNodeRuntime.certifyAdapter() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function referenceNodeBootstrapFederationCommand(options: any) {
    const result = { status: FederationBootstrapNodeRuntime.bootstrapFederation() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
