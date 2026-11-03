import mongoose from 'mongoose';

const winnerSchema = new mongoose.Schema({
  giveawayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Giveaway', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  publicUserId: { type: String, required: true },
  prize: { type: String, required: true },
  event: { type: String, required: true },
  date: { type: Date, required: true },
  selectionMethod: { type: String, enum: ['AUTHORIZED_DRAW', 'DEMO_HISTORY'], required: true },
  status: { type: String, enum: ['SELECTED', 'CLAIMED', 'EXPIRED'], default: 'SELECTED' },
}, { timestamps: true });
winnerSchema.index({ giveawayId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });

export default mongoose.model('Winner', winnerSchema);
