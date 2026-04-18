export function declareRequiredCapabilities(capabilities: string[]): string[] {
    const unique = Array.from(new Set(capabilities)).sort();
    if (unique.length !== capabilities.length) {
        throw new Error('Duplicate capabilities declared');
    }
    return unique;
}

export function declareOptionalCapabilities(capabilities: string[]): string[] {
    const unique = Array.from(new Set(capabilities)).sort();
    if (unique.length !== capabilities.length) {
        throw new Error('Duplicate optional capabilities declared');
    }
    return unique;
}

export function validateCapabilityDeclarations(required: string[], supported: string[]): boolean {
    const reqSet = new Set(required);
    for (const s of supported) {
        if (!reqSet.has(s)) {
            // Note: A pack can support more capabilities than it strictly requires,
            // but for safe bounds checking, we ensure no malformed definitions occur.
        }
    }
    
    // Ensure all required are also in supported
    const supSet = new Set(supported);
    for (const r of required) {
        if (!supSet.has(r)) {
            throw new Error(`Required capability ${r} is not in the supported capabilities list.`);
        }
    }

    return true;
}
