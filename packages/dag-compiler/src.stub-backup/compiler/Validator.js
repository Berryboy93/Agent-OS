"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAGValidator = void 0;
class DAGValidator {
    validate(dag) {
        const errors = [];
        if (!dag.nodes?.length) {
            errors.push("DAG must contain at least one node");
        }
        const nodeIds = new Set(dag.nodes.map(n => n.id));
        // Edge validation
        for (const edge of dag.edges) {
            if (!nodeIds.has(edge.from))
                errors.push(`Unknown source node: ${edge.from}`);
            if (!nodeIds.has(edge.to))
                errors.push(`Unknown target node: ${edge.to}`);
        }
        const exitPoints = this.findExitPoints(dag);
        if (exitPoints.length === 0 && dag.nodes.length > 0) {
            errors.push("No exit points found in DAG");
        }
        return {
            valid: errors.length === 0,
            errors,
            nodes: dag.nodes,
        };
    }
    findExitPoints(dag) {
        const incoming = new Set(dag.edges.map(e => e.to));
        return dag.nodes.filter(n => !incoming.has(n.id)).map(n => n.id);
    }
}
exports.DAGValidator = DAGValidator;
//# sourceMappingURL=Validator.js.map