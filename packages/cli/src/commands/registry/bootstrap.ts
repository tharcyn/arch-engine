import { CanonicalRegistryNamespaceRuntime } from '../../../../agp-foundation/src/registry/index.js';

export async function registryBootstrapAgpCommand(options: any) {
    const result = { status: CanonicalRegistryNamespaceRuntime.bootstrapAgpRegistry() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
