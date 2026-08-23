"use strict";
/**
 * Validation utilities using Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryConfigSchema = exports.TimestampSchema = exports.HashSchema = exports.UUIDSchema = void 0;
exports.validateUUID = validateUUID;
exports.validateHash = validateHash;
exports.assertNonEmpty = assertNonEmpty;
const zod_1 = require("zod");
exports.UUIDSchema = zod_1.z.string().uuid();
exports.HashSchema = zod_1.z.string().regex(/^[a-f0-9]{64}$/);
exports.TimestampSchema = zod_1.z.number().int().positive();
exports.RetryConfigSchema = zod_1.z.object({
    maxAttempts: zod_1.z.number().int().min(1).max(10),
    backoffMs: zod_1.z.number().int().positive(),
    maxBackoffMs: zod_1.z.number().int().positive(),
    jitter: zod_1.z.boolean(),
});
function validateUUID(value) {
    return exports.UUIDSchema.safeParse(value).success;
}
function validateHash(value) {
    return exports.HashSchema.safeParse(value).success;
}
function assertNonEmpty(arr, name) {
    if (arr.length === 0) {
        throw new Error(`${name} cannot be empty`);
    }
}
//# sourceMappingURL=validation.js.map