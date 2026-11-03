import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ code: 'LOGIN_REQUIRED', message: 'Please log in to continue.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('name email role balances isEligible');
    if (!user) return res.status(401).json({ code: 'LOGIN_REQUIRED', message: 'Please log in to continue.' });
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'LOGIN_REQUIRED', message: 'Please log in again to continue.' });
    }
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' });
  return next();
}
