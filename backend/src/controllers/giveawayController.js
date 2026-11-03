import Giveaway from '../models/Giveaway.js';
import Participation from '../models/Participation.js';
import Winner from '../models/Winner.js';
import PrizeClaim from '../models/PrizeClaim.js';

function serializeGiveaway(giveaway) {
  const now = Date.now();
  let status = giveaway.status;
  if (status === 'ACTIVE' && new Date(giveaway.endsAt).getTime() <= now) status = 'ENDED';
  if (status === 'UPCOMING' && new Date(giveaway.endsAt).getTime() <= now) status = 'ENDED';
  else if (status === 'UPCOMING' && new Date(giveaway.startsAt).getTime() <= now) status = 'ACTIVE';
  return {
    id: giveaway.eventId,
    slug: giveaway.slug,
    title: giveaway.title,
    label: giveaway.label,
    description: giveaway.description,
    descriptionLong: giveaway.descriptionLong,
    visual: giveaway.visual,
    value: giveaway.value,
    prizeType: giveaway.prizeType,
    status,
    startsAt: giveaway.startsAt,
    endsAt: giveaway.endsAt,
    drawDate: giveaway.drawAt,
    participants: giveaway.participantCount,
    winners: giveaway.winnerCount,
    fee: giveaway.fee,
    eligibility: giveaway.eligibility,
    rules: giveaway.rules,
    claimDeadlineDays: giveaway.claimDeadlineDays,
  };
}

export async function listGiveaways(req, res, next) {
  try {
    const giveaways = await Giveaway.find({ status: { $in: ['ACTIVE', 'UPCOMING', 'ENDED'] } }).sort({ startsAt: 1 });
    const prizesWon = await Winner.countDocuments({ status: { $in: ['SELECTED', 'CLAIMED'] } });
    return res.json({
      giveaways: giveaways.map(serializeGiveaway),
      stats: {
        giveaways: giveaways.length,
        participants: giveaways.reduce((total, giveaway) => total + giveaway.participantCount, 0),
        prizesWon,
      },
      demo: process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true',
    });
  } catch (error) { return next(error); }
}

export async function getGiveaway(req, res, next) {
  try {
    const giveaway = await Giveaway.findOne({ $or: [{ eventId: req.params.id }, { slug: req.params.id }] });
    if (!giveaway) return res.status(404).json({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway is no longer available.' });
    return res.json({ giveaway: serializeGiveaway(giveaway), demo: process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true' });
  } catch (error) { return next(error); }
}

export async function getMyStatus(req, res, next) {
  try {
    const giveaway = await Giveaway.findOne({ $or: [{ eventId: req.params.id }, { slug: req.params.id }] });
    if (!giveaway) return res.status(404).json({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway is no longer available.' });
    const participation = await Participation.findOne({ giveawayId: giveaway._id, userId: req.user.id }).select('status entryAmount entryCurrency joinedAt');
    const winner = await Winner.findOne({ giveawayId: giveaway._id, userId: req.user.id }).select('status createdAt');
    const claim = winner ? await PrizeClaim.findOne({ giveawayId: giveaway._id, userId: req.user.id }).select('status submittedAt') : null;
    const claimExpired = Boolean(winner && !claim && winner.status === 'EXPIRED');
    if (winner && !claim && !claimExpired && Date.now() > winner.createdAt.getTime() + giveaway.claimDeadlineDays * 24 * 60 * 60 * 1000) {
      winner.status = 'EXPIRED';
      await winner.save();
    }
    return res.json({
      participating: Boolean(participation),
      participationStatus: participation?.status ?? null,
      entryAmount: participation?.entryAmount ?? null,
      entryCurrency: participation?.entryCurrency ?? null,
      joinedAt: participation?.joinedAt ?? null,
      isWinner: Boolean(winner),
      claimStatus: claim?.status ?? (claimExpired || winner?.status === 'EXPIRED' ? 'EXPIRED' : null),
      claimSubmittedAt: claim?.submittedAt ?? null,
    });
  } catch (error) { return next(error); }
}

export async function getPreviousWinners(req, res, next) {
  try {
    const winners = await Winner.find({ selectionMethod: { $in: ['AUTHORIZED_DRAW', 'DEMO_HISTORY'] } })
      .sort({ date: -1 }).limit(50).select('publicUserId prize event date status');
    return res.json({
      winners: winners.map((winner) => ({
        userId: winner.publicUserId,
        prize: winner.prize,
        event: winner.event,
        date: winner.date,
        status: winner.status,
      })),
      demo: process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true',
    });
  } catch (error) { return next(error); }
}

export async function getWinners(req, res, next) {
  try {
    const giveaway = await Giveaway.findOne({ $or: [{ eventId: req.params.id }, { slug: req.params.id }] });
    if (!giveaway) return res.status(404).json({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway is no longer available.' });
    if (!giveaway.winnersFinalizedAt) return res.json({ status: 'PENDING', winners: [] });
    const winners = await Winner.find({ giveawayId: giveaway._id }).select('publicUserId prize event date status');
    return res.json({
      status: 'FINALIZED',
      winners: winners.map((winner) => ({ userId: winner.publicUserId, prize: winner.prize, event: winner.event, date: winner.date, status: winner.status })),
    });
  } catch (error) { return next(error); }
}
