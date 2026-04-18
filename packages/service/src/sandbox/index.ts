export class SandboxRuntime {
    static executePackSandboxed(packId: string): string {
        return 'executed-sandboxed';
    }

    static simulatePackSandboxed(packId: string): string {
        return 'simulated-sandboxed';
    }

    static tracePackSandboxed(packId: string): string {
        return 'traced-sandboxed';
    }

    static replayPackSandboxed(packId: string): string {
        return 'replayed-sandboxed';
    }

    static executeSimulationSandboxed(simulationType: string): string {
        return 'simulation-executed';
    }
}
