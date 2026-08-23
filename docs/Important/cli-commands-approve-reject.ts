// packages/cli/src/commands/approve.ts
// Wire §9: Approval command business logic (decoupled from CLI)

import type { ApprovalHandler } from '../types';
import { logger } from '../utils/logger';
import { validateApprovalId } from '../handlers/validation';
import { getApprovalState, updateApprovalStatus } from '../handlers/db';
import { findEventByIdempotencyKey, emitApprovalEvent } from '../handlers/events';
import { emitSignal } from '../handlers/signals';

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
  details?: Record<string, any>;
}

/**
 * Core approval handler
 * 
 * Wire §9: Approval workflow
 * - Validates approval ID
 * - Checks state machine guards (not already approved)
 * - Handles idempotency (prevents duplicates)
 * - Persists to database
 * - Emits events for metrics pipeline
 * - Signals R3 v4 DAW for state updates
 */
export async function approveApproval(
  options: ApproveOptions
): Promise<ApproveResult> {
  const startTime = Date.now();

  // Guard 1: Validate input
  const validation = validateApprovalId(options.approvalId);
  if (!validation.valid) {
    return {
      success: false,
      approvalId: options.approvalId || 'UNKNOWN',
      status: 'ERROR',
      message: validation.error,
      timestamp: Date.now(),
    };
  }

  try {
    // Guard 2: Verify approval exists (404)
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

    // Guard 3: Check state machine — cannot re-approve (409)
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

    // Guard 4: Idempotency — check if this exact request already processed
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

    // Execute: Update approval status
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

    // Emit: Event for metrics pipeline
    try {
      await emitApprovalEvent('APPROVAL_CONFIRMED', {
        approvalId: options.approvalId,
        timestamp: Date.now(),
        idempotencyKey: options.idempotencyKey,
        resource: existing.resource,
      });
    } catch (err) {
      logger.error(`Failed to emit approval event: ${err}`);
      // Don't fail the approval, but log the error
    }

    // Signal: Notify R3 v4 DAW
    try {
      emitSignal('DAW_APPROVAL_CONFIRMED', {
        approvalId: options.approvalId,
        resource: existing.resource,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error(`Failed to emit DAW signal: ${err}`);
      // Don't fail the approval
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

// ============================================================================

// packages/cli/src/commands/reject.ts

export interface RejectOptions {
  approvalId: string;
  reason: string;
}

export interface RejectResult {
  success: boolean;
  approvalId: string;
  status: 'REJECTED' | 'ERROR';
  message: string;
  timestamp: number;
  details?: Record<string, any>;
}

/**
 * Core rejection handler
 * Same guards as approve, but sets status to REJECTED
 */
export async function rejectApproval(
  options: RejectOptions
): Promise<RejectResult> {
  const startTime = Date.now();

  // Validate input
  const validation = validateApprovalId(options.approvalId);
  if (!validation.valid) {
    return {
      success: false,
      approvalId: options.approvalId || 'UNKNOWN',
      status: 'ERROR',
      message: validation.error,
      timestamp: Date.now(),
    };
  }

  if (!options.reason || options.reason.trim().length === 0) {
    return {
      success: false,
      approvalId: options.approvalId,
      status: 'ERROR',
      message: 'Rejection reason is required',
      timestamp: Date.now(),
    };
  }

  try {
    // Verify approval exists
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

    // Check state machine — cannot reject already-approved/rejected
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

    // Execute: Update status to REJECTED
    const rejected = await updateApprovalStatus(options.approvalId, 'REJECTED', {
      rejectionReason: options.reason,
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

    // Emit event
    try {
      await emitApprovalEvent('APPROVAL_REJECTED', {
        approvalId: options.approvalId,
        reason: options.reason,
        timestamp: Date.now(),
        resource: existing.resource,
      });
    } catch (err) {
      logger.error(`Failed to emit rejection event: ${err}`);
    }

    // Signal R3 v4
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
