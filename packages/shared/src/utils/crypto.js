"use strict";
/**
 * Cryptographic utilities for the AGI ecosystem
 * All hashing uses SHA-256 for deterministic replay
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.sha256Object = sha256Object;
exports.generateUUID = generateUUID;
exports.verifyHash = verifyHash;
exports.hashChain = hashChain;
exports.generateNonce = generateNonce;
const crypto_1 = require("crypto");
function sha256(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
function sha256Object(obj) {
    const canonical = JSON.stringify(obj, Object.keys(obj).sort());
    return sha256(canonical);
}
function generateUUID() {
    return (0, crypto_1.randomUUID)();
}
function verifyHash(data, expectedHash) {
    return sha256(data) === expectedHash;
}
function hashChain(previousHash, currentData) {
    return sha256(`${previousHash}:${currentData}`);
}
function generateNonce(length = 16) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
//# sourceMappingURL=crypto.js.map