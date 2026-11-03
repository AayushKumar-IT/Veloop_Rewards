import { joinSchema } from '../validators/schemas.js';
import { joinGiveaway } from '../services/participationService.js';
import AuditLog from '../models/AuditLog.js';

export async function join(req, res, next) {
  try {
    joinSchema.parse(req.body);
    const idempotencyKey = req.get('idempotency-key');
    if (!idempotencyKey || idempotencyKey.length > 120) {
      return res.status(400).json({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Please retry this action.' });
    }
    const result = await joinGiveaway({
      user: req.user,
      giveawayKey: req.params.id,
      requestId: req.requestId,
      idempotencyKey,
      deviceId: req.get('x-device-id'),
    });
    return res.status(result.replayed ? 200 : 201).json({
      success: true,
      participation: {
        status: result.participation.status,
        entryAmount: result.participation.entryAmount,
        entryCurrency: result.participation.entryCurrency,
        joinedAt: result.participation.joinedAt,
      },
      replayed: result.replayed,
      message: 'Your participation has been recorded.',
    });
  } catch (error) {
    if (req.user && error.statusCode) {
      await AuditLog.create({
        userId: req.user.id,
        action: error.codeName === 'ALREADY_PARTICIPATING' ? 'DUPLICATE_ATTEMPT' : 'JOIN_REJECTED',
        result: error.codeName ?? 'REJECTED',
        requestId: req.requestId,
      });
    }
    return next(error);
  }
}
