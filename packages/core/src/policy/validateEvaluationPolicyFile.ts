import type { FederationEvaluationGatePolicy, FederationEvaluationSeverityThreshold, FederationEvaluationWaiver } from './assessFederationEvaluationPolicyGate.js';
import type { PolicyPackFindingCategory } from './PolicyPackFinding.js';

export interface FederationEvaluationPolicyFile {
    readonly defaultProfile?: string;
    readonly profiles: Readonly<Record<string, FederationEvaluationGatePolicy>>;
}

function validateGatePolicy(data: unknown): FederationEvaluationGatePolicy {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Gate policy must be an object.');
    }

    const obj = data as Record<string, unknown>;
    
    const validThresholds: FederationEvaluationSeverityThreshold[] = ['none', 'info', 'warning', 'error'];
    const validCategories: PolicyPackFindingCategory[] = ['trust', 'compatibility', 'governance', 'execution', 'advisory', 'policy-pack'];

    if (!obj.defaultThreshold || typeof obj.defaultThreshold !== 'string') {
        throw new Error('Gate policy must specify a defaultThreshold.');
    }

    if (!validThresholds.includes(obj.defaultThreshold as FederationEvaluationSeverityThreshold)) {
        throw new Error(`Invalid defaultThreshold: ${obj.defaultThreshold}. Must be one of: ${validThresholds.join(', ')}.`);
    }

    const defaultThreshold = obj.defaultThreshold as FederationEvaluationSeverityThreshold;
    const categoryOverrides: Partial<Record<PolicyPackFindingCategory, FederationEvaluationSeverityThreshold>> = {};

    if (obj.categoryOverrides !== undefined) {
        if (typeof obj.categoryOverrides !== 'object' || obj.categoryOverrides === null) {
            throw new Error('categoryOverrides must be an object.');
        }

        const overridesObj = obj.categoryOverrides as Record<string, unknown>;
        for (const [key, value] of Object.entries(overridesObj)) {
            if (!validCategories.includes(key as PolicyPackFindingCategory)) {
                throw new Error(`Unknown category override key: ${key}. Must be one of: ${validCategories.join(', ')}.`);
            }

            if (typeof value !== 'string' || !validThresholds.includes(value as FederationEvaluationSeverityThreshold)) {
                throw new Error(`Invalid threshold value for category ${key}: ${value}. Must be one of: ${validThresholds.join(', ')}.`);
            }

            categoryOverrides[key as PolicyPackFindingCategory] = value as FederationEvaluationSeverityThreshold;
        }
    }

    const codeOverrides: Record<string, FederationEvaluationSeverityThreshold> = {};

    if (obj.codeOverrides !== undefined) {
        if (typeof obj.codeOverrides !== 'object' || obj.codeOverrides === null) {
            throw new Error('codeOverrides must be an object.');
        }

        const overridesObj = obj.codeOverrides as Record<string, unknown>;
        for (const [key, value] of Object.entries(overridesObj)) {
            if (typeof key !== 'string' || key.trim() === '') {
                throw new Error(`Invalid code override key: ${key}.`);
            }

            if (typeof value !== 'string' || !validThresholds.includes(value as FederationEvaluationSeverityThreshold)) {
                throw new Error(`Invalid threshold value for code ${key}: ${value}. Must be one of: ${validThresholds.join(', ')}.`);
            }

            codeOverrides[key.trim()] = value as FederationEvaluationSeverityThreshold;
        }
    }

    let extendsProfile: string | undefined = undefined;
    if (obj.extends !== undefined) {
        if (typeof obj.extends !== 'string') {
            throw new Error('extends must be a string.');
        }
        extendsProfile = obj.extends.trim();
    }

    const waivers: FederationEvaluationWaiver[] = [];
    if (obj.waivers !== undefined) {
        if (!Array.isArray(obj.waivers)) {
            throw new Error('waivers must be an array.');
        }

        for (const [index, wObj] of obj.waivers.entries()) {
            if (typeof wObj !== 'object' || wObj === null) {
                throw new Error(`waiver at index ${index} must be an object.`);
            }

            const w = wObj as Record<string, unknown>;
            if (!w.code && !w.category && !w.packName) {
                throw new Error(`waiver at index ${index} must specify at least one of: code, category, packName.`);
            }

            for (const key of Object.keys(w)) {
                if (
                    key !== 'code' && 
                    key !== 'category' && 
                    key !== 'packName' &&
                    key !== 'reason' &&
                    key !== 'owner' &&
                    key !== 'ticket' &&
                    key !== 'validUntil'
                ) {
                    throw new Error(`Unknown waiver key: ${key} at index ${index}.`);
                }
            }

            if (w.code !== undefined && (typeof w.code !== 'string' || w.code.trim() === '')) {
                throw new Error(`Invalid code in waiver at index ${index}.`);
            }

            if (w.category !== undefined && (typeof w.category !== 'string' || !validCategories.includes(w.category as PolicyPackFindingCategory))) {
                throw new Error(`Invalid category in waiver at index ${index}. Must be one of: ${validCategories.join(', ')}.`);
            }

            if (w.packName !== undefined && (typeof w.packName !== 'string' || w.packName.trim() === '')) {
                throw new Error(`Invalid packName in waiver at index ${index}.`);
            }

            if (w.reason !== undefined && (typeof w.reason !== 'string' || w.reason.trim() === '')) {
                throw new Error(`Invalid reason in waiver at index ${index}.`);
            }

            if (w.owner !== undefined && (typeof w.owner !== 'string' || w.owner.trim() === '')) {
                throw new Error(`Invalid owner in waiver at index ${index}.`);
            }

            if (w.ticket !== undefined && (typeof w.ticket !== 'string' || w.ticket.trim() === '')) {
                throw new Error(`Invalid ticket in waiver at index ${index}.`);
            }

            if (w.validUntil !== undefined) {
                if (typeof w.validUntil !== 'string' || w.validUntil.trim() === '') {
                    throw new Error(`Invalid validUntil in waiver at index ${index}.`);
                }
                const date = new Date(w.validUntil as string);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid validUntil date format in waiver at index ${index}.`);
                }
            }

            waivers.push({
                ...(w.code ? { code: (w.code as string).trim() } : {}),
                ...(w.category ? { category: w.category as PolicyPackFindingCategory } : {}),
                ...(w.packName ? { packName: (w.packName as string).trim() } : {}),
                ...(w.reason ? { reason: (w.reason as string).trim() } : {}),
                ...(w.owner ? { owner: (w.owner as string).trim() } : {}),
                ...(w.ticket ? { ticket: (w.ticket as string).trim() } : {}),
                ...(w.validUntil ? { validUntil: (w.validUntil as string).trim() } : {})
            });
        }
    }

    if (obj.rejectExpiredWaivers !== undefined && typeof obj.rejectExpiredWaivers !== 'boolean') {
        throw new Error('rejectExpiredWaivers must be a boolean.');
    }
    if (obj.rejectOutcomeAffectingWaiversWithoutOwner !== undefined && typeof obj.rejectOutcomeAffectingWaiversWithoutOwner !== 'boolean') {
        throw new Error('rejectOutcomeAffectingWaiversWithoutOwner must be a boolean.');
    }
    if (obj.rejectOutcomeAffectingWaiversWithoutTicket !== undefined && typeof obj.rejectOutcomeAffectingWaiversWithoutTicket !== 'boolean') {
        throw new Error('rejectOutcomeAffectingWaiversWithoutTicket must be a boolean.');
    }
    if (obj.rejectBroadWaiversWithoutReason !== undefined && typeof obj.rejectBroadWaiversWithoutReason !== 'boolean') {
        throw new Error('rejectBroadWaiversWithoutReason must be a boolean.');
    }

    return {
        defaultThreshold,
        ...(extendsProfile ? { extends: extendsProfile } : {}),
        ...(Object.keys(categoryOverrides).length > 0 ? { categoryOverrides } : {}),
        ...(Object.keys(codeOverrides).length > 0 ? { codeOverrides } : {}),
        ...(waivers.length > 0 ? { waivers } : {}),
        ...(obj.rejectExpiredWaivers !== undefined ? { rejectExpiredWaivers: obj.rejectExpiredWaivers as boolean } : {}),
        ...(obj.rejectOutcomeAffectingWaiversWithoutOwner !== undefined ? { rejectOutcomeAffectingWaiversWithoutOwner: obj.rejectOutcomeAffectingWaiversWithoutOwner as boolean } : {}),
        ...(obj.rejectOutcomeAffectingWaiversWithoutTicket !== undefined ? { rejectOutcomeAffectingWaiversWithoutTicket: obj.rejectOutcomeAffectingWaiversWithoutTicket as boolean } : {}),
        ...(obj.rejectBroadWaiversWithoutReason !== undefined ? { rejectBroadWaiversWithoutReason: obj.rejectBroadWaiversWithoutReason as boolean } : {})
    };
}

export function validateEvaluationPolicyFile(data: unknown): FederationEvaluationPolicyFile {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Evaluation policy file must be an object.');
    }

    const obj = data as Record<string, unknown>;

    // Handle profile-based format
    if (obj.profiles !== undefined) {
        if (typeof obj.profiles !== 'object' || obj.profiles === null) {
            throw new Error('profiles must be an object.');
        }

        const profilesObj = obj.profiles as Record<string, unknown>;
        const parsedProfiles: Record<string, FederationEvaluationGatePolicy> = {};

        for (const [key, value] of Object.entries(profilesObj)) {
            if (typeof key !== 'string' || key.trim() === '') {
                throw new Error(`Invalid profile name: ${key}.`);
            }
            try {
                parsedProfiles[key.trim()] = validateGatePolicy(value);
            } catch (e: any) {
                throw new Error(`Invalid profile '${key}': ${e.message}`);
            }
        }

        let defaultProfile: string | undefined = undefined;
        if (obj.defaultProfile !== undefined) {
            if (typeof obj.defaultProfile !== 'string') {
                throw new Error('defaultProfile must be a string.');
            }
            defaultProfile = obj.defaultProfile.trim();
            if (!(defaultProfile in parsedProfiles)) {
                throw new Error(`defaultProfile '${defaultProfile}' does not exist in profiles.`);
            }
        }

        // Validate extends references and check for cycles
        for (const [key, profile] of Object.entries(parsedProfiles)) {
            if (profile.extends) {
                if (!(profile.extends in parsedProfiles)) {
                    throw new Error(`Profile '${key}' extends unknown profile '${profile.extends}'.`);
                }
                
                // Cycle detection
                const visited = new Set<string>();
                let current: string | undefined = key;
                while (current) {
                    if (visited.has(current)) {
                        throw new Error(`Cycle detected in profile inheritance for '${key}'.`);
                    }
                    visited.add(current);
                    current = parsedProfiles[current].extends;
                }
            }
        }

        return {
            ...(defaultProfile ? { defaultProfile } : {}),
            profiles: parsedProfiles
        };
    }

    // Handle legacy single-policy format
    const legacyPolicy = validateGatePolicy(data);
    return {
        defaultProfile: 'default',
        profiles: {
            'default': legacyPolicy
        }
    };
}
