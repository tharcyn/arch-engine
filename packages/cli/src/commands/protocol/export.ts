import { ProtocolSpecExtractionRuntime } from '../../../../agp-spec/src/extraction/index.js';
import { SpecRepositoryBootstrapRuntime } from '../../../../agp-spec/src/bootstrap/index.js';

export async function protocolExportAgpRepoCommand(options: any) {
    const result = { status: ProtocolSpecExtractionRuntime.exportAgpRepo() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function protocolBootstrapAgpRepoCommand(options: any) {
    const result = { status: SpecRepositoryBootstrapRuntime.bootstrapAgpRepo() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function protocolAuthorityDescriptorCommand(options: any) {
    const result = { status: "authority-descriptor-inspected" };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function protocolTrustRootCommand(options: any) {
    const result = { status: "trust-root-inspected" };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
