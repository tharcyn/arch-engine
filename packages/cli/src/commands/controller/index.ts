import { GovernanceControllerRuntime } from '../../../../controller/src/index.js';

export async function controllerStartCommand(options: any) {
    const result = { status: GovernanceControllerRuntime.startController() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function controllerStatusCommand(options: any) {
    const result = { status: GovernanceControllerRuntime.getStatus() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
