import 'dotenv/config';

const required = ['MONGO_URI', 'JWT_SECRET', 'CLAIM_ENCRYPTION_KEY', 'DEVICE_HASH_SECRET'];

export function validateEnvironment() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env and configure it.`);
  }
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  if (!/^[a-f0-9]{64}$/i.test(process.env.CLAIM_ENCRYPTION_KEY)) {
    throw new Error('CLAIM_ENCRYPTION_KEY must be a 32-byte hexadecimal key.');
  }
  if (process.env.DEVICE_HASH_SECRET.length < 32) throw new Error('DEVICE_HASH_SECRET must contain at least 32 characters.');
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE === 'true') {
    throw new Error('DEMO_MODE must be disabled in production.');
  }
}
