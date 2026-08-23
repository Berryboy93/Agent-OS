import type { DAG, CompilationResult } from '../types.js';
import { DAGValidator } from './Validator.js';
import { DependencyResolver } from './DependencyResolver.js';

export class DAGCompiler {
  private validator = new DAGValidator();
  private resolver = new DependencyResolver();

  async compile(dag: DAG): Promise<CompilationResult> {
    const validation = this.validator.validate(dag);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors, stages: [] };
    }

    const resolution = await this.resolver.resolve(dag);

    return {
      valid: true,
      errors: [],
      stages: [resolution.executionOrder], // one stage for linear DAGs
      executionOrder: resolution.executionOrder
    };
  }
}
