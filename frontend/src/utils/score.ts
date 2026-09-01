import { Transaction, filterByMonth } from "./finance";

export type ScoreLevel = "sangat-hemat" | "hemat" | "seimbang" | "boros" | "sangat-boros";

export type FinancialScore = {
  score: number; // 0..100
  level: ScoreLevel;
  label: string;
  ratio: number; // expense / income
  hint: string;
};

const levelFor = (score: number): { level: ScoreLevel; label: string; hint: string } => {
  if (score >= 90) return { level: "sangat-hemat", label: "Sangat Hemat", hint: "Luar biasa! Kamu jago menahan pengeluaran." };
  if (score >= 75) return { level: "hemat", label: "Hemat", hint: "Bagus! Uangmu dikelola dengan baik." };
  if (score >= 50) return { level: "seimbang", label: "Seimbang", hint: "Cukup baik. Coba sisihkan lebih banyak lagi." };
  if (score >= 25) return { level: "boros", label: "Boros", hint: "Hati-hati, pengeluaranmu mulai melebihi target." };
  return { level: "sangat-boros", label: "Sangat Boros", hint: "Waspada! Rem sekarang atau saldo bisa jebol." };
};

// Score for a given month. Combines expense-vs-income ratio with logging consistency.
export const computeMonthlyScore = (transactions: Transaction[], monthDate: Date): FinancialScore => {
  const monthTx = filterByMonth(transactions, monthDate);
  const income = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);

  if (income === 0 && expense === 0) {
    return {
      score: 0,
      level: "seimbang",
      label: "Belum Ada Data",
      ratio: 0,
      hint: "Catat transaksi bulan ini untuk melihat skor keuanganmu.",
    };
  }

  let ratioScore: number;
  const ratio = income > 0 ? expense / income : (expense > 0 ? 2 : 0);
  if (income === 0) ratioScore = 10;
  else if (ratio <= 0.3) ratioScore = 100;
  else if (ratio <= 0.5) ratioScore = 90;
  else if (ratio <= 0.7) ratioScore = 75;
  else if (ratio <= 0.9) ratioScore = 55;
  else if (ratio <= 1) ratioScore = 40;
  else ratioScore = Math.max(0, 40 - (ratio - 1) * 40);

  // Consistency: how many unique days had at least one log within this month
  const daysLogged = new Set(monthTx.map((t) => new Date(t.date).toDateString())).size;
  const dim = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const isCurrent = monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear();
  const effectiveDays = isCurrent ? today.getDate() : dim;
  const consistency = Math.min(1, daysLogged / Math.max(effectiveDays * 0.6, 1)); // reward if logs >= 60% of days
  const consistencyScore = consistency * 100;

  const combined = Math.round(ratioScore * 0.75 + consistencyScore * 0.25);
  const clamped = Math.max(0, Math.min(100, combined));
  const level = levelFor(clamped);
  return { score: clamped, level: level.level, label: level.label, ratio, hint: level.hint };
};

// ----- Achievements -----
export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0..1
  progressLabel: string;
};

const isConsecutiveDay = (a: Date, b: Date) => {
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 1;
};

export const computeAchievements = (transactions: Transaction[]): Achievement[] => {
  // 1) Skor 100 selama 3 bulan berturut-turut
  const now = new Date();
  const months12 = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
  const scores = months12.map((m) => computeMonthlyScore(transactions, m).score);
  let bestStreak100 = 0;
  let currStreak = 0;
  for (const s of scores) {
    if (s >= 100) { currStreak += 1; bestStreak100 = Math.max(bestStreak100, currStreak); }
    else currStreak = 0;
  }

  // 2) Skor 100 selama 12 bulan (streak from most-recent)
  let recentStreak100 = 0;
  for (const s of scores) { if (s >= 100) recentStreak100 += 1; else break; }

  // 3) 7 hari beruntun mencatat transaksi
  const daySet = new Set(transactions.map((t) => new Date(t.date).toDateString()));
  const dates = Array.from(daySet).map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  let bestDayStreak = 0;
  let cur = 0;
  let prev: Date | null = null;
  for (const d of dates) {
    if (prev && isConsecutiveDay(prev, d)) cur += 1;
    else cur = 1;
    bestDayStreak = Math.max(bestDayStreak, cur);
    prev = d;
  }

  // 4) 30 transaksi pertama
  const totalCount = transactions.length;

  return [
    {
      id: "score-100-3m",
      title: "Konsisten 3 Bulan",
      description: "Skor 100 selama 3 bulan berturut-turut",
      icon: "flame-outline",
      unlocked: bestStreak100 >= 3,
      progress: Math.min(1, bestStreak100 / 3),
      progressLabel: `${Math.min(bestStreak100, 3)}/3 bulan`,
    },
    {
      id: "score-100-12m",
      title: "Legenda Hemat",
      description: "Skor 100 selama 12 bulan berturut-turut",
      icon: "trophy-outline",
      unlocked: recentStreak100 >= 12,
      progress: Math.min(1, recentStreak100 / 12),
      progressLabel: `${Math.min(recentStreak100, 12)}/12 bulan`,
    },
    {
      id: "day-streak-7",
      title: "Rajin Mencatat",
      description: "Catat transaksi 7 hari beruntun",
      icon: "calendar-outline",
      unlocked: bestDayStreak >= 7,
      progress: Math.min(1, bestDayStreak / 7),
      progressLabel: `${Math.min(bestDayStreak, 7)}/7 hari`,
    },
    {
      id: "first-30",
      title: "Langkah Pertama",
      description: "Catat 30 transaksi pertamamu",
      icon: "sparkles-outline",
      unlocked: totalCount >= 30,
      progress: Math.min(1, totalCount / 30),
      progressLabel: `${Math.min(totalCount, 30)}/30 catatan`,
    },
  ];
};
