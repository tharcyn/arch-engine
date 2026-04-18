import { SandboxRuntime } from '../../../../service/src/sandbox/index.js';

export async function sandboxEvaluateCommand(options: any) {
    const result = { status: SandboxRuntime.executePackSandboxed('pack') };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function sandboxSimulateCommand(options: any) {
    const result = { status: SandboxRuntime.simulatePackSandboxed('pack') };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function sandboxSimulateTopologyChangeCommand(options: any) {
    const result = { status: SandboxRuntime.executeSimulationSandboxed('topology-change') };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
