import mongoose from 'mongoose';
import Giveaway from '../models/Giveaway.js';
import Participation from '../models/Participation.js';
import Winner from '../models/Winner.js';
import AuditLog from '../models/AuditLog.js';
import { chooseRandomWinners } from './participationService.js';
import { maskUserId } from './security.js';

export async function finalizeWinners(giveawayKey, requestId, adminId) {
  const giveaway = await Giveaway.findOne({ $or: [{ eventId: giveawayKey }, { slug: giveawayKey }] });
  if (!giveaway) throw Object.assign(new Error('This giveaway is no longer available.'), { statusCode: 404, codeName: 'GIVEAWAY_NOT_FOUND' });
  if (giveaway.endsAt > new Date()) throw Object.assign(new Error('Winners can only be selected after the giveaway ends.'), { statusCode: 409, codeName: 'GIVEAWAY_NOT_ENDED' });
  if (giveaway.winnersFinalizedAt) throw Object.assign(new Error('Winners have already been finalized.'), { statusCode: 409, codeName: 'WINNERS_ALREADY_FINALIZED' });
  const participants = await Participation.find({ giveawayId: giveaway.id, status: 'CONFIRMED' }).select('userId');
  if (!participants.length) throw Object.assign(new Error('There are no eligible participants for this draw.'), { statusCode: 409, codeName: 'NO_ELIGIBLE_PARTICIPANTS' });
  const selected = chooseRandomWinners(participants, giveaway.winnerCount);
  const session = await mongoose.startSession();
  let winners;
  try {
    await session.withTransaction(async () => {
      const updated = await Giveaway.findOneAndUpdate(
        { _id: giveaway.id, winnersFinalizedAt: null, endsAt: { $lte: new Date() } },
        { $set: { status: 'ENDED', winnersFinalizedAt: new Date() } },
        { new: true, session },
      );
      if (!updated) throw Object.assign(new Error('Winners have already been finalized.'), { statusCode: 409, codeName: 'WINNERS_ALREADY_FINALIZED' });
      winners = await Winner.create(selected.map((participant) => ({
        giveawayId: giveaway.id,
        userId: participant.userId,
        publicUserId: maskUserId(participant.userId),
        prize: giveaway.title,
        event: giveaway.title,
        date: new Date(),
        selectionMethod: 'AUTHORIZED_DRAW',
      })), { session });
      await AuditLog.create([{
        userId: adminId, action: 'WINNER_SELECTED', giveawayId: giveaway.id,
        result: `FINALIZED_${winners.length}`, requestId,
      }], { session });
    });
  } finally { await session.endSession(); }
  return winners;
}
