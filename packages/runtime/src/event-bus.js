export class EventBus {
    handlers = new Map();
    allHandlers = new Set();
    sequenceCounters = new Map();
    on(type, handler) {
        if (type === "*") {
            this.allHandlers.add(handler);
            return () => this.allHandlers.delete(handler);
        }
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        return () => this.handlers.get(type)?.delete(handler);
    }
    async emit(event) {
        const counter = this.sequenceCounters.get(event.runId) ?? 0;
        this.sequenceCounters.set(event.runId, counter + 1);
        const fullEvent = { ...event, sequenceNumber: counter };
        const typeHandlers = this.handlers.get(event.type) ?? new Set();
        const promises = [];
        for (const handler of [...typeHandlers, ...this.allHandlers]) {
            const result = handler(fullEvent);
            if (result instanceof Promise)
                promises.push(result);
        }
        await Promise.allSettled(promises);
        return fullEvent;
    }
    clearRun(runId) {
        this.sequenceCounters.delete(runId);
    }
    removeAllHandlers() {
        this.handlers.clear();
        this.allHandlers.clear();
        this.sequenceCounters.clear();
    }
}
//# sourceMappingURL=event-bus.js.map