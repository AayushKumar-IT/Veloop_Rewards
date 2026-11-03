import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import Giveaway from '../src/models/Giveaway.js';
import Participation from '../src/models/Participation.js';
import EntryTransaction from '../src/models/EntryTransaction.js';
import Winner from '../src/models/Winner.js';
import PrizeClaim from '../src/models/PrizeClaim.js';
import AuditLog from '../src/models/AuditLog.js';

test('MongoDB account, entry, draw, and claim lifecycle', {
  timeout: 60000,
  skip: !process.env.MONGO_URI,
}, async () => {
  assert.ok(process.env.JWT_SECRET, 'Set JWT_SECRET in backend/.env to run integration tests.');
  assert.ok(process.env.CLAIM_ENCRYPTION_KEY, 'Set CLAIM_ENCRYPTION_KEY in backend/.env to run integration tests.');

  await mongoose.connect(process.env.MONGO_URI);
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const marker = `integration-${crypto.randomUUID()}`;
  const password = `Integration-${crypto.randomUUID()}!`;
  const email = `${marker}@example.test`;
  const adminEmail = `admin-${marker}@example.test`;
  const eventId = `GW-${marker}`;
  const slug = marker;
  let participant;
  let admin;
  let giveaway;
  let adminCreatedGiveawayId;
  let stage = 'signup';

  async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  try {
    const signupResponse = await request('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Integration Participant', email, password },
    });
    assert.equal(signupResponse.status, 201);
    const signup = await signupResponse.json();
    assert.equal(signup.user.balances.VES, 850);

    const loginResponse = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();

    const now = new Date();
    const startsAt = new Date(now.getTime() - 60_000);
    const endsAt = new Date(now.getTime() + 60 * 60_000);
    participant = await User.findOne({ email });
    admin = await User.create({
      name: 'Integration Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 4),
      role: 'ADMIN',
    });
    giveaway = await Giveaway.create({
      eventId,
      slug,
      title: 'Integration Test Reward',
      label: 'TEST',
      description: 'Temporary integration test giveaway.',
      descriptionLong: 'Temporary integration test giveaway.',
      visual: 'voucher',
      value: 'Test',
      prizeType: 'DIGITAL',
      status: 'ACTIVE',
      fee: { currency: 'VES', amount: 25 },
      winnerCount: 1,
      participantCount: 0,
      startsAt,
      endsAt,
      drawAt: endsAt,
      eligibility: 'Integration test account.',
      rules: [],
    });

    const adminLoginResponse = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password },
    });
    assert.equal(adminLoginResponse.status, 200);
    const adminLogin = await adminLoginResponse.json();
    assert.equal(adminLogin.user.role, 'ADMIN');

    stage = 'admin giveaway creation';
    const adminGiveawayResponse = await request('/api/admin/giveaways', {
      method: 'POST',
      token: adminLogin.token,
      body: {
        eventId: `${eventId}-ADMIN`,
        slug: `${slug}-admin`,
        title: 'Admin Created Integration Reward',
        label: 'TEST',
        description: 'Created through the admin endpoint.',
        descriptionLong: 'Created through the admin endpoint.',
        visual: 'voucher',
        value: 'Test',
        prizeType: 'DIGITAL',
        status: 'UPCOMING',
        fee: { currency: 'VES', amount: 5 },
        winnerCount: 1,
        startsAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
        endsAt: new Date(now.getTime() + 2 * 60 * 60_000).toISOString(),
        drawAt: new Date(now.getTime() + 2 * 60 * 60_000).toISOString(),
        eligibility: 'Integration test account.',
        rules: ['One entry per account.'],
      },
    });
    assert.equal(adminGiveawayResponse.status, 201);
    const createdAdminGiveaway = await adminGiveawayResponse.json();
    adminCreatedGiveawayId = createdAdminGiveaway.giveaway.id;

    const adminListResponse = await request('/api/admin/giveaways', { token: adminLogin.token });
    assert.equal(adminListResponse.status, 200);
    const adminList = await adminListResponse.json();
    assert.equal(adminList.giveaways.some((entry) => entry.id === adminCreatedGiveawayId), true);

    const joinHeaders = {
      'Idempotency-Key': crypto.randomUUID(),
      'X-Device-ID': crypto.randomUUID(),
    };
    stage = 'first entry';
    const joinResponse = await request(`/api/giveaways/${eventId}/join`, {
      method: 'POST',
      body: {},
      token: login.token,
      headers: joinHeaders,
    });
    assert.equal(joinResponse.status, 201);

    const replayResponse = await request(`/api/giveaways/${eventId}/join`, {
      method: 'POST',
      body: {},
      token: login.token,
      headers: joinHeaders,
    });
    assert.equal(replayResponse.status, 200);
    assert.equal((await replayResponse.json()).replayed, true);

    const duplicateResponse = await request(`/api/giveaways/${eventId}/join`, {
      method: 'POST',
      body: {},
      token: login.token,
      headers: { ...joinHeaders, 'Idempotency-Key': crypto.randomUUID() },
    });
    assert.equal(duplicateResponse.status, 409);

    stage = 'balance and participation verification';
    const profileResponse = await request('/api/auth/me', { token: login.token });
    const profile = await profileResponse.json();
    assert.equal(profile.user.balances.VES, 825);
    assert.equal(await Participation.countDocuments({ userId: participant.id, giveawayId: giveaway.id }), 1);
    assert.equal(await EntryTransaction.countDocuments({ userId: participant.id, giveawayId: giveaway.id }), 1);
    const participationStatusResponse = await request(`/api/giveaways/${eventId}/my-status`, { token: login.token });
    assert.equal(participationStatusResponse.status, 200);
    assert.equal((await participationStatusResponse.json()).participating, true);

    await Giveaway.updateOne({ _id: giveaway.id }, { $set: { endsAt: new Date(Date.now() - 1000), drawAt: new Date(Date.now() - 1000) } });
    stage = 'winner selection';
    const drawResponse = await request(`/api/admin/giveaways/${slug}/select-winners`, {
      method: 'POST',
      body: {},
      token: adminLogin.token,
    });
    assert.equal(drawResponse.status, 201);

    const publicWinnersResponse = await request(`/api/giveaways/${slug}/winners`);
    const publicWinners = await publicWinnersResponse.json();
    assert.equal(publicWinners.status, 'FINALIZED');
    assert.equal(publicWinners.winners.length, 1);
    assert.equal(JSON.stringify(publicWinners).includes(email), false);

    const claimResponse = await request(`/api/giveaways/${slug}/claim`, {
      method: 'POST',
      body: { email },
      token: login.token,
    });
    stage = 'claim submission';
    assert.equal(claimResponse.status, 201);
    const claim = await PrizeClaim.findOne({ giveawayId: giveaway.id }).select('+encryptedDetails');
    assert.ok(claim);
    assert.equal(claim.encryptedDetails.ciphertext.includes(email), false);

    const adminClaimListResponse = await request('/api/admin/claims', { token: adminLogin.token });
    assert.equal(adminClaimListResponse.status, 200);
    const adminClaimList = await adminClaimListResponse.json();
    assert.equal(adminClaimList.claims.some((entry) => entry.id === claim.id), true);
    assert.equal(JSON.stringify(adminClaimList).includes(email), false);

    const decryptedClaimResponse = await request(`/api/admin/claims/${claim.id}`, { token: adminLogin.token });
    stage = 'admin claim review';
    assert.equal(decryptedClaimResponse.status, 200);
    assert.equal((await decryptedClaimResponse.json()).claim.details.email, email);
    assert.equal(await AuditLog.countDocuments({
      userId: admin.id,
      action: 'CLAIM_DETAILS_ACCESSED',
      giveawayId: giveaway.id,
    }), 1);

    const processingResponse = await request(`/api/admin/claims/${claim.id}/status`, {
      method: 'PATCH',
      body: { status: 'PROCESSING' },
      token: adminLogin.token,
    });
    stage = 'claim processing';
    assert.equal(processingResponse.status, 200);

    const completedResponse = await request(`/api/admin/claims/${claim.id}/status`, {
      method: 'PATCH',
      body: { status: 'COMPLETED' },
      token: adminLogin.token,
    });
    stage = 'claim completion';
    assert.equal(completedResponse.status, 200);
    assert.equal((await Winner.findOne({ giveawayId: giveaway.id })).status, 'CLAIMED');

    const privateClaimResponse = await request(`/api/giveaways/${slug}/my-claim`, { token: login.token });
    assert.equal(privateClaimResponse.status, 200);
    assert.equal((await privateClaimResponse.json()).claim.status, 'COMPLETED');

    const forbiddenResponse = await request('/api/admin/giveaways', { token: login.token });
    stage = 'non-admin authorization';
    assert.equal(forbiddenResponse.status, 403);
  } catch (error) {
    console.error(`Integration failure during ${stage}: ${error.message}`);
    throw error;
  } finally {
    server.closeAllConnections();
    server.close();
    if (giveaway) {
      await Promise.all([
        Participation.deleteMany({ giveawayId: giveaway.id }),
        EntryTransaction.deleteMany({ giveawayId: giveaway.id }),
        Winner.deleteMany({ giveawayId: giveaway.id }),
        PrizeClaim.deleteMany({ giveawayId: giveaway.id }),
        AuditLog.deleteMany({ giveawayId: giveaway.id }),
        Giveaway.deleteOne({ _id: giveaway.id }),
      ]);
    }
    if (adminCreatedGiveawayId) {
      const createdGiveaway = await Giveaway.findOne({ eventId: adminCreatedGiveawayId }).select('_id');
      if (createdGiveaway) {
        await Promise.all([
          AuditLog.deleteMany({ giveawayId: createdGiveaway.id }),
          Giveaway.deleteOne({ _id: createdGiveaway.id }),
        ]);
      }
    }
    if (participant || admin) {
      const userIds = [participant?.id, admin?.id].filter(Boolean);
      await Promise.all([
        AuditLog.deleteMany({ userId: { $in: userIds } }),
        User.deleteMany({ _id: { $in: userIds } }),
      ]);
    }
    await mongoose.disconnect();
  }
});
