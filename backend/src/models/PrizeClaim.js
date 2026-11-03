import mongoose from 'mongoose';

const encryptedSchema = new mongoose.Schema({
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  ciphertext: { type: String, required: true },
}, { _id: false });

const prizeClaimSchema = new mongoose.Schema({
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Winner', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giveawayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Giveaway', required: true },
  encryptedDetails: { type: encryptedSchema, required: true, select: false },
  status: { type: String, enum: ['SUBMITTED', 'PROCESSING', 'COMPLETED', 'EXPIRED'], default: 'SUBMITTED' },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('PrizeClaim', prizeClaimSchema);
