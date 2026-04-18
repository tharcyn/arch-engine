export function declareSupportedDatasetSchemas(schemas: string[]): string[] {
    return Array.from(new Set(schemas)).sort();
}

export function declareRequiredDatasetSchemas(schemas: string[]): string[] {
    return Array.from(new Set(schemas)).sort();
}

export function validateDatasetCompatibilityDeclarations(required: string[], supported: string[]): boolean {
    const supSet = new Set(supported);
    for (const r of required) {
        if (!supSet.has(r)) {
            throw new Error(`Required dataset schema ${r} is not in the supported schemas list.`);
        }
    }
    return true;
}
