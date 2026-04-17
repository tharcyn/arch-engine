import type { PolicyPackFindingCategory } from './PolicyPackFinding.js';

export const RESERVED_CORE_CODE_PREFIX = 'ARCH_';
export const UNKNOWN_CODE = 'UNKNOWN';
export const MALFORMED_CODE = 'MALFORMED';

export interface ValidatedFindingCodeResult {
    readonly code: string;
    readonly taxonomyRepaired: boolean;
}

export function validateOrNormalizePolicyPackFindingCode(
    code: string | undefined,
    category: PolicyPackFindingCategory
): ValidatedFindingCodeResult {
    if (!code || code.trim() === '') {
        return { code: UNKNOWN_CODE, taxonomyRepaired: code !== UNKNOWN_CODE };
    }

    const trimmed = code.trim();
    // Normalize code by making it uppercase and replacing non-alphanumeric chars with underscores
    const normalizedCode = trimmed.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    let finalCode = normalizedCode;
    let taxonomyRepaired = trimmed !== finalCode;

    if (finalCode === '') {
        finalCode = MALFORMED_CODE;
        taxonomyRepaired = true;
    } else {
        const isCoreCategory = category !== 'policy-pack';
        if (!isCoreCategory && finalCode.startsWith(RESERVED_CORE_CODE_PREFIX)) {
            // A custom pack-local finding is illegally using a core prefix.
            finalCode = `INVALID_PREFIX_${finalCode}`;
            taxonomyRepaired = true;
        }
    }

    return { code: finalCode, taxonomyRepaired };
}
