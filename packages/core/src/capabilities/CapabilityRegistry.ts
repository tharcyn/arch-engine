export interface CapabilityRegistryIntegrityResult {
    isValid: boolean;
    violations: string[];
}

export function verifyCapabilityRegistryIntegrity(
    registeredCapabilities: string[],
    datasetCapabilities: string[],
    policyPackCapabilities: string[],
    adapterCapabilities: string[]
): CapabilityRegistryIntegrityResult {
    const violations: string[] = [];
    
    // 1. Unique capability identifiers
    const duplicates = registeredCapabilities.filter((item, index) => registeredCapabilities.indexOf(item) !== index);
    if (duplicates.length > 0) {
        violations.push(`Duplicate capability registration detected: ${duplicates.join(', ')}`);
    }
    
    // 2. Stable capability resolution ordering (should be sorted)
    const sorted = [...registeredCapabilities].sort();
    if (JSON.stringify(registeredCapabilities) !== JSON.stringify(sorted)) {
        violations.push('Unstable capability resolution ordering: Registry must be strictly sorted');
    }
    
    // 3. Dataset compatibility alignment
    for (const cap of datasetCapabilities) {
        if (!registeredCapabilities.includes(cap)) {
            violations.push(`Dataset compatibility alignment failure: missing capability '${cap}'`);
        }
    }
    
    // 4. Policy pack compatibility alignment
    for (const cap of policyPackCapabilities) {
        if (!registeredCapabilities.includes(cap)) {
            violations.push(`Policy pack compatibility alignment failure: missing capability '${cap}'`);
        }
    }
    
    // 5. Adapter compatibility alignment
    for (const cap of adapterCapabilities) {
        if (!registeredCapabilities.includes(cap)) {
            violations.push(`Adapter compatibility alignment failure: missing capability '${cap}'`);
        }
    }
    
    return {
        isValid: violations.length === 0,
        violations
    };
}
