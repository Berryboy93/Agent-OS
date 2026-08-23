// packages/cli/src/commands/reject.ts
// Wire §9: Rejection command business logic (decoupled from CLI)

import { logger } from '../utils/logger.js';
import { validateApprovalId } from '../handlers/validation.js';
import { getApprovalState, updateApprovalStatus } from '../handlers/db.js';
import { emitApprovalEvent } from '../handlers/events.js';
import { emitSignal } from '../handlers/signals.js';

export interface RejectOptions {
  approvalId: string;
  reason?: string;
  note?: string;
}

export interface RejectResult {
  success: boolean;
  approvalId: string;
  status: 'REJECTED' | 'ERROR';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export async function rejectApproval(
  options: RejectOptions
): Promise<RejectResult> {
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

  const finalReason = options.reason || options.note;
  if (!finalReason || finalReason.trim().length === 0) {
    return {
      success: false,
      approvalId: options.approvalId,
      status: 'ERROR',
      message: 'Rejection reason is required',
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
        message: 'APPROVAL_ALREADY_APPROVED (409)',
        timestamp: Date.now(),
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

    const rejected = await updateApprovalStatus(options.approvalId, 'REJECTED', {
      rejectionReason: finalReason,
      rejectedAt: new Date(),
    });

    if (!rejected) {
      return {
        success: false,
        approvalId: options.approvalId,
        status: 'ERROR',
        message: 'Failed to update approval status',
        timestamp: Date.now(),
      };
    }

    try {
      await emitApprovalEvent('APPROVAL_REJECTED', {
        status: 'REJECTED',
        approvalId: options.approvalId,
        reason: options.reason,
        timestamp: Date.now(),
        resource: existing.resource,
      });
    } catch (err) {
      logger.error(`Failed to emit rejection event: ${err}`);
    }

    try {
      emitSignal('DAW_APPROVAL_REJECTED', {
        approvalId: options.approvalId,
        resource: existing.resource,
        reason: options.reason,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error(`Failed to emit DAW rejection signal: ${err}`);
    }

    const elapsed = Date.now() - startTime;
    logger.info(`Approval ${options.approvalId} rejected in ${elapsed}ms`);

    return {
      success: true,
      approvalId: options.approvalId,
      status: 'REJECTED',
      message: `Approval ${options.approvalId} rejected`,
      timestamp: Date.now(),
      details: { reason: options.reason, elapsedMs: elapsed },
    };
  } catch (err) {
    logger.error(`Rejection error: ${err}`);
    return {
      success: false,
      approvalId: options.approvalId,
      status: 'ERROR',
      message: `Internal error: ${err instanceof Error ? err.message : 'Unknown'}`,
      timestamp: Date.now(),
    };
  }
}
