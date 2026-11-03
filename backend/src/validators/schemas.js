import { z } from 'zod';

const cleanText = (max) => z.string().trim().min(1).max(max);

export const signupSchema = z.object({
  name: cleanText(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const joinSchema = z.object({}).strict();

const physicalClaim = z.object({
  fullName: cleanText(100),
  phone: z.string().trim().regex(/^[+()\d -]{7,20}$/),
  address: cleanText(250),
  city: cleanText(100),
  state: cleanText(100),
  pinCode: z.string().trim().regex(/^[A-Za-z0-9 -]{4,10}$/),
}).strict();

const giftCardClaim = z.object({
  email: z.string().trim().email().max(254),
}).strict();

export function parseClaimDetails(prizeType, input) {
  return (prizeType === 'GIFT_CARD' || prizeType === 'DIGITAL' ? giftCardClaim : physicalClaim).parse(input);
}

export const adminGiveawaySchema = z.object({
  eventId: cleanText(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  title: cleanText(140),
  label: cleanText(80),
  description: cleanText(500),
  descriptionLong: cleanText(1200),
  visual: z.enum(['phone', 'watch', 'audio', 'voucher']),
  value: cleanText(80),
  prizeType: z.enum(['PHYSICAL', 'GIFT_CARD', 'DIGITAL']),
  status: z.enum(['UPCOMING', 'ACTIVE']),
  fee: z.object({
    currency: z.enum(['VES', 'SVES', 'TOKENS']),
    amount: z.number().int().min(1).max(100000000),
  }).strict(),
  winnerCount: z.number().int().min(1).max(1000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  drawAt: z.coerce.date(),
  eligibility: cleanText(1200),
  rules: z.array(cleanText(500)).max(40),
  claimDeadlineDays: z.number().int().min(1).max(90).default(7),
}).strict()
  .refine((giveaway) => giveaway.endsAt > giveaway.startsAt, { message: 'The end date must follow the start date.' })
  .refine((giveaway) => giveaway.drawAt >= giveaway.endsAt, { message: 'The draw date cannot precede the giveaway end date.' });

export const adminStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'ENDED', 'ARCHIVED']),
}).strict();

export const adminClaimStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'COMPLETED']),
}).strict();
