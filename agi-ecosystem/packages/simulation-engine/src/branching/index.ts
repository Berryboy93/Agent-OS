import { DAG, DAGNode } from '@agi-ecosystem/dag-compiler';

export interface SimulationBranch {
  id: string;
  parent_id: string | null;
  dag: DAG;
  modifications: NodeModification[];
  depth: number;
}

export interface NodeModification {
  node_id: string;
  field: string;
  old_value: any;
  new_value: any;
}

export interface BranchingConfig {
  max_branches: number;
  max_depth: number;
  mutation_strategies: ('executor_swap' | 'timeout_increase' | 'payload_modify' | 'skip_node')[];
}

export class BranchingEngine {
  private branches: SimulationBranch[] = [];
  private config: BranchingConfig;

  constructor(config: Partial<BranchingConfig> = {}) {
    this.config = {
      max_branches: 10,
      max_depth: 3,
      mutation_strategies: ['executor_swap', 'timeout_increase', 'payload_modify'],
      ...config
    };
  }

  generateBranches(dag: DAG): SimulationBranch[] {
    this.branches = [];

    // Root branch (original DAG)
    this.branches.push({
      id: 'root',
      parent_id: null,
      dag: { ...dag },
      modifications: [],
      depth: 0
    });

    // Generate mutations
    let currentGeneration = [this.branches[0]];

    for (let depth = 0; depth < this.config.max_depth; depth++) {
      const nextGeneration: SimulationBranch[] = [];

      for (const parent of currentGeneration) {
        if (this.branches.length >= this.config.max_branches) break;

        const mutations = this.generateMutations(parent);
        for (const mutation of mutations) {
          if (this.branches.length >= this.config.max_branches) break;

          const modifiedDAG = this.applyMutation(parent.dag, mutation);
          const branch: SimulationBranch = {
            id: `branch-${this.branches.length}`,
            parent_id: parent.id,
            dag: modifiedDAG,
            modifications: [...parent.modifications, mutation],
            depth: depth + 1
          };

          this.branches.push(branch);
          nextGeneration.push(branch);
        }
      }

      currentGeneration = nextGeneration;
    }

    return this.branches;
  }

  private generateMutations(branch: SimulationBranch): NodeModification[] {
    const mutations: NodeModification[] = [];
    const strategies = this.config.mutation_strategies;

    for (const node of branch.dag.nodes) {
      for (const strategy of strategies) {
        switch (strategy) {
          case 'executor_swap':
            mutations.push({
              node_id: node.id,
              field: 'executor',
              old_value: node.executor,
              new_value: `${node.executor}_v2`
            });
            break;
          case 'timeout_increase':
            mutations.push({
              node_id: node.id,
              field: 'timeout_ms',
              old_value: node.metadata.timeout_ms,
              new_value: node.metadata.timeout_ms * 2
            });
            break;
          case 'payload_modify':
            mutations.push({
              node_id: node.id,
              field: 'payload',
              old_value: node.payload,
              new_value: { ...node.payload, _simulated: true }
            });
            break;
          case 'skip_node':
            mutations.push({
              node_id: node.id,
              field: 'skipped',
              old_value: false,
              new_value: true
            });
            break;
        }
      }
    }

    // Return random subset
    return mutations.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  private applyMutation(dag: DAG, mutation: NodeModification): DAG {
    const newNodes = dag.nodes.map(node => {
      if (node.id !== mutation.node_id) return node;

      const modified = { ...node };
      if (mutation.field === 'executor') {
        modified.executor = mutation.new_value;
      } else if (mutation.field === 'timeout_ms') {
        modified.metadata = { ...modified.metadata, timeout_ms: mutation.new_value };
      } else if (mutation.field === 'payload') {
        modified.payload = mutation.new_value;
      }
      return modified;
    });

    return { ...dag, nodes: newNodes };
  }

  getBranch(id: string): SimulationBranch | undefined {
    return this.branches.find(b => b.id === id);
  }

  getBranchTree(): Map<string, SimulationBranch[]> {
    const tree = new Map<string, SimulationBranch[]>();
    for (const branch of this.branches) {
      const parentId = branch.parent_id || 'root';
      if (!tree.has(parentId)) tree.set(parentId, []);
      tree.get(parentId)!.push(branch);
    }
    return tree;
  }
}
