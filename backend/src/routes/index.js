import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { currentUser, login, signup } from '../controllers/authController.js';
import { getGiveaway, getMyStatus, getPreviousWinners, getWinners, listGiveaways } from '../controllers/giveawayController.js';
import { join } from '../controllers/participationController.js';
import { getMyClaim, listAdminClaims, selectWinners, submitClaim } from '../controllers/winnerController.js';
import { getAdminClaim, updateAdminClaimStatus } from '../controllers/winnerController.js';
import { createGiveaway, listAdminGiveaways, updateGiveawayStatus } from '../controllers/adminGiveawayController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait and try again.' } });
const joinLimiter = rateLimit({ windowMs: 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { code: 'RATE_LIMITED', message: 'Please wait a moment before trying again.' } });
const claimLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { code: 'RATE_LIMITED', message: 'Please wait a moment before trying again.' } });

router.post('/auth/signup', authLimiter, signup);
router.post('/auth/login', authLimiter, login);
router.get('/auth/me', requireAuth, currentUser);
router.get('/giveaways', listGiveaways);
router.get('/giveaways/previous/winners', getPreviousWinners);
router.get('/giveaways/:id/my-status', requireAuth, getMyStatus);
router.get('/giveaways/:id/winners', getWinners);
router.get('/giveaways/:id/my-claim', requireAuth, getMyClaim);
router.get('/admin/giveaways', requireAuth, requireAdmin, listAdminGiveaways);
router.get('/admin/claims', requireAuth, requireAdmin, listAdminClaims);
router.get('/giveaways/:id', getGiveaway);
router.get('/giveaways/slug/:id', getGiveaway);
router.post('/giveaways/:id/join', requireAuth, joinLimiter, join);
router.post('/giveaways/:id/claim', requireAuth, claimLimiter, submitClaim);
router.get('/admin/claims/:claimId', requireAuth, requireAdmin, getAdminClaim);
router.patch('/admin/claims/:claimId/status', requireAuth, requireAdmin, updateAdminClaimStatus);
router.post('/admin/giveaways', requireAuth, requireAdmin, createGiveaway);
router.patch('/admin/giveaways/:id/status', requireAuth, requireAdmin, updateGiveawayStatus);
router.post('/admin/giveaways/:id/select-winners', requireAuth, requireAdmin, selectWinners);

export default router;
