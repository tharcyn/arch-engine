import * as semver from 'semver';
import type { RegistryPolicyPackManifest } from './PolicyPackManifest.js';
import { resolvePolicyPackVersions } from './resolvePolicyPackVersions.js';

export interface PolicyPackDependencyGraphResolutionResult {
    readonly resolvedGraph: readonly RegistryPolicyPackManifest[];
    readonly dependencyClosure: readonly string[];
    readonly conflicts: readonly string[];
    readonly missingDependencies: readonly string[];
    readonly circularDependencies: readonly string[];
    readonly resolutionDiagnostics: readonly string[];
}

export function resolvePolicyPackDependencyGraph(
    availablePacks: readonly RegistryPolicyPackManifest[],
    entryPacks: readonly RegistryPolicyPackManifest[]
): PolicyPackDependencyGraphResolutionResult {
    const resolvedGraph = new Map<string, RegistryPolicyPackManifest>();
    const missingDependencies = new Set<string>();
    const conflicts = new Set<string>();
    const circularDependencies = new Set<string>();
    const diagnostics: string[] = [];
    
    // We maintain a stack to detect circular dependencies
    const resolvingStack = new Set<string>();

    function resolveDependencies(pack: RegistryPolicyPackManifest) {
        if (resolvingStack.has(pack.policyPackId)) {
            circularDependencies.add(pack.policyPackId);
            diagnostics.push(`Circular dependency detected involving: ${pack.policyPackId}`);
            return;
        }

        if (resolvedGraph.has(pack.policyPackId)) {
            // Already resolved
            return;
        }

        resolvingStack.add(pack.policyPackId);
        resolvedGraph.set(pack.policyPackId, pack);

        const requirements = pack.dependencies || [];
        const optionals = pack.optionalDependencies || [];
        
        for (const req of requirements) {
            const versionPlan = resolvePolicyPackVersions(availablePacks, { [req.policyPackId]: req.semverRange })[0];
            
            if (!versionPlan || !versionPlan.resolvedPack) {
                missingDependencies.add(`${req.policyPackId}@${req.semverRange}`);
                diagnostics.push(`Missing required dependency: ${req.policyPackId}@${req.semverRange} (required by ${pack.policyPackId})`);
                continue;
            }

            const existing = resolvedGraph.get(req.policyPackId);
            if (existing) {
                if (!semver.satisfies(existing.policyPackVersion, req.semverRange)) {
                    conflicts.add(`${req.policyPackId}@${req.semverRange}`);
                    diagnostics.push(`Conflict: ${pack.policyPackId} requires ${req.policyPackId}@${req.semverRange}, but ${existing.policyPackVersion} was already resolved`);
                }
            } else {
                resolveDependencies(versionPlan.resolvedPack);
            }
        }

        // Check conflicts
        const packConflicts = pack.conflicts || [];
        for (const conflict of packConflicts) {
            if (resolvedGraph.has(conflict)) {
                conflicts.add(conflict);
                diagnostics.push(`Conflict: ${pack.policyPackId} explicitly conflicts with ${conflict}`);
            }
        }

        // Optional dependencies
        for (const opt of optionals) {
            const versionPlan = resolvePolicyPackVersions(availablePacks, { [opt.policyPackId]: opt.semverRange })[0];
            if (!versionPlan || !versionPlan.resolvedPack) {
                diagnostics.push(`Optional dependency missing or incompatible: ${opt.policyPackId}@${opt.semverRange}`);
                continue;
            }
            
            const existing = resolvedGraph.get(opt.policyPackId);
            if (existing) {
                if (!semver.satisfies(existing.policyPackVersion, opt.semverRange)) {
                    diagnostics.push(`Optional dependency conflict: ${opt.policyPackId}@${opt.semverRange}`);
                }
            } else {
                resolveDependencies(versionPlan.resolvedPack);
            }
        }

        resolvingStack.delete(pack.policyPackId);
    }

    for (const entry of entryPacks) {
        resolveDependencies(entry);
    }

    // Sort to guarantee determinism
    const sortedResolvedGraph = Array.from(resolvedGraph.values())
        .sort((a, b) => a.policyPackId.localeCompare(b.policyPackId));
        
    const closure = sortedResolvedGraph.map(p => `${p.policyPackId}@${p.policyPackVersion}`);

    return {
        resolvedGraph: sortedResolvedGraph,
        dependencyClosure: closure,
        conflicts: Array.from(conflicts).sort(),
        missingDependencies: Array.from(missingDependencies).sort(),
        circularDependencies: Array.from(circularDependencies).sort(),
        resolutionDiagnostics: diagnostics
    };
}
