import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createInterface } from 'node:readline';
import { connectDatabase } from './config/database.js';
import { validateEnvironment } from './config/env.js';
import User from './models/User.js';
import { signupSchema } from './validators/schemas.js';

function ask(question) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => prompt.question(question, (answer) => {
    prompt.close();
    resolve(answer.trim());
  }));
}

function askHidden(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so the password can be entered privately.');
  }
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        reject(new Error('Admin setup cancelled.'));
      } else if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
      } else if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1);
        process.stdout.write('\b \b');
      } else if (key >= ' ' && key !== '\u007f') {
        value += key;
        process.stdout.write('*');
      }
    };
    process.stdin.on('data', onData);
  });
}

async function createDevelopmentAdmin() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    throw new Error('This helper creates development-only accounts. Production admin accounts must use the approved identity provider.');
  }
  validateEnvironment();

  const name = await ask('Admin display name: ');
  const email = (await ask('Admin email: ')).toLowerCase();
  const password = await askHidden('Admin password (hidden): ');
  const confirmation = await askHidden('Confirm password (hidden): ');
  if (password !== confirmation) throw new Error('Passwords do not match.');

  const input = signupSchema.parse({ name, email, password });
  await connectDatabase();

  const existing = await User.exists({ email: input.email.toLowerCase() });
  if (existing) throw new Error('That email already has an account. Use a new email for the dedicated local admin account.');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: 'ADMIN',
    balances: {},
  });
  console.info(`Development admin created for ${user.email}. Sign in at /login and open /admin.`);
}

try {
  await createDevelopmentAdmin();
} catch (error) {
  console.error(`Admin setup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
