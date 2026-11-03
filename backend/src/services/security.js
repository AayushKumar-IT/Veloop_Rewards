import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export function hashDeviceId(deviceId) {
  if (typeof deviceId !== 'string' || deviceId.length < 16 || deviceId.length > 180) return null;
  return createHmac('sha256', process.env.DEVICE_HASH_SECRET).update(deviceId).digest('hex');
}

export function encryptClaimDetails(details) {
  const iv = randomBytes(12);
  const key = Buffer.from(process.env.CLAIM_ENCRYPTION_KEY, 'hex');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(details), 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('hex') };
}

export function decryptClaimDetails(encrypted) {
  const key = Buffer.from(process.env.CLAIM_ENCRYPTION_KEY, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  const cleartext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'hex')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(cleartext);
}

export function maskUserId(userId) {
  const value = String(userId);
  return `${value.startsWith('VE') ? value.slice(0, 2) : 'VE'}****${value.slice(-2)}`;
}
