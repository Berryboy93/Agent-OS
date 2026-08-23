// packages/cli/src/commands/approve.ts
// Wire §9: Approval command business logic (decoupled from CLI)

import { logger } from '../utils/logger.js';
import { validateApprovalId } from '../handlers/validation.js';
import { getApprovalState, updateApprovalStatus } from '../handlers/db.js';
import { findEventByIdempotencyKey, emitApprovalEvent } from '../handlers/events.js';
import { emitSignal } from '../handlers/signals.js';

export interface ApproveOptions {
  approvalId: string;
  note?: string;
  idempotencyKey?: string;
}

export interface ApproveResult {
  success: boolean;
  approvalId: string;
  status: 'APPROVED' | 'ERROR';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export async function approveApproval(
  options: ApproveOptions
): Promise<ApproveResult> {
  const startTime = Date.now();

  const validation = validateApprovalId(options.approvalId);
  if (!validation.valid) {
    return {
      success: false,
      approvalId: options.approvalId || 'UNKNOWN',
      status: 'ERROR',
      message: validation.error || 'Validation failed',
      timestamp: Date.now(),
    };
  }

  try {
    const existing = await getApprovalState(options.approvalId);
    if (!existing) {
      return {
        success: false,
        approvalId: options.approvalId,
        status: 'ERROR',
        message: 'APPROVAL_NOT_FOUND (404)',
        timestamp: Date.now(),
      };
    }

    if (existing.status === 'APPROVED') {
      return {
        success: false,
        approvalId: options.approvalId,
        status: 'ERROR',
        message: 'APPROVAL_ALREADY_PROCESSED (409)',
        timestamp: Date.now(),
        details: { currentStatus: existing.status },
      };
    }

    if (existing.status === 'REJECTED') {
      return {
        success: false,
        approvalId: options.approvalId,
        status: 'ERROR',
        message: 'APPROVAL_ALREADY_REJECTED (409)',
        timestamp: Date.now(),
      };
    }

    if (options.idempotencyKey) {
      const duplicate = await findEventByIdempotencyKey(options.idempotencyKey);
      if (duplicate) {
        logger.info(`Idempotent approval: ${options.approvalId} (key: ${options.idempotencyKey})`);
        return {
          success: true,
          approvalId: options.approvalId,
          status: 'APPROVED',
          message: `Approval ${options.approvalId} confirmed (idempotent)`,
          timestamp: duplicate.createdAt.getTime(),
          details: { idempotent: true },
        };
      }
    }

    const approved = await updateApprovalStatus(options.approvalId, 'APPROVED', {
      approvalNote: options.note,
      approvedAt: new Date(),
      idempotencyKey: options.idempotencyKey,
    });

    if (!approved) {
      return {
        success: false,
        approvalId: options.approvalId,
        status: 'ERROR',
        message: 'Failed to update approval status',
        timestamp: Date.now(),
      };
    }

    try {
      await emitApprovalEvent('APPROVAL_CONFIRMED', {
        status: 'APPROVED',
        approvalId: options.approvalId,
        timestamp: Date.now(),
        idempotencyKey: options.idempotencyKey,
        resource: existing.resource,
      });
    } catch (err) {
      logger.error(`Failed to emit approval event: ${err}`);
    }

    try {
      emitSignal('DAW_APPROVAL_CONFIRMED', {
        approvalId: options.approvalId,
        resource: existing.resource,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error(`Failed to emit DAW signal: ${err}`);
    }

    const elapsed = Date.now() - startTime;
    logger.info(`Approval ${options.approvalId} confirmed in ${elapsed}ms`);

    return {
      success: true,
      approvalId: options.approvalId,
      status: 'APPROVED',
      message: `Approval ${options.approvalId} confirmed`,
      timestamp: Date.now(),
      details: { elapsedMs: elapsed },
    };
  } catch (err) {
    logger.error(`Approval error: ${err}`);
    return {
      success: false,
      approvalId: options.approvalId,
      status: 'ERROR',
      message: `Internal error: ${err instanceof Error ? err.message : 'Unknown'}`,
      timestamp: Date.now(),
    };
  }
}
