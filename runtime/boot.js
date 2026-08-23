process.on("uncaughtException", (err) => {
    console.error("[Agent-OS Runtime Error]", err);
});
process.on("unhandledRejection", (err) => {
    console.error("[Agent-OS Promise Rejection]", err);
});
console.log("Agent-OS Runtime Booting...");
export {};
//# sourceMappingURL=boot.js.map