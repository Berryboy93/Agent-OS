import { DAG } from '../types/index.js';

export class DAGParser {
  static fromJSON(json: string): DAG {
    const parsed = JSON.parse(json);
    return DAG.parse(parsed);
  }

  static fromYAML(yaml: string): DAG {
    // In production, use a YAML parser like js-yaml
    // For now, assume JSON-like structure
    const parsed = JSON.parse(yaml); // simplified
    return DAG.parse(parsed);
  }

  static toJSON(dag: DAG): string {
    return JSON.stringify(dag, null, 2);
  }

  static toDOT(dag: DAG): string {
    const lines = [
      'digraph DAG {',
      '  rankdir=TB;',
      '  node [shape=box, style=rounded];'
    ];
    for (const node of dag.nodes) {
      lines.push(`  "${node.id}" [label="${node.type}\n${node.executor}"];`);
    }
    for (const edge of dag.edges) {
      const label = edge.condition ? ` [label="${edge.condition}"]` : '';
      lines.push(`  "${edge.from}" -> "${edge.to}"${label};`);
    }
    lines.push('}');
    return lines.join('\n');
  }
}
