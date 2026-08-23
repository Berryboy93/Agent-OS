import { z } from "zod";

export const TriggerSchema = z.enum([
  "pre_execution",
  "post_execution", 
  "any",
  "memory_access",
  "agent_spawn"
]);

export const ActionTypeSchema = z.enum([
  "reject",
  "log_event",
  "escalate",
  "sandbox",
  "audit",
  "notify"
]);

export const ConditionSchema = z.object({
  left: z.union([z.string(), z.number()]),
  operator: z.enum([">", "<", ">=", "<=", "==", "!="]),
  right: z.union([z.string(), z.number(), z.boolean()])
});

export const RuleSchema = z.object({
  name: z.string(),
  when: TriggerSchema,
  condition: ConditionSchema.nullable(),
  actions: z.array(z.object({
    type: ActionTypeSchema,
    argument: z.string().optional()
  }))
});

export const PolicySchema = z.object({
  rules: z.array(RuleSchema)
});

export type Trigger = z.infer<typeof TriggerSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Policy = z.infer<typeof PolicySchema>;

export interface PolicyContext {
  eventType: Trigger;
  risk: number;
  agentId: string;
  agentTrust: number;
  action: string;
  payload: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  actions: Array<{ type: ActionType; argument?: string }>;
  violatedRules: string[];
}
