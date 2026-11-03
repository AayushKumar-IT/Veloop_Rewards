import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { validateEnvironment } from './config/env.js';
import User from './models/User.js';
import Giveaway from './models/Giveaway.js';
import Participation from './models/Participation.js';
import EntryTransaction from './models/EntryTransaction.js';
import Winner from './models/Winner.js';
import PrizeClaim from './models/PrizeClaim.js';
import FraudEvent from './models/FraudEvent.js';
import AuditLog from './models/AuditLog.js';

try {
  validateEnvironment();
  await connectDatabase();
  await Promise.all([User, Giveaway, Participation, EntryTransaction, Winner, PrizeClaim, FraudEvent, AuditLog].map((model) => model.init()));
  const app = createApp();
  const port = Number(process.env.PORT ?? 4000);
  const server = app.listen(port, () => console.info(`VELOOP giveaway API listening on port ${port}`));

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(async () => {
      const mongoose = await import('mongoose');
      await mongoose.default.disconnect();
      process.exit(0);
    }));
  }
} catch (error) {
  console.error(`API startup failed: ${error.message}`);
  process.exitCode = 1;
}
