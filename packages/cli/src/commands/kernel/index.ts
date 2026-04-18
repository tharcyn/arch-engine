import { ExecutionKernelRuntime } from '../../../../kernel/src/index.js';
import { KernelStabilityContractRuntime } from '../../../../kernel/src/stability/index.js';

export async function kernelInspectCommand(options: any) {
    const result = { status: ExecutionKernelRuntime.inspectKernel() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function kernelCompatibilityCommand(options: any) {
    const result = { status: ExecutionKernelRuntime.resolveCompatibility() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function kernelFreezeSurfaceCommand(options: any) {
    const result = { status: KernelStabilityContractRuntime.freezeSurface() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
