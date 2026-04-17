import { listPolicyPackMetadata } from './listPolicyPackMetadata.js';

// Expands policy-pack dependency graphs
// enabling composition of governance baselines
// while preserving deterministic execution order
export async function resolvePolicyPackDependencies(
    requestedPackIds: string[],
    availablePackIds: string[]
): Promise<string[]> {
    const metadata = await listPolicyPackMetadata();
    const depMap = new Map<string, readonly string[]>();
    for (const m of metadata) {
        if (m.dependencies) {
            depMap.set(m.policyPackId, m.dependencies);
        }
    }

    const availableSet = new Set(availablePackIds);
    const resolved: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    function visit(packId: string) {
        if (!availableSet.has(packId)) {
            return;
        }
        if (visited.has(packId)) {
            return;
        }
        if (visiting.has(packId)) {
            return; // cycle detected safely
        }

        visiting.add(packId);

        const deps = depMap.get(packId);
        if (deps) {
            for (const dep of deps) {
                visit(dep);
            }
        }

        visiting.delete(packId);
        visited.add(packId);
        resolved.push(packId);
    }

    for (const req of requestedPackIds) {
        visit(req);
    }

    return resolved;
}
