import Giveaway from '../models/Giveaway.js';
import Winner from '../models/Winner.js';
import AuditLog from '../models/AuditLog.js';
import PrizeClaim from '../models/PrizeClaim.js';
import { decryptClaimDetails, encryptClaimDetails } from '../services/security.js';
import { adminClaimStatusSchema, parseClaimDetails } from '../validators/schemas.js';
import { finalizeWinners } from '../services/winnerService.js';

export async function submitClaim(req, res, next) {
  try {
    const giveaway = await Giveaway.findOne({ $or: [{ eventId: req.params.id }, { slug: req.params.id }] });
    if (!giveaway) return res.status(404).json({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway is no longer available.' });
    const winner = await Winner.findOne({ giveawayId: giveaway.id, userId: req.user.id });
    if (!winner || !giveaway.winnersFinalizedAt) return res.status(403).json({ code: 'CLAIM_NOT_ALLOWED', message: 'This prize claim is not available for this account.' });
    const claimDeadline = new Date(winner.createdAt.getTime() + giveaway.claimDeadlineDays * 24 * 60 * 60 * 1000);
    if (claimDeadline < new Date()) {
      await Winner.updateOne({ _id: winner.id }, { $set: { status: 'EXPIRED' } });
      return res.status(410).json({ code: 'CLAIM_EXPIRED', message: 'The claim window for this prize has ended.' });
    }
    const existing = await PrizeClaim.exists({ winnerId: winner.id });
    if (existing) return res.status(409).json({ code: 'CLAIM_ALREADY_SUBMITTED', message: 'Your claim has already been submitted.' });
    const details = parseClaimDetails(giveaway.prizeType, req.body);
    const encryptedDetails = encryptClaimDetails(details);
    const claim = await PrizeClaim.create({
      winnerId: winner.id,
      userId: req.user.id,
      giveawayId: giveaway.id,
      encryptedDetails,
    });
    await AuditLog.create({
      userId: req.user.id, action: 'CLAIM_SUBMITTED', giveawayId: giveaway.id,
      result: 'SUCCESS', requestId: req.requestId,
    });
    return res.status(201).json({ success: true, claim: { status: claim.status, submittedAt: claim.submittedAt } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ code: 'CLAIM_ALREADY_SUBMITTED', message: 'Your claim has already been submitted.' });
    }
    return next(error);
  }
}

export async function getMyClaim(req, res, next) {
  try {
    const giveaway = await Giveaway.findOne({ $or: [{ eventId: req.params.id }, { slug: req.params.id }] });
    if (!giveaway) return res.status(404).json({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway is no longer available.' });
    const winner = await Winner.findOne({ giveawayId: giveaway.id, userId: req.user.id });
    if (!winner) return res.status(403).json({ code: 'CLAIM_NOT_ALLOWED', message: 'This prize claim is not available for this account.' });
    const claim = await PrizeClaim.findOne({ winnerId: winner.id }).select('status submittedAt');
    return res.json({ claim: claim ? { status: claim.status, submittedAt: claim.submittedAt } : null });
  } catch (error) { return next(error); }
}

export async function selectWinners(req, res, next) {
  try {
    const winners = await finalizeWinners(req.params.id, req.requestId, req.user.id);
    return res.status(201).json({ winners: winners.map((winner) => ({ userId: winner.publicUserId, prize: winner.prize, date: winner.date })) });
  } catch (error) { return next(error); }
}

export async function getAdminClaim(req, res, next) {
  try {
    const claim = await PrizeClaim.findById(req.params.claimId).select('+encryptedDetails');
    if (!claim) return res.status(404).json({ code: 'CLAIM_NOT_FOUND', message: 'This prize claim is no longer available.' });
    const details = decryptClaimDetails(claim.encryptedDetails);
    await AuditLog.create({
      userId: req.user.id, action: 'CLAIM_DETAILS_ACCESSED', giveawayId: claim.giveawayId,
      result: 'AUTHORIZED_ADMIN', requestId: req.requestId,
    });
    return res.json({ claim: { id: claim.id, status: claim.status, submittedAt: claim.submittedAt, details } });
  } catch (error) { return next(error); }
}

export async function listAdminClaims(req, res, next) {
  try {
    const claims = await PrizeClaim.find()
      .sort({ submittedAt: -1 })
      .limit(100)
      .populate('giveawayId', 'title eventId')
      .select('status submittedAt giveawayId');
    return res.json({
      claims: claims.map((claim) => ({
        id: claim.id,
        status: claim.status,
        submittedAt: claim.submittedAt,
        giveaway: claim.giveawayId?.title ?? 'Removed giveaway',
        eventId: claim.giveawayId?.eventId ?? null,
      })),
    });
  } catch (error) { return next(error); }
}

export async function updateAdminClaimStatus(req, res, next) {
  try {
    const { status } = adminClaimStatusSchema.parse(req.body);
    const claim = await PrizeClaim.findById(req.params.claimId);
    if (!claim) return res.status(404).json({ code: 'CLAIM_NOT_FOUND', message: 'This prize claim is no longer available.' });
    if (claim.status !== 'SUBMITTED' && !(claim.status === 'PROCESSING' && status === 'COMPLETED')) {
      return res.status(409).json({ code: 'INVALID_CLAIM_TRANSITION', message: 'This claim cannot move to that status.' });
    }
    claim.status = status;
    await claim.save();
    if (status === 'COMPLETED') {
      await Winner.updateOne({ _id: claim.winnerId }, { $set: { status: 'CLAIMED' } });
    }
    await AuditLog.create({
      userId: req.user.id, action: 'CLAIM_STATUS_CHANGED', giveawayId: claim.giveawayId,
      result: status, requestId: req.requestId,
    });
    return res.json({ claim: { id: claim.id, status: claim.status } });
  } catch (error) { return next(error); }
}
