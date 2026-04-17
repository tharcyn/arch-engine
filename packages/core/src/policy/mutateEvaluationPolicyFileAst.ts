import type { FederationEvaluationPolicyFile } from './validateEvaluationPolicyFile.js';
import type { FederationEvaluationPolicyPatchArtifact } from './generateEvaluationPolicyPatchArtifact.js';

export interface FederationEvaluationPolicyAstMutationResult {
    readonly mutationApplied: boolean;
    readonly changedPaths: string[];
    readonly updatedFileText: string;
    readonly refusalReason?: string;
    readonly summaryMessage: string;
}

interface Block {
    start: number;
    end: number;
    keyStart: number;
}

export function scanBalancedObjectBlock(text: string, startIndex: number): { blockStart: number; blockEnd: number; success: boolean } {
    let state: 'NORMAL' | 'STRING' | 'LINE_COMMENT' | 'BLOCK_COMMENT' | 'ESCAPED_CHAR' = 'NORMAL';
    let blockStart = -1;
    let blockDepth = 0;
    const length = text.length;

    let i = startIndex;
    while (i < length) {
        if (text[i] === '{' || text[i] === '[') {
            blockStart = i;
            break;
        }
        if (!/\s/.test(text[i])) {
            break; // hit some non-whitespace char that isn't { or [
        }
        i++;
    }

    if (blockStart === -1) {
        return { blockStart: -1, blockEnd: -1, success: false };
    }

    const openChar = text[blockStart];
    const closeChar = openChar === '{' ? '}' : ']';

    for (i = blockStart; i < length; i++) {
        const char = text[i];
        const nextChar = i + 1 < length ? text[i + 1] : '';

        if (state === 'ESCAPED_CHAR') {
            state = 'STRING';
            continue;
        }

        if (state === 'STRING') {
            if (char === '\\') {
                state = 'ESCAPED_CHAR';
            } else if (char === '"') {
                state = 'NORMAL';
            }
            continue;
        }

        if (state === 'LINE_COMMENT') {
            if (char === '\n') {
                state = 'NORMAL';
            }
            continue;
        }

        if (state === 'BLOCK_COMMENT') {
            if (char === '*' && nextChar === '/') {
                state = 'NORMAL';
                i++;
            }
            continue;
        }

        if (state === 'NORMAL') {
            if (char === '"') {
                state = 'STRING';
            } else if (char === '/' && nextChar === '/') {
                state = 'LINE_COMMENT';
                i++;
            } else if (char === '/' && nextChar === '*') {
                state = 'BLOCK_COMMENT';
                i++;
            } else if (char === openChar) {
                blockDepth++;
            } else if (char === closeChar) {
                blockDepth--;
                if (blockDepth === 0) {
                    return { blockStart, blockEnd: i + 1, success: true };
                }
            }
        }
    }

    return { blockStart: -1, blockEnd: -1, success: false };
}

function findKeyBlock(text: string, key: string, boundsStart: number, boundsEnd: number): Block | null {
    let state: 'NORMAL' | 'STRING' | 'LINE_COMMENT' | 'BLOCK_COMMENT' | 'ESCAPED_CHAR' = 'NORMAL';
    let i = boundsStart;
    
    // Advance past the first '{'
    while (i < boundsEnd && text[i] !== '{') i++;
    if (i >= boundsEnd) return null;
    i++; // Step inside

    let currentKeyStart = -1;
    let currentKeyStr = '';
    let depth = 0;

    while (i < boundsEnd) {
        const char = text[i];
        const nextChar = i + 1 < boundsEnd ? text[i + 1] : '';

        if (state === 'ESCAPED_CHAR') {
            state = 'STRING';
            i++;
            continue;
        }

        if (state === 'STRING') {
            if (char === '\\') {
                state = 'ESCAPED_CHAR';
            } else if (char === '"') {
                state = 'NORMAL';
                currentKeyStr = text.substring(currentKeyStart + 1, i);

                if (depth === 0 && currentKeyStr === key) {
                    let j = i + 1;
                    while (j < boundsEnd && /\s/.test(text[j])) j++;
                    if (j < boundsEnd && text[j] === ':') {
                        const scanResult = scanBalancedObjectBlock(text, j + 1);
                        if (scanResult.success && scanResult.blockEnd <= boundsEnd) {
                            return { start: scanResult.blockStart, end: scanResult.blockEnd, keyStart: currentKeyStart };
                        }
                    }
                }
            }
            i++;
            continue;
        }

        if (state === 'LINE_COMMENT') {
            if (char === '\n') state = 'NORMAL';
            i++;
            continue;
        }

        if (state === 'BLOCK_COMMENT') {
            if (char === '*' && nextChar === '/') {
                state = 'NORMAL';
                i++;
            }
            i++;
            continue;
        }

        if (state === 'NORMAL') {
            if (char === '"') {
                state = 'STRING';
                currentKeyStart = i;
            } else if (char === '/' && nextChar === '/') {
                state = 'LINE_COMMENT';
                i++;
            } else if (char === '/' && nextChar === '*') {
                state = 'BLOCK_COMMENT';
                i++;
            } else if (char === '{' || char === '[') {
                depth++;
            } else if (char === '}' || char === ']') {
                depth--;
            }
        }
        i++;
    }
    
    return null;
}

export function mutateEvaluationPolicyFileAst(
    originalFileText: string,
    parsedPolicyObject: FederationEvaluationPolicyFile,
    patchArtifactSubset: FederationEvaluationPolicyPatchArtifact
): FederationEvaluationPolicyAstMutationResult {
    if (!patchArtifactSubset.targetProfileAuthoritative || !patchArtifactSubset.targetProfile) {
        return {
            mutationApplied: false,
            changedPaths: [],
            updatedFileText: originalFileText,
            refusalReason: 'Target profile is non-authoritative or missing.',
            summaryMessage: 'Mutation refused: Target profile is non-authoritative.'
        };
    }

    const targetProfile = patchArtifactSubset.targetProfile;
    if (!parsedPolicyObject.profiles || !(targetProfile in parsedPolicyObject.profiles)) {
        return {
            mutationApplied: false,
            changedPaths: [],
            updatedFileText: originalFileText,
            refusalReason: `Target profile '${targetProfile}' missing from profiles root.`,
            summaryMessage: `Mutation refused: Profile '${targetProfile}' not found.`
        };
    }

    const profilesBlock = findKeyBlock(originalFileText, 'profiles', 0, originalFileText.length);
    if (!profilesBlock) {
        return {
            mutationApplied: false,
            changedPaths: [],
            updatedFileText: originalFileText,
            refusalReason: 'Cannot locate "profiles" block in JSON.',
            summaryMessage: 'Mutation refused: Invalid JSON structure.'
        };
    }

    const profileBlock = findKeyBlock(originalFileText, targetProfile, profilesBlock.start, profilesBlock.end);
    if (!profileBlock) {
        return {
            mutationApplied: false,
            changedPaths: [],
            updatedFileText: originalFileText,
            refusalReason: `Cannot locate "${targetProfile}" block in JSON.`,
            summaryMessage: 'Mutation refused: Ambiguous insertion location.'
        };
    }

    let currentText = originalFileText;
    const changedPaths: string[] = [];

    // Helper to inject or replace a section
    const applySectionMutation = (sectionName: string, proposedData: Record<string, any> | any[]) => {
        if (!proposedData || (Array.isArray(proposedData) && proposedData.length === 0) || Object.keys(proposedData).length === 0) {
            return;
        }

        // Recalculate block positions since currentText might have shifted
        const pb = findKeyBlock(currentText, 'profiles', 0, currentText.length);
        const pBlock = findKeyBlock(currentText, targetProfile, pb!.start, pb!.end);
        
        const sectionBlock = findKeyBlock(currentText, sectionName, pBlock!.start, pBlock!.end);
        
        let mergedData: any;
        const existingData = (parsedPolicyObject.profiles[targetProfile] as any)[sectionName];
        
        if (Array.isArray(proposedData)) {
            mergedData = existingData ? [...existingData] : [];
            // Merge waivers uniquely if possible, else append
            for (const item of proposedData) {
                mergedData.push(item);
            }
        } else {
            mergedData = existingData ? { ...existingData } : {};
            Object.assign(mergedData, proposedData);
            
            // Sort keys
            const sorted: Record<string, any> = {};
            for (const key of Object.keys(mergedData).sort()) {
                sorted[key] = mergedData[key];
            }
            mergedData = sorted;
        }

        const sectionString = JSON.stringify(mergedData, null, 8).replace(/\n/g, '\n    ');

        if (sectionBlock) {
            // Replace existing block
            currentText = currentText.substring(0, sectionBlock.start) + sectionString + currentText.substring(sectionBlock.end);
        } else {
            // Insert before the end of the profile block
            const insertPos = pBlock!.end - 1; // At the '}' of the profile block
            
            // Look backwards to see if we need a comma
            let prevCharIdx = insertPos - 1;
            while (prevCharIdx > pBlock!.start && /\s/.test(currentText[prevCharIdx])) prevCharIdx--;
            const needsComma = currentText[prevCharIdx] !== '{';
            
            const insertString = (needsComma ? ',\n        ' : '\n        ') + `"${sectionName}": ` + sectionString + '\n    ';
            currentText = currentText.substring(0, insertPos) + insertString + currentText.substring(insertPos);
        }

        changedPaths.push(`profiles.${targetProfile}.${sectionName}`);
    };

    applySectionMutation('codeOverrides', patchArtifactSubset.proposedCodeOverrides);
    applySectionMutation('categoryOverrides', patchArtifactSubset.proposedCategoryOverrides);
    applySectionMutation('waivers', patchArtifactSubset.proposedWaivers);

    if (changedPaths.length === 0) {
        return {
            mutationApplied: false,
            changedPaths: [],
            updatedFileText: originalFileText,
            summaryMessage: 'Mutation applied: 0 sections modified (no safe overrides found).'
        };
    }

    return {
        mutationApplied: true,
        changedPaths,
        updatedFileText: currentText,
        summaryMessage: `Mutation applied: ${changedPaths.length} subtrees updated in profile '${targetProfile}'.`
    };
}
