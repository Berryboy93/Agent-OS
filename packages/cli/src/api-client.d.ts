export declare const client: {
    getAgents: () => Promise<{
        id: string;
        name: string;
        version: string;
        description?: string;
    }[]>;
    getRuns: () => Promise<{
        id: string;
        agent_id: string;
        status: string;
        created_at: number;
    }[]>;
    getRun: (id: string) => Promise<{
        id: string;
        agent_id: string;
        status: string;
        input_json: string;
        output_json?: string;
        error_message?: string;
        total_tokens: number;
        created_at: number;
    }>;
    getRunEvents: (id: string) => Promise<{
        type: string;
        data: unknown;
        timestamp: number;
    }[]>;
    getStats: () => Promise<{
        runs: {
            total: number;
        };
        tokens: {
            total: number;
        };
        approvals: {
            pending: number;
        };
    }>;
    getApprovals: () => Promise<{
        id: string;
        status: string;
        agent_id: string;
        created_at: number;
    }[]>;
    resolveApproval: (id: string, decision: "APPROVED" | "REJECTED", note?: string) => Promise<{
        id: string;
        status: string;
    }>;
    runAgent: (agentId: string, input: Record<string, unknown>, systemPrompt?: string) => Promise<{
        runId: string;
        status: string;
    }>;
    getDeployments: () => Promise<{
        id: string;
        status: string;
        agent_id: string;
        environment: string;
    }[]>;
    rollbackDeployment: (id: string) => Promise<{
        rollbackDeploymentId: string;
    }>;
};
//# sourceMappingURL=api-client.d.ts.map