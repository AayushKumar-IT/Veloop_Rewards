import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import { validateEnvironment } from './config/env.js';
import Giveaway from './models/Giveaway.js';
import User from './models/User.js';
import Winner from './models/Winner.js';
import Participation from './models/Participation.js';
import EntryTransaction from './models/EntryTransaction.js';
import PrizeClaim from './models/PrizeClaim.js';
import FraudEvent from './models/FraudEvent.js';
import AuditLog from './models/AuditLog.js';
import { giveawaySeeds, previousWinnerSeeds } from './data/giveawayData.js';

validateEnvironment();
if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
  throw new Error('The seed script contains demonstration data and must not be run in production.');
}
await connectDatabase();
await Promise.all([User, Giveaway, Participation, EntryTransaction, Winner, PrizeClaim, FraudEvent, AuditLog].map((model) => model.init()));

for (const giveaway of giveawaySeeds) {
  const { winners, participants, ...configuration } = giveaway;
  await Giveaway.updateOne(
    { eventId: giveaway.eventId },
    { $set: { ...configuration, winnerCount: winners, participantCount: participants } },
    { upsert: true, runValidators: true },
  );
}

const historyEventId = 'GW-HISTORY-DEMO';
const historyEvent = await Giveaway.findOneAndUpdate(
  { eventId: historyEventId },
  { $set: {
    eventId: historyEventId,
    slug: 'previous-winners-demo',
    title: 'Previous Reward Edit',
    label: 'DEMO HISTORY',
    description: 'Illustrative historic winner records.',
    descriptionLong: 'Fictional demo winner records for layout preview.',
    visual: 'phone',
    value: 'Sample',
    prizeType: 'DIGITAL',
    status: 'ARCHIVED',
    fee: { currency: 'VES', amount: 1 },
    winnerCount: previousWinnerSeeds.length,
    startsAt: new Date('2026-08-01T00:00:00Z'),
    endsAt: new Date('2026-08-04T00:00:00Z'),
    drawAt: new Date('2026-08-05T00:00:00Z'),
    eligibility: 'Sample historical entries for UI development only.',
    rules: [],
    winnersFinalizedAt: new Date('2026-08-05T12:00:00Z'),
  } },
  { upsert: true, new: true, runValidators: true },
);

for (const winner of previousWinnerSeeds) {
  await Winner.updateOne(
    { giveawayId: historyEvent.id, publicUserId: winner.publicUserId, selectionMethod: 'DEMO_HISTORY' },
    { $set: { ...winner, giveawayId: historyEvent.id, selectionMethod: 'DEMO_HISTORY', event: winner.event } },
    { upsert: true, runValidators: true },
  );
}

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await User.updateOne({ email }, { $set: { name: 'VELOOP Admin', email, passwordHash, role: 'ADMIN' } }, { upsert: true, runValidators: true });
  console.info(`Configured admin account for ${email}`);
}

if (process.env.NODE_ENV !== 'production') {
  console.info('Sample giveaways and clearly labeled demo history have been seeded. Development signups receive demo-only balances.');
}

await mongoose.disconnect();
