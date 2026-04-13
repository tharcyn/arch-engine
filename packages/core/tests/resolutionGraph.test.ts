import { describe, it, expect } from 'vitest';
import { ResolutionGraph } from '../src/policy/resolutionGraph.js';

describe('Phase 3A: ResolutionGraph Scaffold', () => {
  it('Test 1: Detects simple cycle A -> B -> A', () => {
    const graph = new ResolutionGraph();
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'A');
    
    expect(graph.detectCycle('A')).toBe(true);
  });

  it('Test 2: Detects deep cycle A -> B -> C -> B', () => {
    const graph = new ResolutionGraph();
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'B');
    
    expect(graph.detectCycle('A')).toBe(true);
  });

  it('Test 3: Allows valid DAG A -> B -> C -> D', () => {
    const graph = new ResolutionGraph();
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'D');
    
    expect(graph.detectCycle('A')).toBe(false);
  });

  it('Test 4: Allows sibling reuse (A -> B, A -> C)', () => {
    const graph = new ResolutionGraph();
    graph.addEdge('A', 'B');
    graph.addEdge('A', 'C');
    
    expect(graph.detectCycle('A')).toBe(false);
  });

  it('Test 5: Rejects diamond back-edge (A->B->D, A->C->D->B)', () => {
    const graph = new ResolutionGraph();
    // A -> B -> D
    // A -> C -> D -> B
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'D');
    graph.addEdge('A', 'C');
    graph.addEdge('C', 'D');
    graph.addEdge('D', 'B'); // This causes the cycle starting from C -> D -> B -> D ...
    
    expect(graph.detectCycle('A')).toBe(true);
  });

  it('correctly tracks visited nodes', () => {
    const graph = new ResolutionGraph();
    graph.markVisited('A');
    expect(graph.hasVisited('A')).toBe(true);
    expect(graph.hasVisited('B')).toBe(false);
  });
});
