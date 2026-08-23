import type { DAG, UUID, ResolutionResult } from '../types.js';
export declare class DependencyResolver {
    resolve(dag: DAG): Promise<ResolutionResult>;
    findCriticalPath(_dag: DAG, _resolution: Map<UUID, any>): UUID[];
}
//# sourceMappingURL=DependencyResolver.d.ts.map