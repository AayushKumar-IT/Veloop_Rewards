import mongoose from 'mongoose';

const feeSchema = new mongoose.Schema({
  currency: { type: String, enum: ['VES', 'SVES', 'TOKENS'], required: true },
  amount: { type: Number, min: 1, required: true },
}, { _id: false });

const giveawaySchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  title: { type: String, required: true, trim: true },
  label: { type: String, required: true },
  description: { type: String, required: true },
  descriptionLong: { type: String, required: true },
  visual: { type: String, enum: ['phone', 'watch', 'audio', 'voucher'], required: true },
  value: { type: String, required: true },
  prizeType: { type: String, enum: ['PHYSICAL', 'GIFT_CARD', 'DIGITAL'], required: true },
  status: { type: String, enum: ['UPCOMING', 'ACTIVE', 'ENDED', 'ARCHIVED'], required: true, index: true },
  fee: { type: feeSchema, required: true },
  winnerCount: { type: Number, min: 1, required: true },
  participantCount: { type: Number, min: 0, default: 0 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  drawAt: { type: Date, required: true },
  eligibility: { type: String, required: true },
  rules: { type: [String], default: [] },
  claimDeadlineDays: { type: Number, min: 1, default: 7 },
  participationSettings: { onePerUser: { type: Boolean, default: true }, allowReentry: { type: Boolean, default: false } },
  winnersFinalizedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Giveaway', giveawaySchema);
