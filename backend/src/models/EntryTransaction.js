import mongoose from 'mongoose';

const entryTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giveawayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Giveaway', required: true },
  participationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participation', required: true, unique: true },
  currency: { type: String, enum: ['VES', 'SVES', 'TOKENS'], required: true },
  amount: { type: Number, required: true, min: 1 },
  type: { type: String, enum: ['GIVEAWAY_ENTRY'], required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'], required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  requestId: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('EntryTransaction', entryTransactionSchema);
