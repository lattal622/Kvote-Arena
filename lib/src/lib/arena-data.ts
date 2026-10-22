import { Activity, ClipboardList, Goal, Hand, LayoutDashboard, Settings2, type LucideIcon } from "lucide-react";

export type Sport = "Nogomet" | "Rukomet" | "Košarka";

export type Selection = {
  id: string;
  label: string;
  odds: number;
};

export type Market = {
  id: string;
  name: string;
  category: "Glavno" | "Golovi / Poeni" | "Hendikep" | "Poluvrijeme";
  selections: Selection[];
};

export type DemoMatch = {
  id: string;
  sport: Sport;
  competition: string;
  startAt: string;
  status: "live" | "upcoming";
  liveMinute?: string;
  home: string;
  away: string;
  score?: string;
  source: string; // npr. Bet365
  markets: Market[];
};

export type Pick = {
  matchId: string;
  marketId: string;
  selectionId: string;
  matchName: string;
  marketName: string;
  selectionLabel: string;
  odds: number;
};

export type Ticket = {
  id: string;
  createdAt: string;
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  status: "active" | "won" | "lost";
  picks: Pick[];
};

export const STORE_KEY = "kvote-arena-state-v1";

// Pomoćna funkcija za datume
const dateIn = (days: number, hour: number, minute: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const market = (id: string, name: string, category: Market["category"], selections: [string, number][]): Market => ({
  id,
  name,
  category,
  selections: selections.map(([label, odds], idx) => ({
    id: `${id}-${idx}`,
    label,
    odds,
  })),
});

export const demoMatches: DemoMatch[] = [
  // --- NOGOMET ---
  {
    id: "n-001",
    sport: "Nogomet",
    competition: "Hrvatska · SuperSport HNL",
    startAt: dateIn(0, 19, 30),
    status: "live",
    liveMinute: "64'",
    home: "Dinamo Zagreb",
    away: "Hajduk Split",
    score: "1 : 1",
    source: "Bet365",
    markets: [
      market("n1-1x2", "Konačan ishod (1X2)", "Glavno", [["1", 2.15], ["X", 3.10], ["2", 3.45]]),
      market("n1-dc", "Dvostruka šansa", "Glavno", [["1X", 1.30], ["12", 1.34], ["X2", 1.68]]),
      market("n1-dnb", "Draw No Bet (Neriješeno vraća ulog)", "Glavno", [["Dinamo", 1.53], ["Hajduk", 2.38]]),
      market("n1-ou25", "Ukupno golova (Više/Manje 2.5)", "Golovi / Poeni", [["Više 2.5", 1.95], ["Manje 2.5", 1.85]]),
      market("n1-ou35", "Ukupno golova (Više/Manje 3.5)", "Golovi / Poeni", [["Više 3.5", 3.20], ["Manje 3.5", 1.35]]),
      market("n1-btts", "Oba daju gol (GG/NG)", "Golovi / Poeni", [["Da (GG)", 1.75], ["Ne (NG)", 2.05]]),
      market("n1-ah", "Azijski hendikep (-0.5)", "Hendikep", [["Dinamo -0.5", 2.12], ["Hajduk +0.5", 1.78]]),
      market("n1-ht", "Ishod 1. poluvremena", "Poluvrijeme", [["1", 2.70], ["X", 2.10], ["2", 3.80]]),
      market("n1-htft", "Poluvrijeme / Kraj", "Poluvrijeme", [["1/1", 3.40], ["X/1", 5.00], ["X/X", 4.75], ["2/2", 6.00]]),
    ],
  },
  {
    id: "n-002",
    sport: "Nogomet",
    competition: "Engleska · Premier League",
    startAt: dateIn(0, 21, 0),
    status: "upcoming",
    home: "Arsenal",
    away: "Liverpool",
    source: "Bet365",
    markets: [
      market("n2-1x2", "Konačan ishod (1X2)", "Glavno", [["1", 2.45], ["X", 3.50], ["2", 2.80]]),
      market("n2-dc", "Dvostruka šansa", "Glavno", [["1X", 1.44], ["12", 1.30], ["X2", 1.55]]),
      market("n2-ou25", "Ukupno golova (Više/Manje 2.5)", "Golovi / Poeni", [["Više 2.5", 1.65], ["Manje 2.5", 2.20]]),
      market("n2-btts", "Oba daju gol", "Golovi / Poeni", [["Da", 1.57], ["Ne", 2.25]]),
      market("n2-eh", "Europski hendikep (-1)", "Hendikep", [["Arsenal (-1)", 4.60], ["Neriješeno (-1)", 4.20], ["Liverpool (+1)", 1.55]]),
    ],
  },
  {
    id: "n-003",
    sport: "Nogomet",
    competition: "Španjolska · La Liga",
    startAt: dateIn(1, 21, 0),
    status: "upcoming",
    home: "Real Madrid",
    away: "Barcelona",
    source: "Bet365",
    markets: [
      market("n3-1x2", "Konačan ishod (1X2)", "Glavno", [["1", 2.05], ["X", 3.75], ["2", 3.30]]),
      market("n3-dc", "Dvostruka šansa", "Glavno", [["1X", 1.33], ["12", 1.25], ["X2", 1.75]]),
      market("n3-ou25", "Ukupno golova 2.5", "Golovi / Poeni", [["Više 2.5", 1.53], ["Manje 2.5", 2.40]]),
      market("n3-btts", "Oba daju gol", "Golovi / Poeni", [["Da", 1.48], ["Ne", 2.55]]),
    ],
  },

  // --- RUKOMET ---
  {
    id: "r-001",
    sport: "Rukomet",
    competition: "EHF Liga Prvaka",
    startAt: dateIn(0, 18, 45),
    status: "live",
    liveMinute: "42'",
    home: "RK Zagreb",
    away: "THW Kiel",
    score: "21 : 23",
    source: "Bet365",
    markets: [
      market("r1-winner", "Pobjednik utakmice", "Glavno", [["1", 2.65], ["X", 8.50], ["2", 1.68]]),
      market("r1-dc", "Dvostruka šansa", "Glavno", [["1X", 2.10], ["12", 1.06], ["X2", 1.42]]),
      market("r1-total", "Ukupno golova (Više/Manje 58.5)", "Golovi / Poeni", [["Više 58.5", 1.88], ["Manje 58.5", 1.88]]),
      market("r1-spread", "Hendikep golova (+1.5)", "Hendikep", [["Zagreb +1.5", 1.90], ["Kiel -1.5", 1.85]]),
      market("r1-ht", "Pobjednik 1. poluvremena", "Poluvrijeme", [["1", 2.50], ["X", 7.00], ["2", 1.75]]),
    ],
  },
  {
    id: "r-002",
    sport: "Rukomet",
    competition: "Hrvatska · Premijer Liga",
    startAt: dateIn(1, 19, 0),
    status: "upcoming",
    home: "Nexe Našice",
    away: "Sesvete",
    source: "Bet365",
    markets: [
      market("r2-winner", "Pobjednik utakmice", "Glavno", [["1", 1.28], ["X", 10.0], ["2", 5.20]]),
      market("r2-total", "Ukupno golova (57.5)", "Golovi / Poeni", [["Više 57.5", 1.85], ["Manje 57.5", 1.90]]),
      market("r2-spread", "Hendikep golova (-3.5)", "Hendikep", [["Nexe -3.5", 1.85], ["Sesvete +3.5", 1.90]]),
    ],
  },

  // --- KOŠARKA ---
  {
    id: "b-001",
    sport: "Košarka",
    competition: "EuroLeague",
    startAt: dateIn(0, 20, 30),
    status: "upcoming",
    home: "Partizan",
    away: "Olimpia Milano",
    source: "Bet365",
    markets: [
      market("b1-ml", "Pobjednik uključujući produžetke (Moneyline)", "Glavno", [["Partizan", 1.68], ["Milano", 2.20]]),
      market("b1-1x2", "Ishod u regularnom vremenu (1X2)", "Glavno", [["1", 1.78], ["X", 14.50], ["2", 2.35]]),
      market("b1-spread", "Hendikep poena (-2.5)", "Hendikep", [["Partizan -2.5", 1.90], ["Milano +2.5", 1.90]]),
      market("b1-total", "Ukupno poena (162.5)", "Golovi / Poeni", [["Više 162.5", 1.91], ["Manje 162.5", 1.89]]),
      market("b1-q1", "Pobjednik 1. četvrtine", "Poluvrijeme", [["Partizan", 1.75], ["Neriješeno", 9.50], ["Milano", 2.15]]),
    ],
  },
  {
    id: "b-002",
    sport: "Košarka",
    competition: "Hrvatska · Premijer Liga",
    startAt: dateIn(1, 18, 0),
    status: "upcoming",
    home: "KK Zadar",
    away: "KK Cibona",
    source: "Bet365",
    markets: [
      market("b2-ml", "Pobjednik utakmice", "Glavno", [["Zadar", 1.38], ["Cibona", 3.10]]),
      market("b2-spread", "Hendikep poena (-6.5)", "Hendikep", [["Zadar -6.5", 1.88], ["Cibona +6.5", 1.88]]),
      market("b2-total", "Ukupno poena (158.5)", "Golovi / Poeni", [["Više 158.5", 1.85], ["Manje 158.5", 1.90]]),
    ],
  },
  {
    id: "b-003",
    sport: "Košarka",
    competition: "NBA",
    startAt: dateIn(2, 1, 30),
    status: "upcoming",
    home: "Boston Celtics",
    away: "Denver Nuggets",
    source: "Bet365",
    markets: [
      market("b3-ml", "Pobjednik utakmice", "Glavno", [["Boston", 1.76], ["Denver", 2.10]]),
      market("b3-spread", "Hendikep poena (-2.5)", "Hendikep", [["Boston -2.5", 1.91], ["Denver +2.5", 1.91]]),
      market("b3-total", "Ukupno poena (224.5)", "Golovi / Poeni", [["Više 224.5", 1.90], ["Manje 224.5", 1.90]]),
    ],
  },
];

// Formatiranje vremena točno za Europe/Zagreb zonu
export function formatZagrebTime(isoDate: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function formatCurrentZagrebClock(date: Date) {
  return new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatCredits(value: number) {
  return `${new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} demo €`;
}

export function totalOddsOf(picks: Pick[]) {
  if (picks.length === 0) return 1.0;
  return Number(picks.reduce((total, pick) => total * pick.odds, 1).toFixed(2));
}

