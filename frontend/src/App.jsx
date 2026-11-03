import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronDown,
  Clock3, Gift, HeartHandshake, LockKeyhole, Menu, ShieldCheck, Sparkles, TicketCheck,
  Trophy, Users, X,
} from 'lucide-react';
import styles from './styles/Giveaway.module.css';
import { currencyLabels, demoFAQs } from './data/content.js';
import { apiRequest } from './services/api.js';
import giftTicketImage from './assets/Assets/ChatGPT Image Aug 19, 2026, 01_36_29 PM.png';
import giftBoxImage from './assets/Assets/ChatGPT Image Aug 19, 2026, 01_40_53 PM.png';
import airPodsImage from './assets/Assets/ChatGPT Image Aug 19, 2026, 01_49_05 PM.png';
import phoneImage from './assets/Assets/ChatGPT Image Aug 19, 2026, 01_55_25 PM.png';
import watchImage from './assets/Assets/ChatGPT Image Aug 19, 2026, 02_06_07 PM.png';
import amazon500Image from './assets/Assets/ChatGPT Image Aug 19, 2026, 03_22_24 PM.png';
import amazon20Image from './assets/Assets/ChatGPT Image Aug 19, 2026, 03_27_44 PM.png';
import amazon2000Image from './assets/Assets/ChatGPT Image Aug 19, 2026, 05_07_43 PM.png';
import giftBoxHeroImage from './assets/Assets/img.png';

const formatNumber = (number) => new Intl.NumberFormat('en-IN').format(number);
const formatFee = (fee) => `${formatNumber(fee.amount)} ${currencyLabels[fee.currency] ?? fee.currency}`;
const dateLabel = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

function useGiveaways() {
  const [giveaways, setGiveaways] = useState([]);
  const [previousWinners, setPreviousWinners] = useState([]);
  const [currentWinners, setCurrentWinners] = useState([]);
  const [demo, setDemo] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('');
  const load = async () => {
    setState('loading');
    setMessage('');
    try {
      const [giveawaysResult, winnersResult] = await Promise.all([
        apiRequest('/api/giveaways'),
        apiRequest('/api/giveaways/previous/winners'),
      ]);
      const list = giveawaysResult.giveaways ?? [];
      const finalizedResults = await Promise.all(list.filter((item) => item.status === 'ENDED').map((item) => apiRequest(`/api/giveaways/${encodeURIComponent(item.id)}/winners`)));
      setGiveaways(list);
      setPreviousWinners(winnersResult.winners ?? []);
      setCurrentWinners(finalizedResults.flatMap((result) => result.winners ?? []));
      setStatistics(giveawaysResult.stats ?? null);
      setDemo(Boolean(giveawaysResult.demo || winnersResult.demo));
      setState((giveawaysResult.giveaways ?? []).length ? 'ready' : 'empty');
    } catch (error) {
      setMessage(error.message);
      setState('error');
    }
  };
  useEffect(() => { load(); }, []);
  return { giveaways, previousWinners, currentWinners, demo, statistics, state, message, reload: load };
}

function Navigation({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.navWrap}>
      <nav className={`${styles.nav} container`} aria-label="Main navigation">
        <Link to="/" className={styles.brand} aria-label="VELOOP Rewards home" onClick={() => setOpen(false)}>
          <span className={styles.brandMark}>v</span><span>VELOOP<span className={styles.brandSub}>rewards</span></span>
        </Link>
        <button className={styles.mobileMenu} type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div className={`${styles.navLinks} ${open ? styles.navOpen : ''}`}>
          <a href="/#rewards" onClick={() => setOpen(false)}>Giveaways</a>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <a href="/#winners" onClick={() => setOpen(false)}>Winners</a>
          {user?.role === 'ADMIN' && <Link to="/admin" onClick={() => setOpen(false)}>Admin</Link>}
          {user ? (
            <button className={styles.navAccount} type="button" onClick={onLogout}>
              <span className={styles.avatar}>{user.name?.slice(0, 1).toUpperCase() ?? 'V'}</span>
              <span>{user.name ?? 'My account'} · Sign out</span>
            </button>
          ) : (
            <Link className={styles.navLogin} to="/login">Log in <ArrowUpRight size={15} /></Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function Countdown({ endsAt, compact = false, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endsAt).getTime() - Date.now()));
  const expirationHandled = useRef(false);
  useEffect(() => {
    expirationHandled.current = false;
    const update = () => {
      const next = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setRemaining(next);
      if (next === 0 && !expirationHandled.current) {
        expirationHandled.current = true;
        onExpire?.();
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt, onExpire]);
  const totalSeconds = Math.floor(remaining / 1000);
  const values = [
    Math.floor(totalSeconds / 86400),
    Math.floor((totalSeconds % 86400) / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ];
  return compact
    ? <span>{values[0]}d {String(values[1]).padStart(2, '0')}h left</span>
    : <span className={styles.countdownDigits} aria-label={`${values[0]} days, ${values[1]} hours, ${values[2]} minutes, ${values[3]} seconds`}>
      {values.map((value, index) => <span key={index}>{String(value).padStart(2, '0')}<small>{['DAYS', 'HRS', 'MIN', 'SEC'][index]}</small></span>)}
    </span>;
}

function ProductVisual({ type, title = '', large = false }) {
  const assetMap = {
    phone: phoneImage,
    watch: watchImage,
    audio: airPodsImage,
    voucher: amazon500Image,
    ticket: giftTicketImage,
    box: giftBoxImage,
    'amazon-2000': amazon2000Image,
    'amazon-500': amazon500Image,
    'amazon-20': amazon20Image,
    hero: giftBoxHeroImage,
  };

  const voucherAsset = title.includes('₹2,000')
    ? amazon2000Image
    : title.includes('₹20')
      ? amazon20Image
      : amazon500Image;
  const asset = type === 'voucher' ? voucherAsset : assetMap[type] ?? assetMap.phone;

  return (
    <div className={`${styles.productVisual} ${styles.visualImageWrap} ${large ? styles.visualLarge : ''}`} aria-hidden="true">
      <img src={asset} alt="" className={styles.productVisualImage} />
      <span className={styles.visualOrb} />
      <span className={styles.visualSparkle}><Sparkles size={large ? 19 : 14} /></span>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`${styles.statusPill} ${status === 'ACTIVE' ? styles.statusActive : styles.statusUpcoming}`}><span />{status === 'ACTIVE' ? 'GIVEAWAY LIVE' : status}</span>;
}

function PrizeCard({ giveaway }) {
  return (
    <article className={styles.prizeCard}>
      <Link className={styles.cardLink} to={`/giveaway/${giveaway.slug}`} aria-label={`View ${giveaway.title} giveaway details`}>
        <div className={styles.cardArtwork}>
          <span className={styles.prizeLabel}>{giveaway.label}</span>
          <span className={styles.cardStatus}><StatusPill status={giveaway.status} /></span>
          <ProductVisual type={giveaway.visual} title={giveaway.title} />
          <span className={styles.winnerCount}><Trophy size={13} /> {giveaway.winners} {giveaway.winners === 1 ? 'winner' : 'winners'}</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardTitleRow}><h3>{giveaway.title}</h3><ArrowUpRight size={17} /></div>
          <p>{giveaway.description}</p>
          <div className={styles.cardMeta}>
            <span><Users size={14} /> {formatNumber(giveaway.participants)} joined</span>
            <span><Clock3 size={14} /> {giveaway.status === 'ACTIVE' ? <Countdown endsAt={giveaway.endsAt} compact /> : giveaway.status === 'UPCOMING' ? 'Coming soon' : 'Draw ended'}</span>
          </div>
          <div className={styles.cardFooter}>
            <span><small>ENTRY FEE</small><strong>{formatFee(giveaway.fee)}</strong></span>
            <span className={styles.joinLink}>View giveaway <ArrowRight size={15} /></span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function GiveawaysGrid({ giveaways }) {
  if (!giveaways.length) return <div className={styles.emptyCard}><Gift size={28} /><h3>The next giveaway is being prepared</h3><p>New rewards will appear here as soon as they are ready.</p></div>;
  return <div className={styles.prizeGrid}>{giveaways.map((giveaway) => <PrizeCard key={giveaway.id} giveaway={giveaway} />)}</div>;
}

function Hero({ active, rewardCount, statistics }) {
  return (
    <section className={styles.heroSection}>
      <div className={`container ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span className={styles.liveDot} /> THE VELOOP REWARDS EDITION</span>
          <h1>A little something<br /><span>extraordinary.</span></h1>
          <p>Discover thoughtful rewards, understand every entry and take part on your terms. Your next favourite thing might be closer than you think.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#rewards">Explore rewards <ArrowRight size={17} /></a>
            <a className={styles.textButton} href="#how-it-works">How it works <ArrowDownRight size={16} /></a>
          </div>
          <div className={styles.heroNote}><ShieldCheck size={15} /> Clear entry fees. A considered way to take part.</div>
        </div>
        <div className={styles.heroArt} aria-label="A preview of featured VELOOP giveaway rewards">
          <div className={styles.artHalo} />
          <div className={styles.artCardBack}><ProductVisual type="watch" /></div>
          <div className={styles.artCardMain}>
            <div className={styles.artCardTop}><span>THE REWARD EDIT</span><span>01 / {String(rewardCount || 0).padStart(2, '0')}</span></div>
            <ProductVisual type={active?.visual ?? 'phone'} title={active?.title} large />
            <div className={styles.artCardCaption}><span>UP NEXT, YOURS?</span><strong>{active?.title ?? 'Find your next favourite'}</strong></div>
          </div>
          <div className={styles.floatingStamp}><Sparkles size={15} /><span>Worth<br />the wait</span></div>
          <div className={styles.artBase} />
        </div>
      </div>
      <div className={`container ${styles.heroStats}`}>
        <div><span className={styles.statIcon}><Gift size={18} /></span><span><strong>{rewardCount ? String(rewardCount).padStart(2, '0') : '—'}</strong><small>REWARDS TO EXPLORE</small></span></div>
        <div><span className={styles.statIcon}><Users size={18} /></span><span><strong>{statistics ? formatNumber(statistics.participants) : '—'}</strong><small>PARTICIPATIONS TOTAL</small></span></div>
        <div><span className={styles.statIcon}><Trophy size={18} /></span><span><strong>{statistics ? formatNumber(statistics.prizesWon) : '—'}</strong><small>PRIZES AWARDED</small></span></div>
        <div><span className={styles.statIcon}><Clock3 size={18} /></span><span><strong>{active ? <Countdown endsAt={active.endsAt} compact /> : '—'}</strong><small>NEXT DRAW CLOSES IN</small></span></div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ['01', 'Choose your reward', 'Explore each giveaway and see the exact entry fee before you decide.', Gift],
    ['02', 'Check your balance', 'Your VEs, SVEs or Tokens are checked against the right entry currency.', ShieldCheck],
    ['03', 'Confirm your entry', 'Review your participation details before confirming. One entry per giveaway.', Check],
    ['04', 'Wait for the draw', 'We show winners after the draw is finalized. No winners are shown while it is live.', Trophy],
  ];
  return (
    <section id="how-it-works" className={`container ${styles.section} ${styles.howSection}`}>
      <div className={styles.sectionHeading}><span className={styles.eyebrow}>A CLEAR PATH, EVERY TIME</span><h2>Good things, made simple.</h2><p>No guesswork. Just a clear, considered way to explore each reward.</p></div>
      <div className={styles.stepsGrid}>{steps.map(([number, title, text, Icon]) => <article className={styles.stepCard} key={number}><span className={styles.stepNumber}>{number}</span><span className={styles.stepIcon}><Icon size={19} /></span><h3>{title}</h3><p>{text}</p>{number !== '04' && <span className={styles.stepArrow}><ArrowRight size={17} /></span>}</article>)}</div>
    </section>
  );
}

function WinnerTicker({ winners, demo }) {
  const items = winners;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (items.length < 2 || paused) return undefined;
    const interval = window.setInterval(() => setActiveIndex((current) => (current + 1) % items.length), 5000);
    return () => window.clearInterval(interval);
  }, [items.length, paused]);
  const winner = items[activeIndex];
  return (
    <div className={styles.winnerTicker} aria-live="polite" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <span className={styles.tickerIcon}><Trophy size={18} /></span>
      <span className={styles.tickerLabel}>A LITTLE JOY, SHARED</span>
      <span className={styles.tickerText}>{winner ? <><strong>{winner.userId}</strong> won <strong>{winner.prize}</strong> in {winner.event}.</> : 'Winner announcements will appear after a draw is finalized.'}</span>
      {winner && demo && <span className={styles.tickerDemo}>DEMO</span>}
    </div>
  );
}

function WinnersSection({ winners, currentWinners, demo }) {
  const [tab, setTab] = useState('current');
  return (
    <section id="winners" className={`container ${styles.section} ${styles.winnersSection}`}>
      <div className={styles.sectionHeading}><span className={styles.eyebrow}>THE PEOPLE BEHIND THE MOMENTS</span><h2>Every reward has a story.</h2><p>Live giveaways stay live until results are finalized. We never publish a winner early.</p></div>
      <WinnerTicker winners={winners} demo={demo} />
      <div className={styles.winnerTabs} role="tablist" aria-label="Giveaway winner lists">
        <button type="button" role="tab" id="tab-current" aria-selected={tab === 'current'} aria-controls="panel-current" onClick={() => setTab('current')}>Current giveaway</button>
        <button type="button" role="tab" id="tab-previous" aria-selected={tab === 'previous'} aria-controls="panel-previous" onClick={() => setTab('previous')}>Previous winners</button>
      </div>
      {tab === 'current' && currentWinners.length ? (
        <div id="panel-current" className={styles.historyList} role="tabpanel" aria-labelledby="tab-current">
          {currentWinners.map((winner, index) => <article className={styles.historyRow} key={`${winner.userId}-${winner.prize}-${index}`}><span className={styles.historyAvatar}>{winner.userId?.slice(-2) ?? 'V'}</span><div className={styles.historyWho}><strong>{winner.userId ?? 'VE****'}</strong><small>{winner.event ?? 'Completed giveaway'}</small></div><div className={styles.historyPrize}><span>WON</span><strong>{winner.prize}</strong></div><span className={styles.historyDate}>{winner.date ? dateLabel(winner.date) : 'Date pending'}</span><BadgeCheck className={styles.historyCheck} size={18} /></article>)}
          <p className={styles.resultsNote}>Finalized sample results are shown above. Live giveaways will display winners only after their draw is complete.</p>
        </div>
      ) : tab === 'current' ? (
        <div id="panel-current" className={styles.winnerEmpty} role="tabpanel" aria-labelledby="tab-current">
          <span><Clock3 size={22} /></span><div><strong>The giveaways are still live</strong><p>Winners will be announced here once each draw has ended and the results are finalized.</p></div><span className={styles.pendingBadge}>RESULTS PENDING</span>
        </div>
      ) : (
        <div id="panel-previous" className={styles.historyList} role="tabpanel" aria-labelledby="tab-previous">
          {winners.length ? winners.map((winner, index) => <article className={styles.historyRow} key={`${winner.userId}-${winner.prize}-${index}`}><span className={styles.historyAvatar}>{winner.userId?.slice(-2) ?? 'V'}</span><div className={styles.historyWho}><strong>{winner.userId ?? 'VE****'}</strong><small>{winner.event ?? 'Previous giveaway'}</small></div><div className={styles.historyPrize}><span>WON</span><strong>{winner.prize}</strong></div><span className={styles.historyDate}>{winner.date ? dateLabel(winner.date) : 'Date pending'}</span><BadgeCheck className={styles.historyCheck} size={18} /></article>) : <div className={styles.emptyCard}><Trophy size={25} /><h3>No previous winners yet</h3><p>Winners will appear here after completed giveaways.</p></div>}
        </div>
      )}
      {demo && <p className={styles.demoNote}>Illustrative sample information · not live winner activity.</p>}
    </section>
  );
}

function TrustSection() {
  const items = [
    [ShieldCheck, 'The details are up front', 'Every entry fee, currency and draw date is displayed before you join.'],
    [LockKeyhole, 'Your claim stays private', 'Claim details are submitted securely and are never part of public winner lists.'],
    [HeartHandshake, 'A fairer experience', 'One participation per user, per giveaway. The server verifies eligibility and balance.'],
  ];
  return <section className={styles.trustBand}><div className={`container ${styles.trustInner}`}><div className={styles.trustIntro}><span className={styles.eyebrow}>THE VELOOP PROMISE</span><h2>Thoughtful by design.<br />Transparent by default.</h2></div><div className={styles.trustItems}>{items.map(([Icon, title, text]) => <article key={title}><Icon size={20} /><div><strong>{title}</strong><p>{text}</p></div></article>)}</div></div></section>;
}

function FAQSection() {
  const [open, setOpen] = useState(0);
  return <section className={`container ${styles.section} ${styles.faqSection}`}><div className={styles.faqIntro}><span className={styles.eyebrow}>THE LITTLE DETAILS</span><h2>A few good questions.</h2><p>Something on your mind? Here are the details most people ask about.</p></div><div className={styles.faqList}>{demoFAQs.map((item, index) => <article className={styles.faqItem} key={item.question}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}><span>{item.question}</span><ChevronDown size={18} /></button>{open === index && <p>{item.answer}</p>}</article>)}</div></section>;
}

function RulesSection() {
  const [open, setOpen] = useState(false);
  return <section className={`container ${styles.rulesSection}`}><button type="button" className={styles.rulesToggle} aria-expanded={open} onClick={() => setOpen(!open)}><span><span className={styles.rulesIcon}><ShieldCheck size={18} /></span><span><strong>Giveaway rules &amp; guidelines</strong><small>Eligibility · entry rules · winner selection · prize claims</small></span></span><ChevronDown size={18} /></button>{open && <div className={styles.rulesContent}><p>This demonstration project uses sample event configuration. Confirm the official terms with VELOOP before accepting real participation or payments.</p><ul><li>Only eligible, signed-in accounts may participate.</li><li>Each giveaway permits one participation per account; the displayed fee is deducted from the matching virtual currency.</li><li>Giveaway status and entry costs are verified by the server; a countdown display does not determine the official draw.</li><li>Winners should be published only after an authorized draw is finalized.</li><li>Prize claims must be submitted within the deadline displayed by the event. Collect only information necessary to fulfill that prize.</li><li>Refund, eligibility, disqualification and dispute policies require official business and legal review before launch.</li></ul></div>}</section>;
}

function AdminDashboard({ user, onLogout }) {
  const [giveaways, setGiveaways] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [claimDetails, setClaimDetails] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [giveawayResult, claimResult] = await Promise.all([
        apiRequest('/api/admin/giveaways'),
        apiRequest('/api/admin/claims'),
      ]);
      setGiveaways(giveawayResult.giveaways);
      setClaims(claimResult.claims);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user || user.role !== 'ADMIN') {
    return <><Navigation user={user} onLogout={onLogout} /><main className={`container ${styles.adminPage}`}><div className={styles.emptyCard}><ShieldCheck size={25} /><h2>Admin access required</h2><p>Sign in with an authorized development admin account to manage giveaways and prize claims.</p><Link className={styles.primaryButton} to="/login">Go to login <ArrowRight size={16} /></Link></div></main><Footer /></>;
  }

  async function createGiveaway(event) {
    event.preventDefault();
    setBusy('create');
    setError('');
    setNotice('');
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const start = new Date(fields.startsAt);
    const end = new Date(fields.endsAt);
    const title = String(fields.title).trim();
    const configuration = {
      eventId: String(fields.eventId).trim(),
      slug: String(fields.slug).trim().toLowerCase(),
      title,
      label: 'ADMIN CREATED',
      description: String(fields.description).trim(),
      descriptionLong: String(fields.description).trim(),
      visual: fields.visual,
      value: String(fields.value).trim(),
      prizeType: fields.prizeType,
      status: start <= new Date() ? 'ACTIVE' : 'UPCOMING',
      fee: { currency: fields.currency, amount: Number(fields.amount) },
      winnerCount: Number(fields.winnerCount),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      drawAt: end.toISOString(),
      eligibility: 'Development demo account; confirm official event eligibility before production.',
      rules: ['One entry per account. Confirm official giveaway rules before production.'],
      claimDeadlineDays: 7,
    };
    try {
      await apiRequest('/api/admin/giveaways', { method: 'POST', body: JSON.stringify(configuration) });
      form.reset();
      setNotice(`${title} was created.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function updateGiveaway(giveaway, status) {
    const key = `giveaway:${giveaway.id}`;
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/api/admin/giveaways/${encodeURIComponent(giveaway.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(`${giveaway.title} moved to ${status.toLowerCase()}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function drawWinners(giveaway) {
    const key = `draw:${giveaway.id}`;
    setBusy(key);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest(`/api/admin/giveaways/${encodeURIComponent(giveaway.id)}/select-winners`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotice(`${result.winners.length} winner${result.winners.length === 1 ? '' : 's'} finalized for ${giveaway.title}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function inspectClaim(claim) {
    setBusy(`claim:${claim.id}`);
    setError('');
    try {
      const result = await apiRequest(`/api/admin/claims/${encodeURIComponent(claim.id)}`);
      setClaimDetails(result.claim);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  async function updateClaim(claim, status) {
    setBusy(`claim:${claim.id}`);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/api/admin/claims/${encodeURIComponent(claim.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(`Claim status updated to ${status.toLowerCase()}.`);
      await load();
      if (claimDetails?.id === claim.id) {
        setClaimDetails((current) => current ? { ...current, status } : current);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  }

  const slugFromTitle = (event) => {
    const title = event.currentTarget.value;
    const form = event.currentTarget.form;
    const slug = form?.elements.namedItem('slug');
    if (slug && !slug.dataset.edited) {
      slug.value = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  };

  return <>
    <Navigation user={user} onLogout={onLogout} />
    <main className={`container ${styles.adminPage}`}>
      <header className={styles.adminHeader}>
        <div><span className={styles.eyebrow}>VELOOP REWARDS · DEVELOPMENT</span><h1>Admin dashboard</h1><p>Manage demonstration giveaways, finalize eligible draws, and process private prize claims.</p></div>
        <button className={styles.secondaryButton} type="button" onClick={load} disabled={loading}>Refresh data</button>
      </header>
      <div className={styles.adminWarning}><ShieldCheck size={18} /><p>Demo administration only. Use test data; production identity, approved terms and operational controls are not configured.</p></div>
      {error && <p className={styles.adminMessageError} role="alert">{error}</p>}
      {notice && <p className={styles.adminMessageSuccess} role="status">{notice}</p>}

      <section className={styles.adminSection}>
        <div className={styles.adminSectionHeading}><div><span className={styles.eyebrow}>EVENT MANAGEMENT</span><h2>Giveaways</h2></div></div>
        {loading ? <LoadingState /> : giveaways.length ? <div className={styles.adminTableWrap}><table className={styles.adminTable}><thead><tr><th>Giveaway</th><th>Status</th><th>Entries</th><th>Draw / action</th></tr></thead><tbody>
          {giveaways.map((giveaway) => {
            const ended = new Date(giveaway.endsAt).getTime() <= Date.now();
            const canActivate = giveaway.status === 'UPCOMING' && new Date(giveaway.startsAt).getTime() <= Date.now() && !ended;
            const canEnd = giveaway.status === 'ACTIVE' && ended;
            return <tr key={giveaway.id}>
              <td><strong>{giveaway.title}</strong><small>{giveaway.id} · {giveaway.fee.amount} {currencyLabels[giveaway.fee.currency]}</small></td>
              <td><span className={styles.adminStatus}>{ended && giveaway.status === 'ACTIVE' ? 'ENDED · ACTION REQUIRED' : giveaway.status}</span></td>
              <td>{formatNumber(giveaway.participants)}<small>{giveaway.winners} planned winner{giveaway.winners === 1 ? '' : 's'}</small></td>
              <td><div className={styles.adminActions}>
                {canActivate && <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => updateGiveaway(giveaway, 'ACTIVE')}>Activate</button>}
                {canEnd && <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => updateGiveaway(giveaway, 'ENDED')}>End giveaway</button>}
                {ended && !giveaway.winnersFinalized && <button className={styles.primaryButton} type="button" disabled={Boolean(busy)} onClick={() => drawWinners(giveaway)}>{busy === `draw:${giveaway.id}` ? 'Drawing…' : 'Finalize draw'}</button>}
                {giveaway.winnersFinalized && <span className={styles.joinedNote}><Check size={14} /> Results finalized</span>}
                {giveaway.status === 'ENDED' && giveaway.winnersFinalized && <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => updateGiveaway(giveaway, 'ARCHIVED')}>Archive</button>}
              </div></td>
            </tr>;
          })}
        </tbody></table></div> : <div className={styles.emptyCard}>No giveaways found.</div>}
      </section>

      <section className={styles.adminSection}>
        <div className={styles.adminSectionHeading}><div><span className={styles.eyebrow}>NEW REWARD</span><h2>Create a giveaway</h2></div></div>
        <form className={styles.adminForm} onSubmit={createGiveaway}>
          <label>Event ID<input name="eventId" required maxLength={80} placeholder="GW-DEMO-001" /></label>
          <label>Title<input name="title" required maxLength={140} onChange={slugFromTitle} /></label>
          <label>URL slug<input name="slug" required minLength={2} maxLength={100} onInput={(event) => { event.currentTarget.dataset.edited = 'true'; }} /></label>
          <label>Short description<input name="description" required maxLength={500} /></label>
          <label>Reward value<input name="value" required maxLength={80} placeholder="Sample value" /></label>
          <label>Visual<select name="visual"><option value="phone">Phone</option><option value="watch">Watch</option><option value="audio">Audio</option><option value="voucher">Voucher</option></select></label>
          <label>Prize type<select name="prizeType"><option value="PHYSICAL">Physical</option><option value="GIFT_CARD">Gift card</option><option value="DIGITAL">Digital</option></select></label>
          <label>Entry currency<select name="currency"><option value="VES">VEs</option><option value="SVES">SVEs</option><option value="TOKENS">Tokens</option></select></label>
          <label>Entry fee<input name="amount" type="number" min="1" max="100000000" required /></label>
          <label>Winners<input name="winnerCount" type="number" min="1" max="1000" required /></label>
          <label>Starts<input name="startsAt" type="datetime-local" required /></label>
          <label>Ends<input name="endsAt" type="datetime-local" required /></label>
          <div className={styles.adminFormFooter}><p>Creation terms are demo placeholders. Confirm official eligibility and rules before any production use.</p><button className={styles.primaryButton} type="submit" disabled={Boolean(busy)}>{busy === 'create' ? 'Creating…' : 'Create giveaway'} <ArrowRight size={16} /></button></div>
        </form>
      </section>

      <section className={styles.adminSection}>
        <div className={styles.adminSectionHeading}><div><span className={styles.eyebrow}>PRIVATE WINNER DATA</span><h2>Prize claims</h2></div></div>
        {loading ? <LoadingState /> : claims.length ? <div className={styles.adminTableWrap}><table className={styles.adminTable}><thead><tr><th>Giveaway</th><th>Submitted</th><th>Status</th><th>Admin actions</th></tr></thead><tbody>
          {claims.map((claim) => <tr key={claim.id}>
            <td><strong>{claim.giveaway}</strong><small>{claim.eventId ?? claim.id}</small></td>
            <td>{dateLabel(claim.submittedAt)}</td>
            <td><span className={styles.adminStatus}>{claim.status}</span></td>
            <td><div className={styles.adminActions}>
              <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => inspectClaim(claim)}>{busy === `claim:${claim.id}` ? 'Loading…' : 'View private details'}</button>
              {claim.status === 'SUBMITTED' && <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => updateClaim(claim, 'PROCESSING')}>Mark processing</button>}
              {claim.status === 'PROCESSING' && <button className={styles.primaryButton} type="button" disabled={Boolean(busy)} onClick={() => updateClaim(claim, 'COMPLETED')}>Mark completed</button>}
            </div></td>
          </tr>)}
        </tbody></table></div> : <div className={styles.emptyCard}><Gift size={22} /><h3>No submitted claims</h3><p>Eligible winners’ claims will appear here after submission.</p></div>}
      </section>
    </main>
    <Footer />
    {claimDetails && <Dialog title="AUTHORIZED ADMIN · PRIVATE CLAIM" labelledBy="admin-claim-title" onClose={() => setClaimDetails(null)}><h2 id="admin-claim-title">Claim details</h2><p className={styles.modalDesc}>Access is restricted and audited. Use these details only to fulfill this winner’s prize.</p><dl className={styles.adminClaimDetails}>{Object.entries(claimDetails.details).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{value}</dd></div>)}</dl><p className={styles.demoNote}>Current status: {claimDetails.status}</p><div className={styles.modalActions}><button className={styles.secondaryButton} type="button" onClick={() => setClaimDetails(null)}>Close</button>{claimDetails.status === 'SUBMITTED' && <button className={styles.primaryButton} type="button" onClick={() => updateClaim({ id: claimDetails.id }, 'PROCESSING')}>Mark processing</button>}{claimDetails.status === 'PROCESSING' && <button className={styles.primaryButton} type="button" onClick={() => updateClaim({ id: claimDetails.id }, 'COMPLETED')}>Mark completed</button>}</div></Dialog>}
  </>;
}

function Footer() {
  return <footer className={styles.footer}><div className="container"><div className={styles.footerTop}><Link to="/" className={styles.brand}><span className={styles.brandMark}>v</span><span>VELOOP<span className={styles.brandSub}>rewards</span></span></Link><p>Good things, thoughtfully shared.</p><span className={styles.supportNote}>Official support details will be added before launch.</span></div><div className={styles.footerBottom}><span>© 2026 VELOOP Rewards · Demo experience</span><span>Made for moments that matter.</span></div></div></footer>;
}

function LoadingState() {
  return <div className={styles.loaderPage} role="status"><span className={styles.loaderGift}><Gift size={25} /></span><strong>Bringing your rewards closer</strong><span>Checking the latest giveaways…</span><span className={styles.loaderBar}><i /></span></div>;
}

function DemoNotice() {
  return <div className={styles.demoNotice}><span>DEVELOPMENT PREVIEW</span><p>Sample prizes, participant totals and past winners are illustrative. Demo balances and entries are local test data, not real VELOOP activity or value.</p></div>;
}

function ErrorState({ message, reload }) {
  return <div className={styles.emptyCard}><span className={styles.errorIcon}><X size={22} /></span><h3>We couldn't load the giveaways</h3><p>{message}</p><button className={styles.secondaryButton} type="button" onClick={reload}>Try again <ArrowRight size={15} /></button></div>;
}

function HomePage({ user, onLogout }) {
  const { giveaways, previousWinners, currentWinners, demo, statistics, state, message, reload } = useGiveaways();
  const active = giveaways.find((item) => item.status === 'ACTIVE') ?? giveaways.find((item) => item.status === 'UPCOMING');
  return <><Navigation user={user} onLogout={onLogout} /><main>{demo && <DemoNotice />}<Hero active={state === 'ready' ? active : undefined} rewardCount={state === 'ready' ? giveaways.length : 0} statistics={state === 'ready' ? statistics : null} /><section id="rewards" className={`container ${styles.section} ${styles.rewardsSection}`}><div className={styles.rewardsHeading}><div><span className={styles.eyebrow}>THE REWARD COLLECTION</span><h2>Something good is waiting.</h2><p>Explore every detail before you decide. Entry fees are always shown up front.</p></div><span className={styles.collectionLabel}><span className={styles.liveDot} /> {state === 'ready' ? `${giveaways.length} REWARDS IN THIS EDIT` : 'GIVEAWAYS'}</span></div>{state === 'loading' ? <div className={styles.cardSkeletonGrid} aria-label="Loading giveaways"><span /><span /><span /></div> : state === 'error' ? <ErrorState message={message} reload={reload} /> : <GiveawaysGrid giveaways={giveaways} />}</section><HowItWorks /><WinnersSection winners={previousWinners} currentWinners={currentWinners} demo={demo} /><TrustSection /><FAQSection /><RulesSection /></main><Footer /></>;
}

function Dialog({ title, children, onClose, labelledBy }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);
  return <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} tabIndex={-1} className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby={labelledBy}><button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close"><X size={19} /></button><span className={styles.modalKicker}>{title}</span>{children}</section></div>;
}

function GiveawayDetails({ user, onUserChange }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [giveaway, setGiveaway] = useState(null);
  const [status, setStatus] = useState('loading');
  const [myStatus, setMyStatus] = useState(null);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimSent, setClaimSent] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const refreshGiveaway = useCallback(async () => {
    try {
      const result = await apiRequest(`/api/giveaways/slug/${encodeURIComponent(slug)}`);
      setGiveaway(result.giveaway);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [slug]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest(`/api/giveaways/slug/${encodeURIComponent(slug)}`), user ? apiRequest(`/api/giveaways/${encodeURIComponent(slug)}/my-status`).catch(() => null) : Promise.resolve(null)])
      .then(([result, userResult]) => { if (!cancelled) { setGiveaway(result.giveaway); setMyStatus(userResult); setStatus('ready'); } })
      .catch((requestError) => { if (!cancelled) { setError(requestError.message); setStatus('error'); } });
    return () => { cancelled = true; };
  }, [slug, user, joined]);
  const balances = user?.balances ?? {};
  const available = giveaway ? Number(balances[giveaway.fee.currency] ?? 0) : 0;
  const enoughBalance = giveaway && available >= giveaway.fee.amount;
  const isParticipating = Boolean(myStatus?.participating) || joined;
  const isEnded = giveaway?.status === 'ENDED';
  const isUpcoming = giveaway?.status === 'UPCOMING';
  const currencyName = giveaway ? currencyLabels[giveaway.fee.currency] ?? giveaway.fee.currency : '';
  const joinLabel = !user ? 'Log in to participate' : isEnded ? 'Giveaway ended' : isUpcoming ? 'Coming soon' : isParticipating ? 'You’re already in' : !enoughBalance ? `Earn more ${currencyName}` : `Join for ${formatFee(giveaway.fee)}`;
  const handleEntry = () => {
    if (!user) navigate('/login');
    else if (!enoughBalance) navigate('/#how-it-works');
    else setShowConfirm(true);
  };

  async function confirmJoin() {
    setJoining(true);
    setError('');
    try {
      await apiRequest(`/api/giveaways/${encodeURIComponent(giveaway.id)}/join`, { method: 'POST', body: JSON.stringify({}) });
      setJoined(true);
      setShowConfirm(false);
      try {
        const result = await apiRequest('/api/auth/me');
        onUserChange(result.user);
      } catch {
        setError('Your entry was recorded. Reload the page to refresh your balance.');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setJoining(false);
    }
  }

  async function submitClaim(event) {
    event.preventDefault();
    setClaimBusy(true);
    setClaimError('');
    const formData = new FormData(event.currentTarget);
    const details = Object.fromEntries(formData.entries());
    try {
      await apiRequest(`/api/giveaways/${encodeURIComponent(giveaway.id)}/claim`, { method: 'POST', body: JSON.stringify(details) });
      setClaimSent(true);
    } catch (requestError) { setClaimError(requestError.message); } finally { setClaimBusy(false); }
  }

  if (status === 'loading') return <><Navigation user={user} /><LoadingState /></>;
  if (status === 'error') return <><Navigation user={user} /><main className={`container ${styles.detailError}`}><Link className={styles.backLink} to="/"><ArrowLeft size={16} /> Giveaway home</Link><ErrorState message={error} reload={() => window.location.reload()} /></main><Footer /></>;
  if (!giveaway) return <Navigate to="/" replace />;
  return <>
    <Navigation user={user} />
    <main>
      <section className={styles.detailHero}><div className={`container ${styles.detailHeroInner}`}><div className={styles.detailCopy}><Link className={styles.backLink} to="/"><ArrowLeft size={16} /> Giveaway home</Link><span className={styles.eyebrow}>{giveaway.label}</span><StatusPill status={giveaway.status} /><h1>Win a<br /><span>{giveaway.title}</span></h1><p>{giveaway.description} Review the entry fee and details, then decide if this one is for you.</p><div className={styles.detailCountdown}><span><Clock3 size={16} /> {isEnded ? 'GIVEAWAY ENDED' : isUpcoming ? 'GIVEAWAY STARTS SOON' : 'DRAW CLOSES IN'}</span>{!isEnded && <Countdown endsAt={isUpcoming ? giveaway.startsAt : giveaway.endsAt} onExpire={refreshGiveaway} />}</div><div className={styles.detailButtonRow}><button className={styles.primaryButton} type="button" disabled={isEnded || isUpcoming || isParticipating} onClick={handleEntry}>{joinLabel} <ArrowRight size={17} /></button>{user && !enoughBalance && !isParticipating && !isEnded && !isUpcoming && <span className={styles.balanceHint}>Balance {formatNumber(available)} {currencyName} · need {formatNumber(giveaway.fee.amount - available)} more</span>}</div>{isParticipating && <span className={styles.joinedNote}><Check size={16} /> Your participation has been recorded.</span>}{!user && <span className={styles.balanceHint}>Log in to securely check your balance and participate.</span>}{error && <span className={styles.inlineError} role="alert">{error}</span>}</div><div className={styles.detailVisualWrap}><ProductVisual type={giveaway.visual} title={giveaway.title} large /><span className={styles.detailValue}>{giveaway.value}<small>FEATURED REWARD</small></span></div></div></section>
      <section className={`container ${styles.detailContent}`}><div className={styles.detailMain}><div className={styles.detailCard}><div className={styles.detailCardHeading}><span className={styles.eyebrow}>THE IMPORTANT DETAILS</span><h2>Everything, up front.</h2></div><div className={styles.detailFacts}><div><span>Entry fee</span><strong>{formatFee(giveaway.fee)}</strong></div><div><span>Number of winners</span><strong>{giveaway.winners}</strong></div><div><span>Participants</span><strong>{formatNumber(giveaway.participants)}</strong></div><div><span>Draw date</span><strong>{dateLabel(giveaway.drawDate)}</strong></div></div>{user && <div className={`${styles.balanceBox} ${enoughBalance ? styles.balanceEnough : styles.balanceShort}`}><span>{enoughBalance ? <Check size={16} /> : <Clock3 size={16} />}</span><span><strong>Your balance: {formatNumber(available)} {currencyName}</strong><small>{enoughBalance ? 'You have enough for this entry.' : `You need ${formatNumber(Math.max(0, giveaway.fee.amount - available))} more ${currencyName} to participate.`}</small></span></div>}<div className={styles.policyNote}><ShieldCheck size={17} /><span>Participation is confirmed only after you review and accept the entry fee. The server checks your balance and records one entry per giveaway.</span></div></div>
        <div className={styles.detailCard}><span className={styles.eyebrow}>ABOUT THE PRIZE</span><h2>{giveaway.title}</h2><p>{giveaway.description} The reward and draw details shown here are sample project data; confirm final availability and terms before production.</p><div className={styles.aboutTags}><span><Trophy size={14} /> {giveaway.winners} {giveaway.winners === 1 ? 'winner' : 'winners'}</span><span><TicketCheck size={14} /> {giveaway.prizeType.replace('_', ' ')}</span><span><Clock3 size={14} /> Claim within {giveaway.claimDeadlineDays} days</span></div></div>
        <div className={styles.detailCard}><span className={styles.eyebrow}>A SIMPLE, CLEAR PROCESS</span><h2>How this giveaway works.</h2><ol className={styles.detailSteps}><li><span>01</span>Review the reward, eligibility and entry amount.</li><li><span>02</span>Check your balance in the required currency.</li><li><span>03</span>Confirm your participation; the server records it once.</li><li><span>04</span>Winners are announced after the draw is finalized.</li><li><span>05</span>If selected, submit only the details needed to claim.</li></ol></div>
        <div className={styles.detailCard}><span className={styles.eyebrow}>THE TERMS, CLEARLY STATED</span><h2>Giveaway terms &amp; conditions.</h2><div className={styles.detailFacts}><div><span>Eligibility</span><strong>{giveaway.eligibility}</strong></div><div><span>Entry requirement</span><strong>{formatFee(giveaway.fee)} · one per account</strong></div><div><span>Giveaway duration</span><strong>{dateLabel(giveaway.startsAt)} – {dateLabel(giveaway.endsAt)}</strong></div><div><span>Winner selection</span><strong>Authorized draw after giveaway ends</strong></div><div><span>Claim deadline</span><strong>{giveaway.claimDeadlineDays} days after announcement</strong></div><div><span>Refund policy</span><strong>Confirm the official VELOOP policy before launch</strong></div></div><button className={styles.rulesToggle} type="button" aria-expanded={showTerms} onClick={() => setShowTerms(!showTerms)}><span><strong>Important information &amp; event rules</strong></span><ChevronDown size={18} /></button>{showTerms && <div className={styles.rulesContent}>{giveaway.rules.map((rule) => <p key={rule}>{rule}</p>)}<p>Suspicious or abusive activity may be reviewed under the platform’s finalized rules. Review official eligibility, prize fulfillment and refund terms before participating.</p></div>}</div>
        {isParticipating && <div className={`${styles.balanceBox} ${styles.balanceEnough}`}><span><Check size={16} /></span><span><strong>Your entry: 1</strong><small>Participation recorded for this giveaway. Entry fee: {formatFee(giveaway.fee)}.</small></span></div>}
        {myStatus?.isWinner && <div className={styles.winnerClaimCard}><span className={styles.claimIcon}><Trophy size={22} /></span><div><span className={styles.eyebrow}>A MOMENT JUST FOR YOU</span><h2>Congratulations — you won!</h2><p>Your prize is ready to claim. Your details remain private.</p>{myStatus.claimStatus === 'EXPIRED' ? <span className={styles.balanceHint}>The claim window for this prize has ended.</span> : claimSent || myStatus.claimStatus ? <span className={styles.joinedNote}><Check size={15} /> {myStatus.claimStatus === 'COMPLETED' ? 'Prize delivered.' : myStatus.claimStatus === 'PROCESSING' ? 'Your claim is being processed.' : 'Claim submitted. Our team will review it.'}</span> : <button className={styles.primaryButton} type="button" onClick={() => setClaimOpen(true)}>Claim your prize <ArrowRight size={16} /></button>}</div></div>}
      </div><aside className={styles.detailAside}><div className={styles.stickyJoin}><span className={styles.eyebrow}>YOUR ENTRY, YOUR CALL</span><h3>{isParticipating ? 'You’re in.' : 'Interested in this one?'}</h3><p>{isParticipating ? 'Your participation has been recorded. One entry per user for this giveaway.' : 'Take a moment to review the fee and rules before you confirm.'}</p><div className={styles.asideFee}><span>ENTRY FEE</span><strong>{formatFee(giveaway.fee)}</strong></div><div className={styles.asideFee}><span>YOUR BALANCE</span><strong>{user ? `${formatNumber(available)} ${currencyName}` : 'Log in to check'}</strong></div><button className={styles.primaryButton} type="button" disabled={isEnded || isUpcoming || isParticipating} onClick={handleEntry}>{joinLabel} <ArrowRight size={16} /></button><small><LockKeyhole size={13} /> Secure, server-verified participation</small></div></aside></section>
      <section className={styles.detailFooterBand}><div className="container"><span><ShieldCheck size={18} /> Clear fees. Thoughtful rewards. Details you can trust.</span><Link to="/">Explore all rewards <ArrowRight size={15} /></Link></div></section>
    </main><Footer />
    {showConfirm && <Dialog title="REVIEW BEFORE YOU JOIN" labelledBy="confirm-title" onClose={() => setShowConfirm(false)}><span className={styles.modalIcon}><TicketCheck size={22} /></span><h2 id="confirm-title">Confirm your entry.</h2><p className={styles.modalDesc}>You’re about to enter the {giveaway.title} giveaway. The entry fee is deducted from your balance once confirmed.</p><div className={styles.confirmRows}><div><span>Entry fee</span><strong>{formatFee(giveaway.fee)}</strong></div><div><span>Your balance</span><strong>{formatNumber(available)} {currencyName}</strong></div><div><span>After joining</span><strong>{formatNumber(available - giveaway.fee.amount)} {currencyName}</strong></div></div><p className={styles.modalTerms}>By continuing, you confirm that you’ve reviewed this giveaway’s entry requirements and terms. One participation per account.</p>{error && <span className={styles.inlineError} role="alert">{error}</span>}<div className={styles.modalActions}><button className={styles.secondaryButton} type="button" onClick={() => setShowConfirm(false)}>Not now</button><button className={styles.primaryButton} type="button" disabled={joining} onClick={confirmJoin}>{joining ? 'Joining giveaway…' : 'Confirm & join'} {!joining && <ArrowRight size={16} />}</button></div></Dialog>}
    {claimOpen && <Dialog title="YOUR REWARD, YOUR DETAILS" labelledBy="claim-title" onClose={() => setClaimOpen(false)}><h2 id="claim-title">{claimSent ? 'Claim submitted.' : giveaway.prizeType === 'GIFT_CARD' ? 'Claim your gift card.' : 'Claim your prize.'}</h2>{claimSent ? <><p className={styles.modalDesc}>Your details were submitted securely. Our team will review your claim.</p><button className={styles.primaryButton} type="button" onClick={() => setClaimOpen(false)}>Done <Check size={16} /></button></> : <><p className={styles.modalDesc}>We only ask for details needed to deliver your reward. This form is available only to the selected winner.</p><form className={styles.claimForm} onSubmit={submitClaim}>{giveaway.prizeType === 'GIFT_CARD' || giveaway.prizeType === 'DIGITAL' ? <label>Email address<input name="email" autoComplete="email" type="email" required maxLength={254} /></label> : <><label>Full name<input name="fullName" autoComplete="name" required maxLength={100} /></label><label>Phone number<input name="phone" autoComplete="tel" type="tel" required maxLength={20} /></label><label>Address<input name="address" autoComplete="street-address" required maxLength={250} /></label><div className={styles.claimFormRow}><label>City<input name="city" autoComplete="address-level2" required maxLength={100} /></label><label>State<input name="state" autoComplete="address-level1" required maxLength={100} /></label><label>PIN code<input name="pinCode" autoComplete="postal-code" required maxLength={10} /></label></div></>}{claimError && <span className={styles.inlineError} role="alert">{claimError}</span>}<button className={styles.primaryButton} type="submit" disabled={claimBusy}>{claimBusy ? 'Submitting claim…' : 'Submit claim'} {!claimBusy && <ArrowRight size={16} />}</button></form></>}</Dialog>}
  </>;
}

function AuthPage({ mode, setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await apiRequest(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(fields) });
      localStorage.setItem('veloop-demo-token', result.token);
      setUser(result.user);
      navigate('/');
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  return <><Navigation /><main className={styles.authPage}><Link className={styles.backLink} to="/"><ArrowLeft size={16} /> Giveaway home</Link><section className={styles.authCard}><span className={styles.authIcon}><Gift size={22} /></span><span className={styles.eyebrow}>YOUR VELOOP REWARDS ACCOUNT</span><h1>{mode === 'login' ? 'Welcome back.' : 'A little more joy.'}</h1><p>{mode === 'login' ? 'Log in to review your balance and take part.' : 'Create an account to explore your rewards.'}</p><form className={styles.claimForm} onSubmit={submit}>{mode === 'signup' && <label>Your name<input name="name" autoComplete="name" required maxLength={80} /></label>}<label>Email address<input name="email" autoComplete="email" type="email" required maxLength={254} /></label><label>Password<input name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={8} required /></label>{error && <span className={styles.inlineError} role="alert">{error}</span>}<button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={16} /></button></form><p className={styles.authSwitch}>{mode === 'login' ? 'New to VELOOP?' : 'Already have an account?'} <Link to={mode === 'login' ? '/signup' : '/login'}>{mode === 'login' ? 'Create an account' : 'Log in'}</Link></p><span className={styles.demoNote}>Development demo · Do not use personal passwords.</span></section></main><Footer /></>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('veloop-demo-token');
    if (!token) {
      setAuthReady(true);
      return;
    }
    apiRequest('/api/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error) => {
        if (error.status === 401) localStorage.removeItem('veloop-demo-token');
      })
      .finally(() => setAuthReady(true));
  }, []);
  function logout() {
    localStorage.removeItem('veloop-demo-token');
    setUser(null);
  }
  const home = useMemo(() => <HomePage user={user} onLogout={logout} />, [user]);
  return <Routes><Route path="/" element={home} /><Route path="/giveaway/:slug" element={<GiveawayDetails user={user} onUserChange={setUser} />} /><Route path="/admin" element={authReady ? <AdminDashboard user={user} onLogout={logout} /> : <LoadingState />} /><Route path="/login" element={<AuthPage mode="login" setUser={setUser} />} /><Route path="/signup" element={<AuthPage mode="signup" setUser={setUser} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
