#!/usr/bin/env node
import { Command } from 'commander';
import { approveApproval, type ApproveOptions } from './commands/approve.js';
import { rejectApproval, type RejectOptions } from './commands/reject.js';
import { logger } from './utils/logger.js';
import { getMetrics } from './handlers/signals.js';
import { closeDb } from './handlers/db.js';
import { closeEventDb } from './handlers/events.js';

const program = new Command();

program
  .name('agent-os')
  .description('Agent-OS CLI — AI agent runtime infrastructure')
  .version('3.0.0');

program
  .command('approve')
  .description('Approve a pending approval')
  .requiredOption('-i, --id <approvalId>', 'Approval request ID')
  .option('-n, --note <note>', 'Optional approval note')
  .action(async (options) => {
    try {
      const result = await approveApproval({
        approvalId: options.id,
        note: options.note,
      } as ApproveOptions);

      if (result.success) {
        console.log(`✓ Approved: ${result.approvalId}`);
        if (result.message) console.log(`  ${result.message}`);
      } else {
        console.error(`✗ Failed: ${result.message || 'Unknown error'}`);
        process.exit(1);
      }
    } catch (err) {
      logger.error('Approve failed', { error: (err as Error).message });
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('reject')
  .description('Reject a pending request')
  .requiredOption('-i, --id <approvalId>', 'Approval request ID')
  .option('-r, --reason <reason>', 'Rejection reason')
  .option('-n, --note <note>', 'Optional note')
  .action(async (options) => {
    try {
      const result = await rejectApproval({
        approvalId: options.id,
        reason: options.reason || options.note,
        note: options.note,
      } as RejectOptions);

      if (result.success) {
        console.log(`✓ Rejected: ${result.approvalId}`);
        if (result.message) console.log(`  ${result.message}`);
      } else {
        console.error(`✗ Failed: ${result.message || 'Unknown error'}`);
        process.exit(1);
      }
    } catch (err) {
      logger.error('Reject failed', { error: (err as Error).message });
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show system status')
  .action(() => {
    const m = getMetrics();
    console.log('Agent-OS Status');
    console.log('================');
    console.log(`Approved: ${m.approvalsApproved}`);
    console.log(`Rejected: ${m.approvalsRejected}`);
    console.log(`Signals:  ${m.signalsEmitted}`);
  });

process.on('SIGINT', () => { closeDb(); closeEventDb(); process.exit(0); });

program.parse();
