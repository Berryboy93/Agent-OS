"use strict";
/**
 * Common types shared across all AGI ecosystem packages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY = void 0;
exports.DEFAULT_RETRY = {
    maxAttempts: 3,
    backoffMs: 100,
    maxBackoffMs: 5000,
    jitter: true,
};
//# sourceMappingURL=common.js.map