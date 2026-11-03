import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true, maxlength: 80 },
  giveawayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Giveaway', default: null },
  amount: { type: Number, default: null },
  currency: { type: String, default: null },
  result: { type: String, required: true, maxlength: 120 },
  requestId: { type: String, required: true, maxlength: 120 },
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
