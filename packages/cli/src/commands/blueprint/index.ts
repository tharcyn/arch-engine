import { DeploymentBlueprintRuntime } from '../../../../platform-interface/src/blueprints/index.js';

export async function blueprintListCommand(options: any) {
    const result = { status: DeploymentBlueprintRuntime.listBlueprints() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function blueprintInspectCommand(options: any) {
    const result = { status: DeploymentBlueprintRuntime.inspectBlueprint() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function blueprintValidateCommand(options: any) {
    const result = { status: DeploymentBlueprintRuntime.validateBlueprint() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
