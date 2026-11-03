import { randomUUID } from 'node:crypto';

export function requestContext(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  return next();
}
