import mongoose from 'mongoose';

const fraudEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  giveawayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Giveaway' },
  deviceHash: { type: String, select: false },
  riskScore: { type: Number, min: 0, max: 100, required: true },
  reason: { type: String, required: true, maxlength: 300 },
  signals: { type: [String], default: [] },
  action: { type: String, enum: ['OBSERVED', 'REVIEW_REQUIRED', 'BLOCKED'], required: true },
  requestId: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('FraudEvent', fraudEventSchema);
