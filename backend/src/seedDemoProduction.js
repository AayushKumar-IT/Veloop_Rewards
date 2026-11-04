import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import { validateEnvironment } from './config/env.js';
import Giveaway from './models/Giveaway.js';
import { giveawaySeeds } from './data/giveawayData.js';

// This is an explicit, one-time bootstrap for an empty demo deployment.
// It never updates, replaces, or deletes existing records.
async function seedEmptyDemoDeployment() {
  validateEnvironment();

  if (process.env.NODE_ENV !== 'production') {
    throw new Error('This command is intended only for the deployed demo environment (NODE_ENV=production).');
  }
  if (process.env.ALLOW_DEMO_GIVEAWAY_SEED !== 'true') {
    throw new Error('Set ALLOW_DEMO_GIVEAWAY_SEED=true temporarily to authorize this one-time demo bootstrap.');
  }

  await connectDatabase();
  await Giveaway.init();

  const existingCount = await Giveaway.countDocuments({});
  if (existingCount > 0) {
    throw new Error(`Safety stop: found ${existingCount} existing giveaway record(s). Nothing was changed.`);
  }

  const records = giveawaySeeds.map(({ winners, participants, ...item }) => ({
    ...item,
    label: `DEMO · ${item.label}`,
    description: `${item.description} Illustrative demo listing only; this is not a live prize event.`,
    descriptionLong: `${item.descriptionLong} This is illustrative demo data, not a live VELOOP event.`,
    winnerCount: winners,
    participantCount: 0,
  }));

  await Giveaway.insertMany(records, { ordered: true });
  console.info(`Inserted ${records.length} clearly labelled demo giveaway records. Participant counts are zero; no winner history or user records were created.`);
}

try {
  await seedEmptyDemoDeployment();
} catch (error) {
  console.error(`Demo giveaway bootstrap failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
