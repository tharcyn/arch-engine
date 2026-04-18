export class ExecutionKernelRuntime {
    static inspectKernel(): string { return 'kernel-inspected'; }
    static resolveCompatibility(): string { return 'compatibility-resolved'; }
}

export class ExecutionKernelDescriptor {}
export class KernelCompatibilitySurface {}
export class KernelVersionResolver {}
export class KernelCapabilityMatrix {}
