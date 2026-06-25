/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../services/db';
import { ReportStatus } from '../../shared/types';

export async function submitReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const reporterId = req.userId!;
  const { reportedUserId, reportedActivityId, reason } = req.body;

  try {
    const report = db.reports.save({
      reporterId,
      reportedUserId: reportedUserId || null,
      reportedActivityId: reportedActivityId || null,
      reason,
      status: ReportStatus.PENDING
    });

    res.status(210).json({
      success: true,
      message: 'Report submitted successfully. Thank you for keeping our community safe!',
      report
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
}
