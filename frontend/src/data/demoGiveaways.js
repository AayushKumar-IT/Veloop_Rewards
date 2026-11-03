const startsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const endsAt = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
const drawDate = endsAt;

const giveawaySeeds = [
  { id: 'GW-PHONE-2026', slug: 'iphone-15-pro', title: 'iPhone 15 Pro', label: '01 · GRAND PRIZE', description: 'A little more room for the things you love.', visual: 'phone', value: '₹1,34,900', prizeType: 'PHYSICAL', fee: { currency: 'VES', amount: 250 }, winners: 1, participants: 2384 },
  { id: 'GW-WATCH-2026', slug: 'apple-watch', title: 'Apple Watch Series 9', label: '02 · DAILY ESSENTIAL', description: 'A thoughtful companion for every kind of day.', visual: 'watch', value: '₹41,900', prizeType: 'PHYSICAL', fee: { currency: 'VES', amount: 200 }, winners: 3, participants: 1942 },
  { id: 'GW-AIRPODS-2026', slug: 'airpods-pro', title: 'AirPods Pro', label: '03 · SOUND, REIMAGINED', description: 'Make space for your next favourite soundtrack.', visual: 'audio', value: '₹24,900', prizeType: 'PHYSICAL', fee: { currency: 'SVES', amount: 500 }, winners: 5, participants: 1670 },
  { id: 'GW-AMAZON-2000-2026', slug: 'amazon-2000', title: '₹2,000 Amazon Voucher', label: '04 · YOUR NEXT FIND', description: 'A little something for the list you keep adding to.', visual: 'amazon-2000', value: '₹2,000', prizeType: 'GIFT_CARD', fee: { currency: 'VES', amount: 500 }, winners: 10, participants: 1412 },
  { id: 'GW-AMAZON-500-2026', slug: 'amazon-500', title: '₹500 Amazon Voucher', label: '05 · SMALL JOY', description: 'A useful little treat, on us.', visual: 'amazon-500', value: '₹500', prizeType: 'GIFT_CARD', fee: { currency: 'VES', amount: 300 }, winners: 10, participants: 1038 },
  { id: 'GW-AMAZON-20-2026', slug: 'amazon-20', title: '₹20 Voucher', label: '06 · JUST BECAUSE', description: 'A small surprise can still make your day.', visual: 'amazon-20', value: '₹20', prizeType: 'DIGITAL', fee: { currency: 'TOKENS', amount: 2000 }, winners: 20, participants: 820 },
].map((giveaway) => ({
  ...giveaway,
  descriptionLong: `${giveaway.description} The reward and draw details shown here are sample project data; confirm final availability and terms before production.`,
  status: 'ACTIVE',
  startsAt,
  endsAt,
  drawDate,
  eligibility: 'Eligible, signed-in VELOOP Rewards accounts; official event rules apply.',
  rules: [
    'One participation per account per giveaway.',
    'The listed fee is deducted from the specified virtual currency balance.',
    'The server verifies participation eligibility and available balance.',
    'Winners are published after an authorized draw is finalized.',
    'Winners must submit a claim within 7 days of announcement.',
  ],
  claimDeadlineDays: 7,
}));

const previousWinners = [
  { userId: 'VE****82', prize: 'iPhone 15 Pro', event: 'August Reward Edit', date: '2026-08-05T12:00:00.000Z' },
  { userId: 'VE****42', prize: 'Apple Watch Series 9', event: 'Summer Rewards', date: '2026-08-06T12:00:00.000Z' },
  { userId: 'VE****27', prize: 'AirPods Pro', event: 'Summer Rewards', date: '2026-08-06T12:00:00.000Z' },
];

export function getDemoPublicResponse(path) {
  if (path === '/api/giveaways') {
    return {
      giveaways: giveawaySeeds,
      stats: {
        giveaways: giveawaySeeds.length,
        participants: giveawaySeeds.reduce((total, giveaway) => total + giveaway.participants, 0),
        prizesWon: 0,
      },
      demo: true,
    };
  }

  if (path === '/api/giveaways/previous/winners') {
    return { winners: previousWinners, demo: true };
  }

  const winnersMatch = path.match(/^\/api\/giveaways\/([^/]+)\/winners$/);
  if (winnersMatch && giveawaySeeds.some(({ id, slug }) => id === decodeURIComponent(winnersMatch[1]) || slug === decodeURIComponent(winnersMatch[1]))) {
    return { status: 'PENDING', winners: [] };
  }

  const giveawayMatch = path.match(/^\/api\/giveaways\/(?:slug\/)?([^/]+)$/);
  if (giveawayMatch) {
    const key = decodeURIComponent(giveawayMatch[1]);
    const giveaway = giveawaySeeds.find(({ id, slug }) => id === key || slug === key);
    if (giveaway) return { giveaway, demo: true };
  }

  return null;
}
