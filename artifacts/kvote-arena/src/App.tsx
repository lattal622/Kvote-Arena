import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { hrHR } from '@clerk/localizations';
import { getGetFootballApiSettingsQueryKey, useGetFootballApiSettings, useSaveFootballApiKey, useDeleteFootballApiKey } from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowRight, Banknote,
  Check, CheckCircle2, CircleHelp, ClipboardList, Clock3, Crosshair, Download, Goal,
  Hand, LayoutDashboard, Plus, RotateCcw, Settings2,
  ShieldCheck, ShoppingBasket, Smartphone, Sparkles, Trash2, Trophy, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Sport = 'Nogomet' | 'Rukomet' | 'Košarka';
type Selection = { id: string; label: string; odds: number };
type Market = { id: string; name: string; selections: Selection[] };
type DemoMatch = {
  id: string; sport: Sport; competition: string; startAt: string; status: 'upcoming' | 'live';
  home: string; away: string; score?: string; markets: Market[];
};
type Pick = {
  matchId: string; marketId: string; selectionId: string; matchName: string;
  marketName: string; selectionLabel: string; odds: number; status?: 'correct' | 'incorrect' | 'pending';
};
type Ticket = {
  id: string; createdAt: string; stake: number; totalOdds: number; potentialReturn: number;
  status: 'active' | 'won' | 'lost'; picks: Pick[];
};
type AppState = { picks: Pick[]; tickets: Ticket[] };
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const STORE_KEY = 'kvote-arena-state-v1';
const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
const dateIn = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const market = (id: string, name: string, selections: [string, number][]): Market => ({
  id, name, selections: selections.map(([label, odds], index) => ({ id: `${id}-${index}`, label, odds })),
});
const demoMatches: DemoMatch[] = [
  {
    id: 'n-001', sport: 'Nogomet', competition: 'Hrvatska · Prva liga', startAt: dateIn(0, 20), status: 'upcoming',
    home: 'Dinamo Zagreb', away: 'Hajduk Split',
    markets: [
      market('n001-1x2', 'Konačan ishod', [['1', 2.08], ['X', 3.32], ['2', 3.48]]),
      market('n001-dc', 'Dvostruka šansa', [['1X', 1.31], ['12', 1.26], ['X2', 1.67]]),
      market('n001-goals', 'Ukupno golova', [['Više 2.5', 1.86], ['Manje 2.5', 1.91]]),
      market('n001-btts', 'Oba daju gol', [['Da', 1.72], ['Ne', 2.04]]),
    ],
  },
  {
    id: 'n-002', sport: 'Nogomet', competition: 'Engleska · Premier Division', startAt: dateIn(0, 18), status: 'upcoming',
    home: 'Arsenal', away: 'Liverpool',
    markets: [
      market('n002-1x2', 'Konačan ishod', [['1', 2.36], ['X', 3.61], ['2', 2.84]]),
      market('n002-dc', 'Dvostruka šansa', [['1X', 1.42], ['12', 1.27], ['X2', 1.55]]),
      market('n002-goals', 'Ukupno golova', [['Više 2.5', 1.68], ['Manje 2.5', 2.15]]),
      market('n002-btts', 'Oba daju gol', [['Da', 1.61], ['Ne', 2.22]]),
    ],
  },
  {
    id: 'n-003', sport: 'Nogomet', competition: 'Španjolska · Liga', startAt: dateIn(1, 21), status: 'upcoming',
    home: 'Real Sociedad', away: 'Sevilla', markets: [
      market('n003-1x2', 'Konačan ishod', [['1', 1.94], ['X', 3.46], ['2', 4.08]]),
      market('n003-dc', 'Dvostruka šansa', [['1X', 1.23], ['12', 1.29], ['X2', 1.82]]),
      market('n003-goals', 'Ukupno golova', [['Više 2.5', 2.02], ['Manje 2.5', 1.74]]),
    ],
  },
  {
    id: 'r-001', sport: 'Rukomet', competition: 'EHF Liga prvaka', startAt: dateIn(0, 19), status: 'upcoming',
    home: 'RK Zagreb', away: 'THW Kiel', markets: [
      market('r001-winner', 'Pobjednik', [['1', 2.42], ['X', 8.20], ['2', 1.74]]),
      market('r001-dc', 'Dvostruka šansa', [['1X', 1.86], ['12', 1.06], ['X2', 1.32]]),
      market('r001-total', 'Ukupno golova', [['Više 59.5', 1.89], ['Manje 59.5', 1.88]]),
    ],
  },
  {
    id: 'r-002', sport: 'Rukomet', competition: 'Hrvatska · Paket24 Premijer liga', startAt: dateIn(1, 18), status: 'upcoming',
    home: 'Nexe Našice', away: 'RK Poreč', markets: [
      market('r002-winner', 'Pobjednik', [['1', 1.34], ['X', 9.40], ['2', 4.55]]),
      market('r002-dc', 'Dvostruka šansa', [['1X', 1.09], ['12', 1.05], ['X2', 2.73]]),
      market('r002-total', 'Ukupno golova', [['Više 57.5', 1.77], ['Manje 57.5', 2.01]]),
    ],
  },
  {
    id: 'b-001', sport: 'Košarka', competition: 'EuroLeague', startAt: dateIn(0, 20), status: 'upcoming',
    home: 'Partizan', away: 'Olimpia Milano', markets: [
      market('b001-winner', 'Pobjednik', [['1', 1.71], ['2', 2.12]]),
      market('b001-dc', 'Pobjednik uključujući produžetke', [['1', 1.68], ['2', 2.16]]),
      market('b001-total', 'Ukupno poena', [['Više 163.5', 1.91], ['Manje 163.5', 1.86]]),
    ],
  },
  {
    id: 'b-002', sport: 'Košarka', competition: 'Hrvatska · Premijer liga', startAt: dateIn(1, 19), status: 'upcoming',
    home: 'KK Zadar', away: 'KK Cibona', markets: [
      market('b002-winner', 'Pobjednik', [['1', 1.44], ['2', 2.73]]),
      market('b002-total', 'Ukupno poena', [['Više 157.5', 1.89], ['Manje 157.5', 1.90]]),
      market('b002-spread', 'Hendikep', [['Zadar -4.5', 1.93], ['Cibona +4.5', 1.87]]),
    ],
  },
  {
    id: 'b-003', sport: 'Košarka', competition: 'NBA · Izložbena utakmica', startAt: dateIn(2, 2), status: 'upcoming',
    home: 'Boston Celtics', away: 'Denver Nuggets', markets: [
      market('b003-winner', 'Pobjednik', [['1', 1.82], ['2', 2.02]]),
      market('b003-total', 'Ukupno poena', [['Više 224.5', 1.91], ['Manje 224.5', 1.87]]),
      market('b003-spread', 'Hendikep', [['Boston -2.5', 1.90], ['Denver +2.5', 1.91]]),
    ],
  },
];

const settledSample: Ticket[] = [
  {
    id: 'DEMO-0281', createdAt: dateIn(-1, 21), stake: 30, totalOdds: 2.08, potentialReturn: 62.4, status: 'won',
    picks: [{ matchId: 'old-zag', marketId: 'old', selectionId: 'old', matchName: 'Varaždin – Osijek', marketName: 'Konačan ishod', selectionLabel: 'Osijek pobjeđuje', odds: 2.08, status: 'correct' }],
  },
  {
    id: 'DEMO-0279', createdAt: dateIn(-2, 20), stake: 25, totalOdds: 3.16, potentialReturn: 79, status: 'lost',
    picks: [
      { matchId: 'old-a', marketId: 'old', selectionId: 'old', matchName: 'Rijeka – Lokomotiva', marketName: 'Konačan ishod', selectionLabel: 'Rijeka pobjeđuje', odds: 1.62, status: 'correct' },
      { matchId: 'old-b', marketId: 'old', selectionId: 'old', matchName: 'RK Zagreb – Aalborg', marketName: 'Pobjednik', selectionLabel: 'RK Zagreb pobjeđuje', odds: 1.95, status: 'incorrect' },
    ],
  },
];
const initialState: AppState = { picks: [], tickets: settledSample };
const navItems: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/app', label: 'Pregled', icon: LayoutDashboard },
  { path: '/football', label: 'Nogomet', icon: Goal },
  { path: '/handball', label: 'Rukomet', icon: Hand },
  { path: '/basketball', label: 'Košarka', icon: Activity },
  { path: '/tickets', label: 'Moji listići', icon: ClipboardList },
  { path: '/settings', label: 'Postavke', icon: Settings2 },
];
const pathToSport: Record<string, Sport> = { '/football': 'Nogomet', '/handball': 'Rukomet', '/basketball': 'Košarka' };

function readStore(userId: string | undefined): AppState {
  if (!userId) return { picks: [], tickets: [] };
  try {
    const stored = localStorage.getItem(`${STORE_KEY}:${userId}`);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored) as Partial<AppState>;
    return {
      picks: Array.isArray(parsed.picks) ? parsed.picks : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : initialState.tickets,
    };
  } catch { return initialState; }
}
function formatCredits(value: number) { return `${new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 2 }).format(value)} demo €`; }
function formatUnlimitedBalance() { return '∞ demo €'; }
function formatDate(value: string) {
  return new Intl.DateTimeFormat('hr-HR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function initials(name: string) { return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase(); }
function Router() {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const userId = user?.id;
  const loadedUser = useRef<string | undefined>(undefined);
  const [store, setStore] = useState<AppState>(() => readStore(userId));
  const [stake, setStake] = useState('25');
  const [toast, setToast] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'active' | 'settled'>('all');

  useEffect(() => { if (userId && loadedUser.current !== userId) { loadedUser.current = userId; setStore(readStore(userId)); } }, [userId]);
  useEffect(() => { if (userId && loadedUser.current === userId) localStorage.setItem(`${STORE_KEY}:${userId}`, JSON.stringify(store)); }, [store, userId]);
  useEffect(() => {
    const promptHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', promptHandler);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => undefined);
    return () => { window.removeEventListener('beforeinstallprompt', promptHandler); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const totalOdds = useMemo(() => store.picks.reduce((total, pick) => total * pick.odds, 1), [store.picks]);
  const stakeValue = Number(stake) || 0;
  const potentialReturn = totalOdds * stakeValue;
  const setPick = (match: DemoMatch, marketItem: Market, selection: Selection) => {
    setStore((current) => {
      const exists = current.picks.some((pick) => pick.matchId === match.id && pick.marketId === marketItem.id && pick.selectionId === selection.id);
      const withoutMarket = current.picks.filter((pick) => !(pick.matchId === match.id && pick.marketId === marketItem.id));
      if (exists) return { ...current, picks: withoutMarket };
      return { ...current, picks: [...withoutMarket, {
        matchId: match.id, marketId: marketItem.id, selectionId: selection.id,
        matchName: `${match.home} – ${match.away}`, marketName: marketItem.name,
        selectionLabel: selection.label, odds: selection.odds, status: 'pending',
      }] };
    });
  };
  const removePick = (pick: Pick) => setStore((current) => ({
    ...current, picks: current.picks.filter((item) => !(item.matchId === pick.matchId && item.marketId === pick.marketId && item.selectionId === pick.selectionId)),
  }));
  const submitTicket = () => {
    if (!store.picks.length) { setToast('Dodajte barem jedan odabir na listić.'); return; }
    if (!Number.isFinite(stakeValue) || stakeValue <= 0 || !Number.isFinite(potentialReturn)) { setToast('Unesite valjan demo ulog koji se može izračunati.'); return; }
    const ticket: Ticket = {
      id: `KA-${Date.now().toString().slice(-7)}`, createdAt: new Date().toISOString(),
      stake: stakeValue, totalOdds: Number(totalOdds.toFixed(2)), potentialReturn: Number(potentialReturn.toFixed(2)),
      status: 'active', picks: store.picks.map((pick) => ({ ...pick, status: 'pending' })),
    };
    setStore((current) => ({ ...current, picks: [], tickets: [ticket, ...current.tickets] }));
    setStake('25');
    setToast('Listić je potvrđen u demo načinu.');
    setLocation('/tickets');
  };
  const clearStore = () => {
    if (!window.confirm('Želite li obrisati spremljene listiće, odabire i vratiti početno virtualno stanje?')) return;
    setStore({ picks: [], tickets: [] });
    setStake('25');
    setToast('Demo podaci su vraćeni na početno stanje.');
  };
  const installApp = async () => {
    if (!installPrompt) { setToast('Za instalaciju otvorite izbornik preglednika i odaberite „Dodaj na početni zaslon”.'); return; }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setToast('Kvote Arena dodana je na uređaj.');
    setInstallPrompt(null);
  };
  const renderMatches = (sport?: Sport, featured = false): ReactNode => {
    const matches = demoMatches.filter((match) => !sport || match.sport === sport).slice(0, featured ? 4 : undefined);
    if (!matches.length) return <EmptyState title="Nema utakmica" body="Trenutačno nema dostupnih demo utakmica za ovaj sport." />;
    return <div className="matches-list">{matches.map((match) =>
      <MatchCard key={match.id} match={match} picks={store.picks} onSelect={setPick} />
    )}</div>;
  };

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Glavna navigacija">
        <Link href="/app" className="brand" data-testid="link-brand-home">
          <span className="brand-mark"><Crosshair size={20} strokeWidth={2.5} /></span>
          <span className="brand-word">kvote<span>arena</span></span>
        </Link>
        <div className="nav-caption">Arena</div>
        <nav className="nav-list">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link href={path} key={path} className={`nav-link ${location === path ? 'active' : ''}`} data-testid={`nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} strokeWidth={1.9} /><span className="nav-label">{label}</span>
              {path === '/tickets' && store.tickets.some((ticket) => ticket.status === 'active') && <span className="nav-count">{store.tickets.filter((ticket) => ticket.status === 'active').length}</span>}
            </Link>
          ))}
        </nav>
        <div className="nav-bottom">
          <div className="nav-sim-note"><strong>Sigurna demo arena</strong><p>Igra se samo virtualnim kreditima. Nema uplata ni stvarnih dobitaka.</p></div>
          <Link href="/settings" className="nav-link" data-testid="nav-help"><CircleHelp size={17} /><span className="nav-label">Pomoć i informacije</span></Link>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="top-meta"><span className="live-dot" /><span>Demo arena</span><span className="desktop-only">· Podaci i kvote su simulirani</span></div>
          <div className="top-actions"><div className="balance-chip" data-testid="text-virtual-balance"><Banknote size={15} color="#75e3a8" /><span>Virtualno stanje</span><strong>{formatUnlimitedBalance()}</strong></div><ProfileControl /></div>
        </header>
        <Switch>
          <Route path="/app">
            <div className="page-wrap">
              <div className="page-heading">
                <div><div className="eyebrow">Dobro došli u svoju sportsku arenu</div><h1>Odaberi. Složi. Igraj.</h1><p className="page-subtitle">Isprobaj sportske prognoze uz virtualne kredite — bez rizika i bez stvarnog novca.</p></div>
                <span className="demo-pill"><Sparkles size={13} /> ISKLJUČIVO DEMO</span>
              </div>
              <section className="hero-banner" data-testid="panel-featured">
                <div className="hero-copy"><div className="eyebrow">Tvoja arena, tvoja pravila</div><h2>Prati utakmice. Testiraj svoje sportsko znanje.</h2><p>Od nogometa do košarke, istraži izmišljene kvote i složi listić samo za zabavu. Rezultati su jasno označeni kao demo.</p></div>
                <div className="hero-stat"><span>Raspoloživi demo ulog</span><strong>∞</strong><small>virtualnih eura</small></div>
              </section>
              <div className="content-with-slip">
                <section>
                  <div className="section-head"><h2>Utakmice za danas</h2><span>{demoMatches.length} demo događaja</span></div>
                  {renderMatches(undefined, true)}
                  <div className="section-head"><h2>Upoznaj sportove</h2><span>Odaberi svoju igru</span></div>
                  <SportQuickLinks />
                  <p className="footer-note">Sve utakmice, rezultati i kvote prikazani su kao izmišljeni primjeri za demonstraciju. Kvote Arena nije usluga klađenja.</p>
                </section>
                <BetSlip picks={store.picks} stake={stake} setStake={setStake} totalOdds={totalOdds} potentialReturn={potentialReturn} removePick={removePick} clearPicks={() => setStore((current) => ({ ...current, picks: [] }))} onSubmit={submitTicket} />
              </div>
            </div>
          </Route>
          <Route path="/football"><SportPage sport="Nogomet" icon={Goal} renderMatches={renderMatches} store={store} stake={stake} setStake={setStake} totalOdds={totalOdds} potentialReturn={potentialReturn} removePick={removePick} setStore={setStore} onSubmit={submitTicket} /></Route>
          <Route path="/handball"><SportPage sport="Rukomet" icon={Hand} renderMatches={renderMatches} store={store} stake={stake} setStake={setStake} totalOdds={totalOdds} potentialReturn={potentialReturn} removePick={removePick} setStore={setStore} onSubmit={submitTicket} /></Route>
          <Route path="/basketball"><SportPage sport="Košarka" icon={Activity} renderMatches={renderMatches} store={store} stake={stake} setStake={setStake} totalOdds={totalOdds} potentialReturn={potentialReturn} removePick={removePick} setStore={setStore} onSubmit={submitTicket} /></Route>
          <Route path="/tickets">
            <div className="page-wrap">
              <PageTitle eyebrow="Tvoja evidencija" title="Moji listići" subtitle="Pregled aktivnih i demo zaključenih listića." />
              <div className="ticket-tabs" role="tablist" aria-label="Filtriraj listiće">
                {(['all', 'active', 'settled'] as const).map((filter) => <button key={filter} className={ticketFilter === filter ? 'active' : ''} onClick={() => setTicketFilter(filter)} data-testid={`filter-tickets-${filter}`}>{filter === 'all' ? 'Svi' : filter === 'active' ? 'Aktivni' : 'Zaključeni'}</button>)}
              </div>
              <TicketList tickets={store.tickets.filter((ticket) => ticketFilter === 'all' || (ticketFilter === 'active' ? ticket.status === 'active' : ticket.status !== 'active'))} />
              <p className="footer-note">Zaključeni rezultati su unaprijed pripremljeni demo primjeri. Virtualni povrat nema novčanu vrijednost.</p>
            </div>
          </Route>
          <Route path="/settings">
            <div className="page-wrap">
              <PageTitle eyebrow="Tvoja arena" title="Postavke" subtitle="Virtualno stanje, status podataka i informacije za instalaciju." />
              <div className="settings-grid">
                <section className="settings-card">
                  <h2><Banknote size={17} color="#82dda2" /> Virtualni novčanik</h2><p>Ovo stanje služi samo za simulaciju. Ne može se uplatiti, isplatiti niti pretvoriti u novac.</p>
                  <div className="setting-row"><span>Raspoloživi demo ulog</span><strong>{formatUnlimitedBalance()}</strong></div>
                  <div className="setting-row"><span>Ukupno listića</span><strong>{store.tickets.length}</strong></div>
                  <div className="settings-actions"><button className="secondary-button danger" onClick={clearStore} data-testid="button-reset-demo"><RotateCcw size={14} /> Vrati demo podatke</button></div>
                </section>
                <FootballApiSettingsCard />
                <section className="settings-card">
                  <h2><Smartphone size={17} color="#82dda2" /> Instaliraj aplikaciju</h2><p>Kvote Arena može se instalirati na početni zaslon ako instalaciju podržava tvoj preglednik.</p>
                  <button className="secondary-button" onClick={installApp} data-testid="button-install-app"><Plus size={14} /> {installPrompt ? 'Instaliraj aplikaciju' : 'Upute za instalaciju'}</button>
                  <div className="install-note">Na mobitelu otvori izbornik preglednika i odaberi „Dodaj na početni zaslon” ili „Instaliraj aplikaciju”.</div>
                </section>
                <section className="settings-card">
                  <h2><ShieldCheck size={17} color="#82dda2" /> Igraj odgovorno</h2><p>Ovo je sportska simulacija za zabavu i učenje. Ovdje nema uplata, stvarnog klađenja, isplata ni novčanih dobitaka.</p>
                  <div className="setting-row"><span>Podaci se spremaju</span><strong>Na ovom uređaju</strong></div>
                  <div className="setting-row"><span>Live sportski podaci</span><strong style={{ color: '#dfc17d', fontSize: 11 }}>Nisu uključeni</strong></div>
                </section>
                <section className="settings-card">
                  <h2><Download size={17} color="#82dda2" /> Preuzmi projekt</h2><p>Preuzmi izvorni kod i potrebne projektne datoteke u ZIP arhivi.</p>
                  <a className="secondary-button" href={`${import.meta.env.BASE_URL}kvote-arena-source.zip`} download data-testid="link-download-project"><Download size={14} /> Preuzmi ZIP projekta</a>
                </section>
              </div>
              <p className="footer-note">Postavke i virtualno stanje čuvaju se lokalno u pregledniku. Brisanje podataka preglednika može ukloniti tvoje spremljene listiće.</p>
            </div>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      <MobileNav location={location} />
      {toast && <div role="status" className="toast-message" data-testid="status-toast"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div><span className="demo-pill"><Sparkles size={13} /> DEMO KVOTE</span></div>;
}
function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state" data-testid="state-empty"><Trophy size={24} /><strong>{title}</strong><p>{body}</p></div>;
}
function MobileNav({ location }: { location: string }) {
  const items = navItems.filter((item) => item.path !== '/settings');
  return <nav className="mobile-nav" aria-label="Mobilna navigacija">{items.map(({ path, label, icon: Icon }) => <Link href={path} key={path} className={location === path ? 'active' : ''} data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon /><span>{label === 'Moji listići' ? 'Listići' : label}</span></Link>)}</nav>;
}
function SportQuickLinks() {
  return <div className="quick-links">
    {[
      { path: '/football', title: 'Nogomet', sub: '1X2 · Golovi · Oba daju gol', icon: Goal, count: '3 utakmice' },
      { path: '/handball', title: 'Rukomet', sub: 'Pobjednik · Ukupno golova', icon: Hand, count: '2 utakmice' },
      { path: '/basketball', title: 'Košarka', sub: 'Pobjednik · Ukupno poena', icon: Activity, count: '3 utakmice' },
    ].map(({ path, title, sub, icon: Icon, count }) => <Link href={path} className="quick-link" key={path} data-testid={`link-sport-${title.toLowerCase()}`}>
      <span className="quick-icon"><Icon size={18} /></span><span className="quick-copy"><strong>{title}</strong><small>{sub}</small></span><span className="quick-count">{count}</span><ArrowRight size={15} className="quick-arrow" />
    </Link>)}
  </div>;
}

function MatchCard({ match, picks, onSelect }: { match: DemoMatch; picks: Pick[]; onSelect: (match: DemoMatch, market: Market, selection: Selection) => void }) {
  const Icon = match.sport === 'Nogomet' ? Goal : match.sport === 'Rukomet' ? Hand : Activity;
  const mainMarket = match.markets[0];
  const selected = (marketItem: Market, selection: Selection) => picks.some((pick) => pick.matchId === match.id && pick.marketId === marketItem.id && pick.selectionId === selection.id);
  return <article className="match-card" data-testid={`card-match-${match.id}`}>
    <div className="match-top"><div className="league-label"><span className="league-mark"><Icon size={13} /></span>{match.competition}</div><div className="match-time"><Clock3 size={12} />{formatDate(match.startAt)}</div></div>
    <div className="match-body">
      <div className="team"><span className="team-badge">{initials(match.home)}</span><span>{match.home}</span></div>
      <div className="vs-box">POČETAK<strong>VS</strong></div>
      <div className="team away"><span>{match.away}</span><span className="team-badge">{initials(match.away)}</span></div>
    </div>
    <div className="market-title">{mainMarket.name} <span>· DEMO KVOTE</span></div>
    <div className="markets-grid">{mainMarket.selections.map((selection) => <MarketButton key={selection.id} selection={selection} isSelected={selected(mainMarket, selection)} onClick={() => onSelect(match, mainMarket, selection)} matchId={match.id} />)}</div>
    <details className="more-markets">
      <summary data-testid={`button-markets-${match.id}`}>Prikaži sva tržišta <ArrowRight size={12} /></summary>
      <div className="additional-markets">{match.markets.slice(1).map((marketItem) => <div key={marketItem.id}><div className="market-title">{marketItem.name}</div><div className="markets-grid">{marketItem.selections.map((selection) => <MarketButton key={selection.id} selection={selection} isSelected={selected(marketItem, selection)} onClick={() => onSelect(match, marketItem, selection)} matchId={match.id} />)}</div></div>)}</div>
    </details>
  </article>;
}
function MarketButton({ selection, isSelected, onClick, matchId }: { selection: Selection; isSelected: boolean; onClick: () => void; matchId: string }) {
  return <button className={`market-button ${isSelected ? 'selected' : ''}`} onClick={onClick} aria-pressed={isSelected} data-testid={`button-pick-${matchId}-${selection.id}`}><span>{selection.label}</span><strong>{selection.odds.toFixed(2)}</strong></button>;
}
function BetSlip({ picks, stake, setStake, totalOdds, potentialReturn, removePick, clearPicks, onSubmit }: {
  picks: Pick[]; stake: string; setStake: (value: string) => void; totalOdds: number; potentialReturn: number;
  removePick: (pick: Pick) => void; clearPicks: () => void; onSubmit: () => void;
}) {
  return <aside className="slip-panel" data-testid="panel-bet-slip">
    <div className="slip-head"><h2><ShoppingBasket size={16} color="#81dfa5" /> Tvoj listić <span className="slip-count">{picks.length}</span></h2>{picks.length > 0 && <button className="text-action" onClick={clearPicks} data-testid="button-clear-picks"><Trash2 size={12} /> Očisti</button>}</div>
    {picks.length ? <div className="slip-picks">{picks.map((pick) => <div className="slip-pick" key={`${pick.matchId}-${pick.marketId}`} data-testid={`slip-pick-${pick.matchId}-${pick.marketId}`}>
      <div className="slip-pick-top"><span>{pick.matchName}</span><span>{pick.marketName}</span></div>
      <button className="remove-pick" aria-label={`Ukloni odabir ${pick.selectionLabel}`} onClick={() => removePick(pick)} data-testid={`button-remove-pick-${pick.matchId}-${pick.marketId}`}><X size={13} /></button>
      <div className="slip-pick-name">{pick.selectionLabel}</div><div className="slip-pick-bottom"><span>Demo kvota</span><strong>{pick.odds.toFixed(2)}</strong></div>
    </div>)}</div> : <div className="slip-empty"><ShoppingBasket size={23} /><strong>Listić čeka tvoj odabir</strong><p>Odaberi ishod na utakmici i ovdje ćeš vidjeti svoj demo listić.</p></div>}
    <div className="slip-form">
      <label className="stake-label" htmlFor="stake-amount"><span>Virtualni ulog</span><span>Raspoloživo: neograničeno</span></label>
      <div className="stake-field"><input id="stake-amount" type="number" min="0.01" step="0.01" value={stake} onChange={(event) => setStake(event.target.value)} data-testid="input-stake" /><span className="stake-currency">demo €</span></div>
      <div className="return-row"><span>Ukupna demo kvota · {totalOdds.toFixed(2)}</span><strong>{formatCredits(potentialReturn)}</strong></div>
      <button className="submit-button" disabled={!picks.length || !Number.isFinite(Number(stake)) || Number(stake) <= 0 || !Number.isFinite(potentialReturn)} onClick={onSubmit} data-testid="button-submit-ticket"><Check size={15} /> Potvrdi demo listić</button>
      <p className="slip-footnote">Samo za simulaciju. Nema stvarnog novca ni isplate.</p>
    </div>
  </aside>;
}

function SportPage({ sport, icon: Icon, renderMatches, store, stake, setStake, totalOdds, potentialReturn, removePick, setStore, onSubmit }: {
  sport: Sport; icon: LucideIcon; renderMatches: (sport?: Sport, featured?: boolean) => ReactNode; store: AppState;
  stake: string; setStake: (value: string) => void; totalOdds: number; potentialReturn: number;
  removePick: (pick: Pick) => void; setStore: Dispatch<SetStateAction<AppState>>; onSubmit: () => void;
}) {
  const descriptions: Record<Sport, string> = {
    Nogomet: 'Istraži demo tržišta za konačan ishod, dvostruku šansu, broj golova i oba daju gol.',
    Rukomet: 'Isprobaj prognoze pobjednika, dvostruke šanse i ukupnog broja pogodaka.',
    Košarka: 'Složi demo odabire za pobjednika, ukupne poene i hendikep.',
  };
  return <div className="page-wrap">
    <PageTitle eyebrow="Sport · Demo ponuda" title={sport} subtitle={descriptions[sport]} />
    <div className="sport-tabs">{navItems.slice(1, 4).map((item) => {
      const SportIcon = item.icon;
      return <Link key={item.path} href={item.path} className={`sport-tab ${pathToSport[item.path] === sport ? 'active' : ''}`} data-testid={`tab-sport-${item.label.toLowerCase()}`}><SportIcon size={14} />{item.label}</Link>;
    })}</div>
    <div className="content-with-slip">
      <section><div className="section-head"><h2><Icon size={17} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#78dda2' }} />Utakmice · {sport}</h2><span>Izmišljene demo kvote</span></div>{renderMatches(sport)}</section>
      <BetSlip picks={store.picks} stake={stake} setStake={setStake} totalOdds={totalOdds} potentialReturn={potentialReturn} removePick={removePick} clearPicks={() => setStore((current) => ({ ...current, picks: [] }))} onSubmit={onSubmit} />
    </div>
  </div>;
}

function TicketList({ tickets }: { tickets: Ticket[] }) {
  if (!tickets.length) return <EmptyState title="Još nema listića u ovom prikazu" body="Kad potvrdiš demo listić, pronaći ćeš ga ovdje. Zaključeni primjeri prikazuju ishod s jasnom zelenom kvačicom ili crvenim X." />;
  return <div className="ticket-list">{tickets.map((ticket) => <article className="ticket-card" key={ticket.id} data-testid={`card-ticket-${ticket.id}`}>
    <div className="ticket-card-head"><div className="ticket-ref"><ClipboardList size={15} color="#74d99d" /><strong>{ticket.id}</strong><span>{formatDate(ticket.createdAt)}</span></div><span className={`ticket-status ${ticket.status}`}><TicketStatusIcon status={ticket.status} />{ticket.status === 'active' ? 'Aktivan' : ticket.status === 'won' ? 'Točan listić' : 'Netočan listić'}</span></div>
    <div className="ticket-picks">{ticket.picks.map((pick, index) => <div className="ticket-pick-row" key={`${ticket.id}-${index}`} data-testid={`ticket-pick-${ticket.id}-${index}`}>
      <span className={`pick-result-icon ${pick.status === 'correct' ? 'correct' : pick.status === 'incorrect' ? 'incorrect' : 'pending'}`}>{pick.status === 'correct' ? <Check size={13} /> : pick.status === 'incorrect' ? <X size={13} /> : <Clock3 size={12} />}</span>
      <div className="ticket-pick-details"><strong>{pick.matchName}</strong><span>{pick.marketName} · {pick.selectionLabel}{pick.status === 'correct' ? ' · Točno' : pick.status === 'incorrect' ? ' · Netočno' : ' · Čeka ishod'}</span></div><span className="ticket-pick-odds">{pick.odds.toFixed(2)}</span>
    </div>)}</div>
    <div className="ticket-summary"><span>Ulog<b>{formatCredits(ticket.stake)}</b></span><span>Ukupna kvota<b>{ticket.totalOdds.toFixed(2)}</b></span><span className="ticket-return">{ticket.status === 'lost' ? 'Demo povrat' : 'Mogući povrat'}<b>{formatCredits(ticket.potentialReturn)}</b></span></div>
  </article>)}</div>;
}
function TicketStatusIcon({ status }: { status: Ticket['status'] }) {
  if (status === 'won') return <CheckCircle2 size={12} />;
  if (status === 'lost') return <X size={12} />;
  return <Clock3 size={12} />;
}

function HomeGate() {
  return <><Show when="signed-in"><Redirect to="/app" /></Show><Show when="signed-out"><LandingPage /></Show></>;
}
function AuthenticatedApplication() {
  return <><Show when="signed-in"><Router /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function LandingPage() {
  return <main className="landing">
    <header className="landing-nav"><Link href="/" className="brand"><span className="brand-mark"><Crosshair size={20} /></span><span className="brand-word">kvote<span>arena</span></span></Link><span className="landing-trust"><span className="live-dot" /> VIRTUALNO, UVIJEK</span><div className="landing-links"><Link href="/sign-in" className="landing-login">Prijava</Link><Link href="/sign-up" className="landing-cta">Otvori arenu <ArrowRight size={15} /></Link></div></header>
    <section className="landing-hero">
      <div className="landing-kicker"><span>HR</span> SPORTSKA ARENA ZA NAVIJAČE <span className="kicker-line" /></div>
      <h1>Čitaj igru.<br /><em>Ne riskiraj.</em></h1>
      <p>Isprobaj nogometna, rukometna i košarkaška tržišta uz virtualne listiće. Bez uplata. Bez isplata. Samo ti i tvoja procjena.</p>
      <div className="landing-buttons"><Link href="/sign-up" className="landing-cta large">Uđi u arenu <ArrowRight size={17} /></Link><Link href="/sign-in" className="landing-secondary">Već imaš račun? Prijavi se</Link></div>
      <div className="landing-footnote"><ShieldCheck size={15} /> Simulator za zabavu i učenje — nema stvarnog novca.</div>
      <div className="landing-scoreboard" aria-label="Primjer virtualnih kvota">
        <div className="score-head"><span>VEČERAŠNJI DERBI</span><span>PRIMJER · DEMO KVOTE</span></div>
        <div className="score-match"><div><small>HRVATSKA · PRVA LIGA</small><strong>Dinamo Zagreb <span>—</span> Hajduk Split</strong></div><div className="score-time">20:00 <span>POČETAK</span></div></div>
        <div className="score-markets"><span>1 <b>2.08</b></span><span>X <b>3.32</b></span><span>2 <b>3.48</b></span></div>
        <div className="score-bottom"><span><span className="live-dot" /> SIMULIRANI DOGAĐAJ</span><span>KVOTE NEMAJU NOVČANU VRIJEDNOST</span></div>
      </div>
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-index">01 / 03</div>
    </section>
    <section className="landing-strip"><span>PRATI SVOJ SPORT</span><strong>NOGOMET</strong><i /> <strong>RUKOMET</strong><i /> <strong>KOŠARKA</strong><span className="strip-note">VIRTUALNO I SIGURNO</span></section>
    <section className="landing-story"><div className="story-label">01 — KAKO FUNKCIONIRA</div><div><h2>Stadion je tvoj.<br /><span>Ulog je samo ideja.</span></h2><p>Odaberi tržište, složi listić i prati kako bi prošao. Kvote i događaji su simulirani primjeri, a tvoja povijest listića ostaje samo na tvom uređaju.</p><Link href="/sign-up" className="text-link">Započni bez rizika <ArrowRight size={15} /></Link></div><div className="story-stamp"><Crosshair size={31} /><span>KVOTE<br />ARENA</span></div></section>
    <section className="landing-sports"><div className="story-label">02 — TRI IGRE. JEDNA ARENA.</div><div className="sport-panels"><article><span>01 / NOGOMET</span><Goal /><h3>90 minuta.<br />Svaki ishod.</h3><p>Konačan rezultat, golovi i oba daju gol.</p></article><article><span>02 / RUKOMET</span><Hand /><h3>Brza igra.<br />Čista procjena.</h3><p>Pobjednik, dvostruka šansa i broj pogodaka.</p></article><article><span>03 / KOŠARKA</span><Activity /><h3>Svaki posjed.<br />Svaka poena.</h3><p>Pobjednik, ukupni poeni i hendikep.</p></article></div></section>
    <section className="landing-promise"><div className="promise-mark"><ShieldCheck size={26} /></div><div><span>JASNA PRAVILA, BEZ SITNIH SLOVA</span><h2>Demo krediti.<br />Stvarno sigurna igra.</h2></div><p>Kvote Arena je simulator sportskih prognoza. Nema depozita, isplata ni novčanih dobitaka. Svi podaci prikazuju se kao demo.</p><Link href="/sign-up" className="landing-cta">Napravi račun <ArrowRight size={15} /></Link></section>
    <footer className="landing-footer"><Link href="/" className="brand"><span className="brand-mark"><Crosshair size={17} /></span><span className="brand-word">kvote<span>arena</span></span></Link><span>SPORTSKA SIMULACIJA · HRVATSKA</span><span>© KVOTE ARENA</span></footer>
  </main>;
}
function SignInPage() { return <main className="auth-page"><div className="auth-aside"><Link href="/" className="brand"><span className="brand-mark"><Crosshair size={20} /></span><span className="brand-word">kvote<span>arena</span></span></Link><span className="auth-kicker">DOBRODOŠAO NATRAG</span><h1>Još jedan<br />pogled na igru.</h1><p>Uđi u svoju virtualnu arenu i nastavi tamo gdje si stao.</p><span className="auth-disclaimer">Samo demo. Bez uloga stvarnog novca.</span></div><section className="auth-form-wrap"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></section></main>; }
function SignUpPage() { return <main className="auth-page"><div className="auth-aside"><Link href="/" className="brand"><span className="brand-mark"><Crosshair size={20} /></span><span className="brand-word">kvote<span>arena</span></span></Link><span className="auth-kicker">TVOJA IGRA POČINJE OVDJE</span><h1>Uđi u igru.<br />Bez rizika.</h1><p>Isprobaj tržišta, testiraj procjenu i prati virtualne listiće.</p><span className="auth-disclaimer">Nema uplata. Nema isplata. Samo simulacija.</span></div><section className="auth-form-wrap"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></section></main>; }
function ProfileControl() {
  const { user } = useUser(); const { signOut } = useClerk();
  const label = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Moj profil';
  return <div className="profile-control"><span className="profile-avatar">{initials(label)}</span><span className="profile-name">{label}</span><button type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out">Odjava</button></div>;
}
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk(); const client = useQueryClient(); const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => { const id = user?.id ?? null; if (previous.current !== undefined && previous.current !== id) client.clear(); previous.current = id; }), [addListener, client]);
  return null;
}
function FootballApiSettingsCard() {
  const client = useQueryClient();
  const query = useGetFootballApiSettings({ query: { queryKey: getGetFootballApiSettingsQueryKey() } });
  const save = useSaveFootballApiKey(); const remove = useDeleteFootballApiKey();
  const [apiKey, setApiKey] = useState(''); const [message, setMessage] = useState('');
  const refresh = () => client.invalidateQueries({ queryKey: getGetFootballApiSettingsQueryKey() });
  const saveKey = () => { if (apiKey.length < 10 || apiKey.length > 256) { setMessage('Ključ mora sadržavati 10–256 znakova.'); return; } setMessage(''); save.mutate({ data: { apiKey } }, { onSuccess: () => { setApiKey(''); setMessage('Ključ je sigurno spremljen.'); void refresh(); }, onError: () => setMessage('Spremanje nije uspjelo. Pokušaj ponovno.') }); };
  const removeKey = () => { if (!window.confirm('Ukloniti spremljeni Football API ključ?')) return; setMessage(''); remove.mutate(undefined, { onSuccess: () => { setApiKey(''); setMessage('Ključ je uklonjen.'); void refresh(); }, onError: () => setMessage('Uklanjanje nije uspjelo. Pokušaj ponovno.') }); };
  return <section className="settings-card football-api-card">
    <h2><Activity size={17} color="#82dda2" /> Football API ključ</h2><p>Ključ je povezan samo s tvojim računom. Sprema se šifrirano i nikad se ne prikazuje nakon spremanja.</p>
    {query.isLoading ? <div className="api-skeleton"><span /><span /></div> : query.isError ? <div className="api-status"><AlertTriangle size={16} /><div><strong>Status nije dostupan</strong><p>Provjeri vezu i pokušaj ponovno.</p></div><button className="secondary-button" onClick={() => void query.refetch()}>Pokušaj ponovno</button></div> : <div className={`api-status ${query.data?.configured ? 'configured' : ''}`}><span className="api-status-icon">{query.data?.configured ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span><div><strong>{query.data?.configured ? 'Ključ je spremljen' : 'Ključ nije spremljen'}</strong><p>{query.data?.lastUpdated ? `Zadnje ažuriranje: ${new Intl.DateTimeFormat('hr-HR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(query.data.lastUpdated))}` : 'Poveži vlastiti API ključ ako želiš konfigurirati osobni izvor podataka.'}</p></div></div>}
    <label className="api-key-label" htmlFor="football-api-key">API ključ</label><input id="football-api-key" className="api-key-input" type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Unesi novi ključ" data-testid="input-football-api-key" />
    <div className="api-key-actions"><button className="submit-button" disabled={!apiKey || save.isPending} onClick={saveKey} data-testid="button-save-football-api-key">{save.isPending ? 'Spremanje…' : 'Spremi ključ'}</button><button className="secondary-button danger" disabled={!query.data?.configured || remove.isPending} onClick={removeKey} data-testid="button-delete-football-api-key"><Trash2 size={14} /> Ukloni ključ</button></div>
    {message && <p className="api-feedback" role="status">{message}</p>}
    <p className="key-privacy"><ShieldCheck size={14} /> Uneseni ključ ostaje samo u memoriji ove stranice i briše se nakon uspješnog spremanja.</p>
  </section>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={{ theme: shadcn, cssLayerName: 'clerk', options: { logoPlacement: 'inside', logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` }, variables: { colorPrimary: '#54cf91', colorForeground: '#e9f0ea', colorMutedForeground: '#96a39b', colorDanger: '#d56c62', colorBackground: '#151d20', colorInput: '#101719', colorInputForeground: '#e9f0ea', colorNeutral: '#35443e', fontFamily: 'Manrope, sans-serif', borderRadius: '0.7rem' }, elements: { rootBox: 'w-full flex justify-center', cardBox: 'bg-[#151d20] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#34443d]', card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none', headerTitle: 'text-[#edf4ee]', headerSubtitle: 'text-[#a4b1a8]', socialButtonsBlockButtonText: 'text-[#eaf1eb]', formFieldLabel: 'text-[#cbd7cf]', footerActionLink: 'text-[#70d9a0]', footerActionText: 'text-[#a4b1a8]', dividerText: 'text-[#96a39b]', identityPreviewEditButton: 'text-[#70d9a0]', formFieldSuccessText: 'text-[#70d9a0]', alertText: 'text-[#f2c7bd]', logoBox: 'rounded-xl', socialButtonsBlockButton: 'border border-[#3a4a43] bg-[#1b2525]', formButtonPrimary: 'bg-[#54cf91] text-[#07150d]', formFieldInput: 'border-[#3a4a43] bg-[#101719] text-[#e9f0ea]', footerAction: 'border-[#34443d]', dividerLine: 'bg-[#34443d]', alert: 'border-[#805b50] bg-[#392b28]', otpCodeFieldInput: 'border-[#3a4a43] bg-[#101719]', formFieldRow: 'text-[#cbd7cf]', main: 'text-[#e9f0ea]' } }} localization={hrHR} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <ClerkQueryClientCacheInvalidator />
    <RoutedErrorBoundary><Switch>
      <Route path="/"><HomeGate /></Route>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/app" component={AuthenticatedApplication} />
      <Route path="/football" component={AuthenticatedApplication} />
      <Route path="/handball" component={AuthenticatedApplication} />
      <Route path="/basketball" component={AuthenticatedApplication} />
      <Route path="/tickets" component={AuthenticatedApplication} />
      <Route path="/settings" component={AuthenticatedApplication} />
      <Route><Show when="signed-in"><NotFound /></Show><Show when="signed-out"><Redirect to="/" /></Show></Route>
    </Switch></RoutedErrorBoundary>
  </ClerkProvider>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

export default App;
