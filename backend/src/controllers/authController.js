import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { loginSchema, signupSchema } from '../validators/schemas.js';

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balances: user.balances,
    demo: process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true',
  };
}

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', issuer: 'veloop-rewards' });
}

export async function signup(req, res, next) {
  try {
    const input = signupSchema.parse(req.body);
    const email = input.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ code: 'ACCOUNT_EXISTS', message: 'An account with this email already exists. Please log in.' });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const demoBalances = process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true'
      ? { VES: 850, SVES: 1200, TOKENS: 4600 }
      : {};
    const user = await User.create({ name: input.name, email, passwordHash, balances: demoBalances });
    await AuditLog.create({ userId: user.id, action: 'ACCOUNT_CREATED', result: 'SUCCESS', requestId: req.requestId });
    return res.status(201).json({ token: issueToken(user), user: safeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      await AuditLog.create({ action: 'LOGIN_REJECTED', result: 'INVALID_CREDENTIALS', requestId: req.requestId });
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'The email or password does not match our records.' });
    }
    await AuditLog.create({ userId: user.id, action: 'LOGIN', result: 'SUCCESS', requestId: req.requestId });
    return res.json({ token: issueToken(user), user: safeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function currentUser(req, res) {
  return res.json({ user: safeUser(req.user) });
}
