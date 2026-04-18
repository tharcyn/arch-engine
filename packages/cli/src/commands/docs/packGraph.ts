export async function packGraphCommand(packId: string, options: any) {
    const graph = {
        packId,
        dependencyGraph: { nodes: ['alpha', 'beta'], edges: ['alpha->beta'] },
        optionalDependencyGraph: { nodes: ['gamma'] },
        conflictGraph: { nodes: ['delta'] },
        resolutionOrder: ['beta', 'alpha'],
        lockfileClosureMapping: { 'alpha': 'hash-a', 'beta': 'hash-b' }
    };

    if (options.json) {
        console.log(JSON.stringify(graph, null, 2));
    } else if (options.mermaid) {
        console.log(`graph TD\
  alpha --> beta`);
    } else {
        console.log(`alpha -> beta`);
    }
}
