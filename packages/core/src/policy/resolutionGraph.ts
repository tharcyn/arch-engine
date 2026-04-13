export class ResolutionGraph {
  public visited: Set<string>;
  public edges: Map<string, string[]>;

  constructor() {
    this.visited = new Set<string>();
    this.edges = new Map<string, string[]>();
  }

  markVisited(policyId: string): void {
    this.visited.add(policyId);
  }

  addEdge(parent: string, child: string): void {
    if (!this.edges.has(parent)) {
      this.edges.set(parent, []);
    }
    this.edges.get(parent)!.push(child);
  }

  hasVisited(policyId: string): boolean {
    return this.visited.has(policyId);
  }

  detectPathCycle(path: string[], nextNode: string): boolean {
    return path.includes(nextNode);
  }

  detectCycle(start: string): boolean {
    const dfs = (node: string, currentPath: string[]): boolean => {
      if (this.detectPathCycle(currentPath, node)) return true;
      if (!this.edges.has(node)) return false;

      const nextPath = [...currentPath, node];
      for (const neighbor of this.edges.get(node)!) {
        if (dfs(neighbor, nextPath)) return true;
      }
      
      return false;
    };

    return dfs(start, []);
  }
}
