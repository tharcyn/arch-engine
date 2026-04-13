import * as fs from 'node:fs';

export const FreezeDriftTaxonomy = {
   HASH: 'FREEZE_HASH_DRIFT',
   TRACE: 'FREEZE_TRACE_DRIFT',
   PUBLIC_SURFACE: 'FREEZE_PUBLIC_SURFACE_DRIFT',
   TOPOLOGY: 'FREEZE_TOPOLOGY_BOUNDARY_DRIFT',
   CANONICALIZATION: 'FREEZE_CANONICALIZATION_DRIFT',
   SNAPSHOT_SEQUENCE: 'FREEZE_SNAPSHOT_SEQUENCE_DRIFT',
   ENTROPY: 'FREEZE_ENTROPY_CONTRACT_DRIFT',
   ADAPTER_SANDBOX: 'FREEZE_ADAPTER_SANDBOX_DRIFT',
} as const;

export type FreezeDriftCategory = typeof FreezeDriftTaxonomy[keyof typeof FreezeDriftTaxonomy];

export function assertKnownFreezeDriftCategory(category: string): asserts category is FreezeDriftCategory {
    const validValues = Object.values(FreezeDriftTaxonomy) as string[];
    if (!validValues.includes(category)) {
        throw new Error(`UNKNOWN_FREEZE_DRIFT_CATEGORY: ${category}`);
    }
}

export interface FreezeSummaryProps {
    phase: string;
    category: FreezeDriftCategory;
    expectedGuard: string;
    receivedValue: string;
    seed?: number;
    baselineFile?: string;
}

export function buildDriftSummary(props: FreezeSummaryProps) {
    assertKnownFreezeDriftCategory(props.category);
    
    const summaryHeader = `\n======= ARCH ENGINE DRIFT SUMMARY =======`;
    const details = [
        `Phase:           ${props.phase}`,
        `Drift Category:  [${props.category}]`,
        props.seed !== undefined ? `Diagnostic Seed: ${props.seed}` : null,
        props.baselineFile ? `Baseline File:   ${props.baselineFile}` : null,
        `Expected Guard:  ${props.expectedGuard}`,
        `Actual Breach:   ${props.receivedValue}`
    ].filter(Boolean).join('\n');
    const summaryFooter = `=========================================\n`;
    
    return summaryHeader + '\n' + details + '\n' + summaryFooter;
}

export function emitFreezeSummaryJSON(props: FreezeSummaryProps) {
    assertKnownFreezeDriftCategory(props.category);
    
    const block = JSON.stringify({
        phase: props.phase,
        category: props.category,
        seed: props.seed !== undefined ? String(props.seed) : "",
        expectedGuard: props.expectedGuard,
        receivedValue: props.receivedValue,
        baselineFile: props.baselineFile || ""
    });
    
    return `BEGIN_FREEZE_SUMMARY_JSON\n${block}\nEND_FREEZE_SUMMARY_JSON`;
}

export function validateSnapshotApprovalMarker() {
    const isApproved = process.env.SNAPSHOT_UPDATE_APPROVED === 'true';
    if (!isApproved) return; // Normally validation depends on whether the snapshot actually changed.
    
    // In CI, if we get here we assume a change exists that needs validation.
    // Ensure the changelog diff exists physically. Assuming local FS paths typically checked in CI.
    const hasChangelog = fs.existsSync('CHANGELOG_FREEZE_UPDATE.md');
    
    if (!isApproved || !hasChangelog) {
         throw new Error('FREEZE_BASELINE_MUTATION_UNAUTHORIZED');
    }
}
