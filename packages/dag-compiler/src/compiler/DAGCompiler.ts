/**
 * DAG Compiler - Main orchestration
 * Transforms raw DAGs into executable CompiledDAGs
 */

import type { UUID, Hash } from '@agi-ecosystem/shared';
import { ValidationError, sha256Object } from '@agi-ecosystem/shared';
import type { DAG, CompiledDAG, DAGNode } from '../types/DAG.js';
import { TopologicalSorter } from './TopologicalSorter.js';
import { DependencyResolver } from './DependencyResolver.js';
import { DAGValidator } from './Validator.js';

export interface CompileOptions {
  validateOnly?: boolean;
  optimizeParallelism?: boolean;
  maxStages?: number;
}

export class DAGCompiler {
  private sorter = new TopologicalSorter();
  private resolver = new DependencyResolver();
  private validator = new DAGValidator();

  async compile(dag: DAG, options: CompileOptions = {}): Promise<CompiledDAG> {
    // Phase 1: Validation
    const validation = this.validator.validate(dag);
    if (!validation.valid) {
      throw new ValidationError(
        `DAG validation failed: ${validation.errors.join('; ')}`,
        { dagId: dag.id, errors: validation.errors }
      );
    }

    if (options.validateOnly) {
      return {
        ...dag,
        executionOrder: [],
        stages: [],
        criticalPath: [],
        compiledAt: Date.now(),
        compilerVersion: '2.0.0',
      } as CompiledDAG;
    }

    // Phase 2: Topological Sort
    const { order, stages, levels } = this.sorter.sort(dag);

    // Phase 3: Dependency Resolution
    const resolution = this.resolver.resolve(dag);

    // Phase 4: Critical Path Analysis
    const criticalPath = await this.resolver.findCriticalPath(dag, resolution);

    // Phase 5: Optimization (stage merging for parallelism)
    let optimizedStages = stages;
    if (options.optimizeParallelism) {
      optimizedStages = this.optimizeStages(stages, dag, levels);
    }

    // Phase 6: Final compilation
    const compiled: CompiledDAG = {
      ...dag,
      hash: validation.hash,
      compiled: true,
      executionOrder: order,
      stages: optimizedStages,
      criticalPath,
      compiledAt: Date.now(),
      compilerVersion: '2.0.0',
      metadata: {
        ...dag.metadata,
        estimatedDurationMs: this.estimateDuration(criticalPath, dag),
        maxParallelism: Math.max(...optimizedStages.map(s => s.length)),
      },
    };

    // Final validation
    const finalValidation = this.validator.validateCompiled(compiled);
    if (!finalValidation.valid) {
      throw new ValidationError(
        `Compiled DAG validation failed: ${finalValidation.errors.join('; ')}`
      );
    }

    return compiled;
  }

  private optimizeStages(
    stages: UUID[][], 
    dag: DAG, 
    levels: Map<UUID, number>
  ): UUID[][] {
    // Merge stages where nodes have no inter-dependencies
    const optimized: UUID[][] = [];

    for (const stage of stages) {
      const current = optimized[optimized.length - 1];

      if (!current || !this.hasInterDependencies(stage, current, dag)) {
        if (current) {
          current.push(...stage);
        } else {
          optimized.push([...stage]);
        }
      } else {
        optimized.push([...stage]);
      }
    }

    return optimized;
  }

  private hasInterDependencies(
    stage1: UUID[], 
    stage2: UUID[], 
    dag: DAG
  ): boolean {
    // Check if any node in stage1 depends on any node in stage2
    for (const edge of dag.edges) {
      if (
        (stage1.includes(edge.sourceNodeId) && stage2.includes(edge.targetNodeId)) ||
        (stage2.includes(edge.sourceNodeId) && stage1.includes(edge.targetNodeId))
      ) {
        return true;
      }
    }
    return false;
  }

  private estimateDuration(criticalPath: UUID[], dag: DAG): number {
    return criticalPath.reduce((sum, id) => {
      const node = dag.nodes.get(id);
      return sum + (node?.timeoutMs ?? 30000);
    }, 0);
  }

  getEntryPoints(dag: DAG): UUID[] {
    return Array.from(dag.nodes.keys()).filter(id => 
      !dag.edges.some(e => e.targetNodeId === id)
    );
  }

  getExitPoints(dag: DAG): UUID[] {
    return Array.from(dag.nodes.keys()).filter(id => 
      !dag.edges.some(e => e.sourceNodeId === id)
    );
  }
}
