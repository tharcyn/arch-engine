import { AGPStewardshipRuntime } from '../../../../agp-foundation/src/index.js';
import { WorkingGroupBootstrapRuntime } from '../../../../agp-foundation/src/working-groups/index.js';
import { ExtensionGovernanceRuntime } from '../../../../agp-foundation/src/extensions/index.js';
import { RegistryAuthorityBootstrapRuntime } from '../../../../agp-foundation/src/registry-authority/index.js';
import { SpecificationLifecycleRuntime } from '../../../../agp-foundation/src/spec-lifecycle/index.js';

export async function foundationInspectCommand(options: any) {
    const result = { status: AGPStewardshipRuntime.inspectFoundation() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function foundationGovernanceModelCommand(options: any) {
    const result = { status: AGPStewardshipRuntime.getGovernanceModel() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function foundationWorkingGroupsCommand(options: any) {
    const result = { status: WorkingGroupBootstrapRuntime.listWorkingGroups() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function foundationExtensionProposeCommand(options: any) {
    const result = { status: ExtensionGovernanceRuntime.proposeExtension() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function foundationExtensionStatusCommand(options: any) {
    const result = { status: ExtensionGovernanceRuntime.extensionStatus() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function foundationRegistryBootstrapCommand(options: any) {
    const result = { status: RegistryAuthorityBootstrapRuntime.bootstrapRegistry() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function foundationSpecLifecycleCommand(options: any) {
    const result = { status: SpecificationLifecycleRuntime.getSpecLifecycle() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
