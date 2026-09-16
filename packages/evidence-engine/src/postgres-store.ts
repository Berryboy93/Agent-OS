import {
  PostgresEventStore,
  type EventStoreConfig,
  type StoreEvent,
} from "@agi-ecosystem/event-store";

import {
  EVIDENCE_EVENT_TYPES,
  type EvidenceCheckCompletedEvent,
  type EvidenceEvent,
  type EvidenceEventBase,
} from "./events.js";

import type { EvidenceStore } from "./store.js";

const EVIDENCE_TYPE_PREFIX = "evidence.";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toStoreEvent(event: EvidenceEvent): StoreEvent {
  return {
    id: event.eventId,
    timestamp: event.occurredAt,
    type: event.type,
    payload: {
      runId: event.runId,
      taskId: event.taskId,
      sequence: event.sequence,
      metadata: event.metadata ?? null,
      payload: event.payload,
    },
  };
}

function getBaseFields(event: StoreEvent): EvidenceEventBase {
  const payload = event.payload;

  if (!event.id) {
    throw new Error("Evidence event is missing its event ID.");
  }

  if (typeof payload.runId !== "string") {
    throw new Error(
      `Evidence event ${event.id} has invalid runId.`,
    );
  }

  if (typeof payload.taskId !== "string") {
    throw new Error(
      `Evidence event ${event.id} has invalid taskId.`,
    );
  }

  if (
    typeof payload.sequence !== "number" ||
    !Number.isInteger(payload.sequence) ||
    payload.sequence < 0
  ) {
    throw new Error(
      `Evidence event ${event.id} has invalid sequence.`,
    );
  }

  return {
    eventId: event.id,
    runId: payload.runId,
    taskId: payload.taskId,
    type: event.type as EvidenceEvent["type"],
    occurredAt: new Date(event.timestamp).toISOString(),
    sequence: payload.sequence,
    ...(isObject(payload.metadata)
      ? { metadata: payload.metadata }
      : {}),
  };
}

function hydrateEvent(event: StoreEvent): EvidenceEvent {
  if (!event.type.startsWith(EVIDENCE_TYPE_PREFIX)) {
    throw new Error(
      `Cannot hydrate non-evidence event type: ${event.type}`,
    );
  }

  const base = getBaseFields(event);
  const payload = event.payload.payload;

  if (!isObject(payload)) {
    throw new Error(
      `Evidence event ${event.id ?? "unknown"} has invalid payload.`,
    );
  }

  switch (event.type) {
    case EVIDENCE_EVENT_TYPES.RUN_STARTED:
      if (typeof payload.baseRevision !== "string") {
        throw new Error(
          `Invalid ${event.type} payload.`,
        );
      }

      return {
        ...base,
        type: EVIDENCE_EVENT_TYPES.RUN_STARTED,
        payload: {
          baseRevision: payload.baseRevision,
        },
      };

    case EVIDENCE_EVENT_TYPES.CHECK_COMPLETED:
      if (
        typeof payload.id !== "string" ||
        typeof payload.category !== "string" ||
        typeof payload.status !== "string" ||
        typeof payload.required !== "boolean" ||
        typeof payload.critical !== "boolean"
      ) {
        throw new Error(
          `Invalid ${event.type} payload.`,
        );
      }

      return {
        ...base,
        type: EVIDENCE_EVENT_TYPES.CHECK_COMPLETED,
        payload: {
          id: payload.id,
          category:
            payload.category as EvidenceCheckCompletedEvent["payload"]["category"],
          status:
            payload.status as EvidenceCheckCompletedEvent["payload"]["status"],
          required: payload.required,
          critical: payload.critical,
          ...(typeof payload.message === "string"
            ? { message: payload.message }
            : {}),
          ...(typeof payload.durationMs === "number"
            ? { durationMs: payload.durationMs }
            : {}),
          ...(isObject(payload.metadata)
            ? { metadata: payload.metadata }
            : {}),
        },
      } satisfies EvidenceCheckCompletedEvent;

    case EVIDENCE_EVENT_TYPES.BUNDLE_CREATED:
      return {
        ...base,
        type: EVIDENCE_EVENT_TYPES.BUNDLE_CREATED,
        payload: payload as EvidenceEvent["payload"],
      } as EvidenceEvent;

    case EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED:
      if (
        typeof payload.evidenceCompleteness !== "number" ||
        typeof payload.testConfidence !== "number" ||
        typeof payload.buildConfidence !== "number" ||
        typeof payload.securityConfidence !== "number" ||
        typeof payload.overall !== "number"
      ) {
        throw new Error(
          `Invalid ${event.type} payload.`,
        );
      }

      return {
        ...base,
        type: EVIDENCE_EVENT_TYPES.CONFIDENCE_CALCULATED,
        payload: {
          evidenceCompleteness:
            payload.evidenceCompleteness,
          testConfidence:
            payload.testConfidence,
          buildConfidence:
            payload.buildConfidence,
          securityConfidence:
            payload.securityConfidence,
          overall: payload.overall,
        },
      };

    case EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED:
      if (
        typeof payload.decision !== "string" ||
        !Array.isArray(payload.reasons) ||
        !isObject(payload.score) ||
        typeof payload.evidenceHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(payload.evidenceHash)
      ) {
        throw new Error(
          `Invalid ${event.type} payload.`,
        );
      }

      if (
        typeof payload.score.evidenceCompleteness !==
          "number" ||
        typeof payload.score.testConfidence !==
          "number" ||
        typeof payload.score.buildConfidence !==
          "number" ||
        typeof payload.score.securityConfidence !==
          "number" ||
        typeof payload.score.overall !== "number"
      ) {
        throw new Error(
          `Invalid ${event.type} score.`,
        );
      }

      return {
        ...base,
        type: EVIDENCE_EVENT_TYPES.PROMOTION_DECIDED,
        payload: {
          decision:
            payload.decision as
              | "promote"
              | "reject"
              | "human_review"
              | "rollback",
          score: {
            evidenceCompleteness:
              payload.score.evidenceCompleteness,
            testConfidence:
              payload.score.testConfidence,
            buildConfidence:
              payload.score.buildConfidence,
            securityConfidence:
              payload.score.securityConfidence,
            overall: payload.score.overall,
          },
          reasons: payload.reasons.filter(
            (reason): reason is string =>
              typeof reason === "string",
          ),
          evidenceHash: payload.evidenceHash,
        },
      };

    case EVIDENCE_EVENT_TYPES.ROLLBACK_REQUESTED:
      if (typeof payload.reason !== "string") {
        throw new Error(
          `Invalid ${event.type} payload.`,
        );
      }

      return {
        ...base,
        type: EVIDENCE_EVENT_TYPES.ROLLBACK_REQUESTED,
        payload: {
          reason: payload.reason,
          ...(typeof payload.rollbackReference === "string"
            ? {
                rollbackReference:
                  payload.rollbackReference,
              }
            : {}),
        },
      };

    default:
      throw new Error(
        `Unsupported evidence event type: ${event.type}`,
      );
  }
}

export class PostgresEvidenceStore
  implements EvidenceStore
{
  constructor(
    private readonly store: PostgresEventStore,
  ) {}

  static fromConfig(
    config: EventStoreConfig,
    tableName = "events",
  ): PostgresEvidenceStore {
    return new PostgresEvidenceStore(
      new PostgresEventStore(config, tableName),
    );
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async append(event: EvidenceEvent): Promise<void> {
    await this.store.append(toStoreEvent(event));
  }

  async getRun(
    runId: string,
  ): Promise<readonly EvidenceEvent[]> {
    const collected: StoreEvent[] = [];
    let afterSequence = 0;

    for (;;) {
      const page = await this.store.getEvents({
        limit: 1000,
        after_sequence: afterSequence,
      });

      const evidenceEvents = page.filter(
        (event) =>
          event.type.startsWith(EVIDENCE_TYPE_PREFIX) &&
          event.payload.runId === runId,
      );

      collected.push(...evidenceEvents);

      if (page.length < 1000) break;

      const lastSequence = Number(
        page[page.length - 1]?.sequence_number ?? afterSequence,
      );

      if (!Number.isFinite(lastSequence) || lastSequence <= afterSequence) {
        throw new Error(
          `Evidence event pagination stalled for run ${runId}.`,
        );
      }

      afterSequence = lastSequence;
    }

    return Object.freeze(
      collected
        .sort(
          (a, b) =>
            Number(a.payload.sequence) -
            Number(b.payload.sequence),
        )
        .map(hydrateEvent),
    );
  }

  async verifyChain(): Promise<void> {
    const result = await this.store.verifyChain();

    if (!result.valid) {
      throw new Error(
        result.error ??
          `Event store hash-chain verification failed after ${result.checked} events`,
      );
    }
  }

  async close(): Promise<void> {
    await this.store.close();
  }
}
