// Fraud routes — check, store signals, flagged transactions admin, stats
import { Router, Request, Response, NextFunction } from 'express';
import { fraudCheckHandler, storeFraudSignalsHandler } from '../handlers/fraud.handler';
import { db } from '@settlr/database';
import { logger } from '@settlr/logger';

export const fraudRouter = Router();

// POST /fraud/check — synchronous fraud scoring
fraudRouter.post('/check', fraudCheckHandler);

// POST /fraud/signals — store signals after transaction created
fraudRouter.post('/signals', storeFraudSignalsHandler);

// GET /fraud/flagged — List transactions with fraud_score > 0 or fraud_action = 'review'/'challenge'/'decline'
fraudRouter.get('/flagged', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db('transactions as t')
      .leftJoin('fraud_signals as fs', 't.id', 'fs.transaction_id')
      .leftJoin('accounts as fa', 't.from_account_id', 'fa.id')
      .leftJoin('accounts as ta', 't.to_account_id', 'ta.id')
      .leftJoin('users as fu', 'fa.user_id', 'fu.id')
      .leftJoin('users as tu', 'ta.user_id', 'tu.id')
      .select(
        't.id',
        't.from_account_id as fromAccountId',
        't.to_account_id as toAccountId',
        't.amount',
        't.currency',
        't.status',
        't.fraud_score as fraudScore',
        't.fraud_action as fraudAction',
        't.created_at as createdAt',
        'fu.email as fromUserName',
        'tu.email as toUserName',
        db.raw("COALESCE(json_agg(json_build_object('ruleName', fs.rule_name, 'scoreAdded', fs.score_added, 'signalData', fs.signal_data)) FILTER (WHERE fs.id IS NOT NULL), '[]') as signals")
      )
      .where(function() {
        this.where('t.fraud_score', '>', 0)
          .orWhereIn('t.fraud_action', ['review', 'challenge', 'decline']);
      })
      .groupBy('t.id', 'fa.id', 'ta.id', 'fu.id', 'tu.id')
      .orderBy('t.created_at', 'desc')
      .limit(50);

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('flagged_list_error', { error: (err as Error).message });
    // Return empty on error so UI doesn't crash
    res.json({ success: true, data: [] });
  }
});

// GET /fraud/stats — Aggregate fraud statistics
fraudRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [stats] = await db('transactions')
      .select(
        db.raw('COUNT(*) FILTER (WHERE fraud_score > 0) as "totalFlagged"'),
        db.raw('AVG(fraud_score) FILTER (WHERE fraud_score > 0) as "avgRiskScore"'),
        db.raw("SUM(amount) FILTER (WHERE fraud_action = 'decline') as \"blockedAmountPaise\""),
        db.raw("COUNT(*) FILTER (WHERE fraud_action = 'approve' AND fraud_score > 30) as \"falsePositives\""),
        db.raw('COUNT(*) FILTER (WHERE fraud_score > 30) as "totalReviewed"')
      );

    const totalReviewed = parseInt(stats.totalReviewed) || 0;
    const falsePositives = parseInt(stats.falsePositives) || 0;

    res.json({
      success: true,
      data: {
        totalFlagged: parseInt(stats.totalFlagged) || 0,
        falsePositiveRate: totalReviewed > 0 ? Math.round((falsePositives / totalReviewed) * 100) : 0,
        avgRiskScore: Math.round(parseFloat(stats.avgRiskScore) || 0),
        blockedAmountPaise: parseInt(stats.blockedAmountPaise) || 0,
      },
    });
  } catch (err) {
    logger.error('fraud_stats_error', { error: (err as Error).message });
    res.json({
      success: true,
      data: { totalFlagged: 0, falsePositiveRate: 0, avgRiskScore: 0, blockedAmountPaise: 0 },
    });
  }
});

// POST /fraud/flagged/:id/approve — Mark a flagged transaction as approved
fraudRouter.post('/flagged/:id/approve', async (req: Request, res: Response) => {
  try {
    await db('transactions').where({ id: req.params.id }).update({
      fraud_action: 'approve',
      status: 'completed',
      updated_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('fraud_approve_error', { id: req.params.id, error: (err as Error).message });
    res.status(500).json({ success: false, error: 'APPROVE_FAILED' });
  }
});

// POST /fraud/flagged/:id/block — Block a flagged transaction
fraudRouter.post('/flagged/:id/block', async (req: Request, res: Response) => {
  try {
    await db('transactions').where({ id: req.params.id }).update({
      fraud_action: 'decline',
      status: 'failed',
      failure_reason: 'Blocked by admin — fraud review',
      updated_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('fraud_block_error', { id: req.params.id, error: (err as Error).message });
    res.status(500).json({ success: false, error: 'BLOCK_FAILED' });
  }
});
