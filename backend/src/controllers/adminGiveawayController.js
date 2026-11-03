import Giveaway from '../models/Giveaway.js';
import AuditLog from '../models/AuditLog.js';
import { adminGiveawaySchema, adminStatusSchema } from '../validators/schemas.js';

export async function listAdminGiveaways(req, res, next) {
  try {
    const giveaways = await Giveaway.find().sort({ startsAt: -1 }).select(
      'eventId slug title status startsAt endsAt drawAt fee winnerCount participantCount winnersFinalizedAt',
    );
    return res.json({
      giveaways: giveaways.map((giveaway) => ({
        id: giveaway.eventId,
        slug: giveaway.slug,
        title: giveaway.title,
        status: giveaway.status,
        startsAt: giveaway.startsAt,
        endsAt: giveaway.endsAt,
        drawAt: giveaway.drawAt,
        fee: giveaway.fee,
        winners: giveaway.winnerCount,
        participants: giveaway.participantCount,
        winnersFinalized: Boolean(giveaway.winnersFinalizedAt),
      })),
    });
  } catch (error) { return next(error); }
}

export async function createGiveaway(req, res, next) {
  try {
    const configuration = adminGiveawaySchema.parse(req.body);
    if (configuration.status === 'ACTIVE' && (configuration.startsAt > new Date() || configuration.endsAt <= new Date())) {
      return res.status(400).json({ code: 'INVALID_GIVEAWAY_DATES', message: 'An active giveaway must be within its configured start and end dates.' });
    }
    const giveaway = await Giveaway.create({
      ...configuration,
      participantCount: 0,
      participationSettings: { onePerUser: true, allowReentry: false },
    });
    await AuditLog.create({ userId: req.user.id, action: 'GIVEAWAY_CREATED', giveawayId: giveaway.id, result: 'SUCCESS', requestId: req.requestId });
    return res.status(201).json({ giveaway: { id: giveaway.eventId, slug: giveaway.slug, status: giveaway.status } });
  } catch (error) { return next(error); }
}

export async function updateGiveawayStatus(req, res, next) {
  try {
    const { status } = adminStatusSchema.parse(req.body);
    const giveaway = await Giveaway.findOne({ $or: [{ eventId: req.params.id }, { slug: req.params.id }] });
    if (!giveaway) return res.status(404).json({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway is no longer available.' });
    const allowedTransitions = {
      UPCOMING: ['ACTIVE'],
      ACTIVE: ['ENDED'],
      ENDED: ['ARCHIVED'],
      ARCHIVED: [],
    };
    if (!allowedTransitions[giveaway.status].includes(status)) {
      return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: 'This giveaway cannot move to that status.' });
    }
    if (status === 'ACTIVE' && (giveaway.startsAt > new Date() || giveaway.endsAt <= new Date())) {
      return res.status(409).json({ code: 'INVALID_GIVEAWAY_DATES', message: 'This giveaway is outside its scheduled participation window.' });
    }
    if (status === 'ENDED' && giveaway.endsAt > new Date()) {
      return res.status(409).json({ code: 'GIVEAWAY_NOT_ENDED', message: 'This giveaway cannot be ended before its scheduled end time.' });
    }
    if (status === 'ARCHIVED' && !giveaway.winnersFinalizedAt) {
      return res.status(409).json({ code: 'WINNERS_NOT_FINALIZED', message: 'Winners must be finalized before this giveaway is archived.' });
    }
    giveaway.status = status;
    await giveaway.save();
    await AuditLog.create({ userId: req.user.id, action: 'GIVEAWAY_STATUS_CHANGED', giveawayId: giveaway.id, result: status, requestId: req.requestId });
    return res.json({ giveaway: { id: giveaway.eventId, status: giveaway.status } });
  } catch (error) { return next(error); }
}
