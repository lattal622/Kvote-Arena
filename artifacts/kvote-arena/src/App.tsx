import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
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
  { path: '/', label: 'Pregled', icon: LayoutDashboard },
  { path: '/football', label: 'Nogomet', icon: Goal },
  { path: '/handball', label: 'Rukomet', icon: Hand },
  { path: '/basketball', label: 'Košarka', icon: Activity },
  { path: '/tickets', label: 'Moji listići', icon: ClipboardList },
  { path: '/settings', label: 'Postavke', icon: Settings2 },
];
const pathToSport: Record<string, Sport> = { '/football': 'Nogomet', '/handball': 'Rukomet', '/basketball': 'Košarka' };

function readStore(): AppState {
  try {
    const stored = localStorage.getItem(STORE_KEY);
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
  const [store, setStore] = useState<AppState>(readStore);
  const [stake, setStake] = useState('25');
  const [toast, setToast] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'active' | 'settled'>('all');

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }, [store]);
  useEffect(() => {
    const promptHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', promptHandler);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
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
        <Link href="/" className="brand" data-testid="link-brand-home">
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
          <div className="balance-chip" data-testid="text-virtual-balance"><Banknote size={15} color="#75e3a8" /><span>Virtualno stanje</span><strong>{formatUnlimitedBalance()}</strong></div>
        </header>
        <Switch>
          <Route path="/">
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
                <section className="settings-card">
                  <h2><Activity size={17} color="#82dda2" /> Izvor sportskih podataka</h2><p>U ovoj verziji koriste se lokalni demo događaji i izmišljene kvote. Nije povezan live feed.</p>
                  <div className="api-status"><span className="api-status-icon"><AlertTriangle size={15} /></span><div><strong>API-Football nije konfiguriran</strong><p>Nije dodan API_FOOTBALL_KEY kao tajna projekta. Prikazuju se samo lokalni primjeri.</p></div></div>
                  <div className="code-note">API ključ dodajte u Replit Secrets — nikad u preglednik.</div>
                  <div className="help-label">Sigurno postavljanje, kada bude potrebno</div>
                  <ol className="guide-list">
                    <li>U Replit alatu otvorite <b>Secrets</b> za projekt.</li>
                    <li>Spremite ključ kao tajnu u okruženju, primjerice <b>API_FOOTBALL_KEY</b>.</li>
                    <li>Koristite ga samo iz poslužiteljskog koda. Nemojte ga spremati u localStorage, frontend ili javni repozitorij.</li>
                  </ol>
                </section>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary><Router /></RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

export default App;
