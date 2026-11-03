import mongoose from 'mongoose';

const participationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giveawayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Giveaway', required: true },
  entryCurrency: { type: String, enum: ['VES', 'SVES', 'TOKENS'], required: true },
  entryAmount: { type: Number, min: 1, required: true },
  deviceHash: { type: String, select: false },
  idempotencyKey: { type: String, required: true },
  status: { type: String, enum: ['CONFIRMED', 'UNDER_REVIEW', 'BLOCKED'], default: 'CONFIRMED' },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });
participationSchema.index({ userId: 1, giveawayId: 1 }, { unique: true });
participationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export default mongoose.model('Participation', participationSchema);
