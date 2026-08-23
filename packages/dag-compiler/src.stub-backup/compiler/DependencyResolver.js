"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyResolver = void 0;
class DependencyResolver {
    async resolve(dag) {
        const { TopologicalSorter } = await import('./TopologicalSorter.js');
        const sorter = new TopologicalSorter();
        const executionOrder = sorter.sort(dag.nodes, dag.edges);
        return {
            executionOrder,
            criticalPath: [],
            resolved: new Map()
        };
    }
    findCriticalPath(_dag, _resolution) {
        return [];
    }
}
exports.DependencyResolver = DependencyResolver;
//# sourceMappingURL=DependencyResolver.js.map