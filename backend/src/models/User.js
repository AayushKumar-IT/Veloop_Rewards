import mongoose from 'mongoose';

const balancesSchema = new mongoose.Schema({
  VES: { type: Number, default: 0, min: 0 },
  SVES: { type: Number, default: 0, min: 0 },
  TOKENS: { type: Number, default: 0, min: 0 },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  isEligible: { type: Boolean, default: true },
  balances: { type: balancesSchema, default: () => ({}) },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
