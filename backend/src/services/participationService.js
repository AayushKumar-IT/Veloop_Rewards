import { randomInt } from 'node:crypto';
import mongoose from 'mongoose';
import Giveaway from '../models/Giveaway.js';
import User from '../models/User.js';
import Participation from '../models/Participation.js';
import EntryTransaction from '../models/EntryTransaction.js';
import FraudEvent from '../models/FraudEvent.js';
import AuditLog from '../models/AuditLog.js';
import { hashDeviceId, maskUserId } from './security.js';

function apiError(statusCode, codeName, message) {
  return Object.assign(new Error(message), { statusCode, codeName });
}

export async function joinGiveaway({ user, giveawayKey, requestId, idempotencyKey, deviceId }) {
  if (!user.isEligible) throw apiError(403, 'PARTICIPATION_BLOCKED', 'This account is not currently eligible to participate.');
  const replay = await Participation.findOne({ userId: user.id, idempotencyKey });
  if (replay) {
    if (String(replay.giveawayId) !== String(await Giveaway.findOne({ $or: [{ eventId: giveawayKey }, { slug: giveawayKey }] }).select('_id').then((doc) => doc?._id))) {
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'This participation request has already been used.');
    }
    return { participation: replay, replayed: true };
  }

  const giveaway = await Giveaway.findOne({ $or: [{ eventId: giveawayKey }, { slug: giveawayKey }] });
  if (!giveaway) throw apiError(404, 'GIVEAWAY_NOT_FOUND', 'This giveaway is no longer available.');
  const now = new Date();
  if (giveaway.startsAt > now) throw apiError(409, 'GIVEAWAY_NOT_ACTIVE', 'This giveaway has not started yet.');
  if (!['ACTIVE', 'UPCOMING'].includes(giveaway.status) || giveaway.endsAt <= now) throw apiError(409, 'GIVEAWAY_ENDED', 'This giveaway has ended. Check out the winners and get ready for the next reward.');

  const alreadyJoined = await Participation.exists({ userId: user.id, giveawayId: giveaway.id });
  if (alreadyJoined) throw apiError(409, 'ALREADY_PARTICIPATING', 'You are already participating in this giveaway.');

  const deviceHash = hashDeviceId(deviceId);
  if (deviceHash) {
    const otherAccount = await Participation.exists({ giveawayId: giveaway.id, userId: { $ne: user.id }, deviceHash });
    if (otherAccount) {
      await FraudEvent.create({
        userId: user.id, giveawayId: giveaway.id, deviceHash, riskScore: 35,
        reason: 'A device signal is shared by multiple accounts and requires review.',
        signals: ['SHARED_DEVICE_SIGNAL'], action: 'REVIEW_REQUIRED', requestId,
      });
    }
  }

  const session = await mongoose.startSession();
  let participation;
  try {
    await session.withTransaction(async () => {
      const transactionTime = new Date();
      const liveGiveaway = await Giveaway.findOneAndUpdate({
        _id: giveaway.id,
        status: { $in: ['ACTIVE', 'UPCOMING'] },
        startsAt: { $lte: transactionTime },
        endsAt: { $gt: transactionTime },
      }, { $set: { status: 'ACTIVE' } }, { new: true, session });
      if (!liveGiveaway) throw apiError(409, 'GIVEAWAY_NOT_ACTIVE', 'This giveaway is no longer accepting entries.');
      const fee = liveGiveaway.fee;
      const balanceField = `balances.${fee.currency}`;
      const account = await User.findOneAndUpdate(
        { _id: user.id, [balanceField]: { $gte: fee.amount } },
        { $inc: { [balanceField]: -fee.amount } },
        { new: false, session },
      );
      if (!account) {
        const latest = await User.findById(user.id).session(session).select('balances');
        const code = fee.currency === 'VES' ? 'INSUFFICIENT_VE_BALANCE'
          : fee.currency === 'SVES' ? 'INSUFFICIENT_SVE_BALANCE' : 'INSUFFICIENT_TOKEN_BALANCE';
        const missing = fee.amount - Number(latest?.balances?.[fee.currency] ?? 0);
        throw apiError(409, code, `Not enough ${fee.currency}. You need ${Math.max(0, missing)} more to join this giveaway.`);
      }
      const balanceBefore = Number(account.balances?.[fee.currency] ?? 0);
      const balanceAfter = balanceBefore - fee.amount;
      [participation] = await Participation.create([{
        userId: user.id,
        giveawayId: liveGiveaway.id,
        entryCurrency: fee.currency,
        entryAmount: fee.amount,
        deviceHash,
        idempotencyKey,
        status: 'CONFIRMED',
      }], { session });
      await EntryTransaction.create([{
        userId: user.id,
        giveawayId: liveGiveaway.id,
        participationId: participation.id,
        currency: fee.currency,
        amount: fee.amount,
        type: 'GIVEAWAY_ENTRY',
        status: 'SUCCESS',
        balanceBefore,
        balanceAfter,
        requestId,
      }], { session });
      await Giveaway.updateOne({ _id: liveGiveaway.id }, { $inc: { participantCount: 1 } }, { session });
      await AuditLog.create([{
        userId: user.id, action: 'JOIN_GIVEAWAY', giveawayId: liveGiveaway.id,
        amount: fee.amount, currency: fee.currency,
        result: 'SUCCESS', requestId,
      }], { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } catch (error) {
    if (error.code === 11000) throw apiError(409, 'ALREADY_PARTICIPATING', 'You are already participating in this giveaway.');
    throw error;
  } finally {
    await session.endSession();
  }
  return { participation, replayed: false, maskedId: maskUserId(user.id) };
}

export function chooseRandomWinners(participants, winnerCount) {
  const pool = [...participants];
  const selected = [];
  const count = Math.min(winnerCount, pool.length);
  for (let index = 0; index < count; index += 1) {
    const chosenIndex = randomInt(pool.length);
    selected.push(pool[chosenIndex]);
    pool.splice(chosenIndex, 1);
  }
  return selected;
}
