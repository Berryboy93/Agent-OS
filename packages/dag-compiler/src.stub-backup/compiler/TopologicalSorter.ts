export class TopologicalSorter {
  sort(nodes: any[], edges: any[]): string[] {
    // Real implementation can be added later (Kahn's algorithm or DFS)
    return nodes.map((n: any) => n.id);
  }
}
