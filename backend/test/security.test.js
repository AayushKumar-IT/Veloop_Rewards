import test from 'node:test';
import assert from 'node:assert/strict';
import { adminGiveawaySchema, parseClaimDetails } from '../src/validators/schemas.js';
import Giveaway from '../src/models/Giveaway.js';
import Participation from '../src/models/Participation.js';
import { decryptClaimDetails, encryptClaimDetails, maskUserId } from '../src/services/security.js';
import { chooseRandomWinners } from '../src/services/participationService.js';

process.env.CLAIM_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DEVICE_HASH_SECRET = 'sample-device-secret-value-that-is-long-enough';

test('claim details are encrypted and can be decrypted without changing fields', () => {
  const details = { fullName: 'Demo Winner', phone: '+91 90000 00000', address: '1 Sample Street', city: 'Pune', state: 'Maharashtra', pinCode: '411001' };
  const encrypted = encryptClaimDetails(details);
  assert.notEqual(encrypted.ciphertext, JSON.stringify(details));
  assert.deepEqual(decryptClaimDetails(encrypted), details);
});

test('gift card claims collect only a valid email address', () => {
  assert.deepEqual(parseClaimDetails('GIFT_CARD', { email: 'winner@example.com' }), { email: 'winner@example.com' });
  assert.throws(() => parseClaimDetails('GIFT_CARD', { email: 'not-an-email', address: 'private data' }));
});

test('physical claims reject missing delivery details and unexpected fields', () => {
  assert.throws(() => parseClaimDetails('PHYSICAL', { email: 'winner@example.com' }));
  assert.throws(() => parseClaimDetails('PHYSICAL', {
    fullName: 'Demo Winner', phone: '+91 90000 00000', address: '1 Sample Street',
    city: 'Pune', state: 'Maharashtra', pinCode: '411001', accountNumber: 'not allowed',
  }));
});

test('giveaway configuration validates fee currency and configured dates', () => {
  const valid = {
    eventId: 'GW-TEST', slug: 'test-reward', title: 'Test Reward', label: 'DEMO',
    description: 'Description', descriptionLong: 'Long description', visual: 'phone',
    value: 'Sample', prizeType: 'PHYSICAL', status: 'UPCOMING',
    fee: { currency: 'SVES', amount: 500 }, winnerCount: 1,
    startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-11-03T00:00:00.000Z',
    drawAt: '2026-11-03T00:00:00.000Z', eligibility: 'Eligible accounts',
    rules: ['One entry per user'],
  };
  assert.equal(adminGiveawaySchema.parse(valid).fee.currency, 'SVES');
  assert.throws(() => adminGiveawaySchema.parse({ ...valid, fee: { currency: 'USD', amount: 500 } }));
  assert.throws(() => adminGiveawaySchema.parse({ ...valid, endsAt: '2026-10-30T00:00:00.000Z' }));
});

test('winner selection is unique and never exceeds the configured winner count', () => {
  const participants = Array.from({ length: 8 }, (_, index) => ({ id: String(index) }));
  const selected = chooseRandomWinners(participants, 4);
  assert.equal(selected.length, 4);
  assert.equal(new Set(selected.map((participant) => participant.id)).size, 4);
  assert.equal(chooseRandomWinners(participants.slice(0, 2), 10).length, 2);
  assert.equal(chooseRandomWinners([], 1).length, 0);
});

test('public winner identifiers are masked and database enforces one join per user/event', () => {
  assert.equal(maskUserId('VE10025'), 'VE****25');
  const compoundIndexes = Participation.schema.indexes().map(([keys]) => keys);
  assert.ok(compoundIndexes.some((keys) => keys.userId === 1 && keys.giveawayId === 1));
  assert.ok(Giveaway.schema.path('fee').schema.path('currency').enumValues.includes('TOKENS'));
});
