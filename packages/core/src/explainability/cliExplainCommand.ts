import { DeterministicResolverExplainTrace } from './resolverExplainTrace.js';
import { PrecedenceResolutionGraph } from './precedenceResolutionGraph.js';

/**
 * Explains policy resolution deterministically.
 * Triggered via CLI: arch-engine explain policy-resolution <policyURI>
 */
export function renderExplainabilityTrace(trace: DeterministicResolverExplainTrace, graph?: PrecedenceResolutionGraph): string {
    let output = '';
    
    // 1. Namespace Priority
    output += `[+] Namespace Priority Evaluated -> '${trace.policyURI}'\n`;

    // 2. Lockfile Overrides
    if (trace.lockfileOverrideEncountered) {
        output += `[+] Lockfile Read -> Matched Override\n`;
    } else {
        output += `[+] Lockfile Read -> None matched\n`;
    }

    // 3. Mirror/Registry Lookups
    if (trace.mirrorFallbackTriggered) {
        output += `[!] Mirror Fallback -> Triggered\n`;
    } else {
        output += `[+] Registry Primary -> Fetched\n`;
    }

    // 4. Semver Eliminations
    for (const step of trace.resolutionTimeline) {
        if (step.stage === 'semver_selection' && step.candidatePruned) {
            output += `[-] Semver Selection -> Eliminated [${step.candidatePruned.join(', ')}] : ${step.pruneReason}\n`;
        }
    }

    // 5. Final Reason
    output += `[✓] Resolved: ${trace.selectedCandidate.uri}@${trace.selectedCandidate.version}\n`;
    output += `    ↳ Selected Because: ${trace.resolutionTimeline[trace.resolutionTimeline.length - 1].selectedBecause || 'Default Priority'}\n`;
    
    return output;
}
