import { ArchitectureGovernanceProtocolSpecificationRuntime } from '../../../../agp-spec/src/index.js';
import { ProtocolExtensionRegistry } from '../../../../agp-spec/src/extensions/index.js';

export async function protocolInspectCommand(options: any) {
    const result = { status: ArchitectureGovernanceProtocolSpecificationRuntime.inspectProtocol() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function protocolCompatibilityCommand(options: any) {
    const result = { status: ArchitectureGovernanceProtocolSpecificationRuntime.checkCompatibility() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function protocolExtensionsCommand(options: any) {
    const result = { status: ProtocolExtensionRegistry.listExtensions() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
