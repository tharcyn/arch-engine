import { PolicyAppRuntime } from '../../../../policy-apps/src/index.js';

export async function appInstallCommand(options: any) {
    const result = { status: PolicyAppRuntime.installApp() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function appRunCommand(options: any) {
    const result = { status: PolicyAppRuntime.runApp() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function appInspectCommand(options: any) {
    const result = { status: PolicyAppRuntime.inspectApp() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
