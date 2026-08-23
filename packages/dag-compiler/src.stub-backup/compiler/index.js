"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAGCompiler = void 0;
const Validator_js_1 = require("./Validator.js");
const DependencyResolver_js_1 = require("./DependencyResolver.js");
class DAGCompiler {
    validator = new Validator_js_1.DAGValidator();
    resolver = new DependencyResolver_js_1.DependencyResolver();
    async compile(dag) {
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
exports.DAGCompiler = DAGCompiler;
//# sourceMappingURL=index.js.map