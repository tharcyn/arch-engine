export type ExecutionMode = 'single-provider' | 'multi-provider' | 'federated' | 'offline' | 'bundle-only';

export function declareSupportedExecutionModes(modes: ExecutionMode[]): string[] {
    return Array.from(new Set(modes)).sort();
}

export function validateExecutionModeCompatibility(modes: string[]): boolean {
    const validModes = new Set(['single-provider', 'multi-provider', 'federated', 'offline', 'bundle-only']);
    for (const mode of modes) {
        if (!validModes.has(mode)) {
            throw new Error(`Invalid execution mode declared: ${mode}`);
        }
    }
    return true;
}
