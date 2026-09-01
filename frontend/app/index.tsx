import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WallpaperBackdrop } from "@/src/components/backdrop";
import { BarChart, DonutChart, ScoreGauge } from "@/src/components/charts";
import { COLORS } from "@/src/theme";
import {
  Category,
  DayRange,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  STORAGE_KEY,
  Transaction,
  TransactionKind,
  filterByDays,
  filterByMonth,
  filterByRange,
  formatDate,
  formatDateLong,
  formatIDR,
  formatMonth,
  formatShortIDR,
  getCategory,
  getRecentMonths,
  suggestCategory,
} from "@/src/utils/finance";
import { exportCsv, exportPdf } from "@/src/utils/export";
import { DEFAULT_PROFILE, PROFILE_KEY, Profile } from "@/src/utils/profile";
import { Achievement, FinancialScore, computeAchievements, computeMonthlyScore } from "@/src/utils/score";
import { storage } from "@/src/utils/storage";
import {
  DEFAULT_WALLPAPER,
  WALLPAPER_KEY,
  WALLPAPER_PRESETS,
  WallpaperSelection,
} from "@/src/utils/wallpapers";

type TabKey = "home" | "history" | "reports" | "settings";
type SettingsRoute = "root" | "profile" | "wallpaper" | "support";

const today = () => new Date().toISOString();

const getTotals = (transactions: Transaction[]) =>
  transactions.reduce(
    (t, x) => {
      if (x.kind === "income") t.income += x.amount;
      else t.expense += x.amount;
      return t;
    },
    { income: 0, expense: 0 },
  );

const scoreColor = (score: number) => {
  if (score >= 75) return COLORS.green;
  if (score >= 50) return COLORS.yellow;
  return COLORS.red;
};

export default function Index() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("home");
  const [settingsRoute, setSettingsRoute] = useState<SettingsRoute>("root");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [wallpaper, setWallpaper] = useState<WallpaperSelection>(DEFAULT_WALLPAPER);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingClearAll, setPendingClearAll] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    Promise.all([
      storage.getItem(STORAGE_KEY, [] as Transaction[]),
      storage.getItem(WALLPAPER_KEY, DEFAULT_WALLPAPER),
      storage.getItem(PROFILE_KEY, DEFAULT_PROFILE),
    ]).then(([saved, savedWallpaper, savedProfile]) => {
      if (Array.isArray(saved)) setTransactions(saved as Transaction[]);
      if (savedWallpaper && typeof savedWallpaper === "object" && "presetId" in (savedWallpaper as any))
        setWallpaper(savedWallpaper as WallpaperSelection);
      if (savedProfile && typeof savedProfile === "object" && "name" in (savedProfile as any))
        setProfile(savedProfile as Profile);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveTransactions = async (next: Transaction[]) => {
    setTransactions(next);
    await storage.setItem(STORAGE_KEY, next);
  };

  const addTransaction = async (t: Transaction) => {
    await saveTransactions([t, ...transactions]);
    setShowAdd(false);
    setTab("home");
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const next = transactions.filter((x) => x.id !== pendingDeleteId);
    setPendingDeleteId(null);
    await saveTransactions(next);
  };

  const updateWallpaper = async (next: WallpaperSelection) => {
    setWallpaper(next);
    await storage.setItem(WALLPAPER_KEY, next);
  };

  const updateProfile = async (next: Profile) => {
    setProfile(next);
    await storage.setItem(PROFILE_KEY, next);
  };

  return (
    <View style={styles.root}>
      <WallpaperBackdrop wallpaper={wallpaper} intensity={0.22} gradientOpacity={0.9} />
      <View style={styles.rootOverlay} />
      <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
        {!isLoaded ? (
          <LoadingState />
        ) : (
          <>
            {tab === "home" && (
              <Dashboard
                profile={profile}
                transactions={transactions}
                onAdd={() => setShowAdd(true)}
                onSeeAll={() => setTab("history")}
                onDelete={(id) => setPendingDeleteId(id)}
                onOpenProfile={() => {
                  setTab("settings");
                  setSettingsRoute("profile");
                }}
              />
            )}
            {tab === "history" && (
              <History
                transactions={transactions}
                onDelete={(id) => setPendingDeleteId(id)}
                onExport={() => setShowExport(true)}
              />
            )}
            {tab === "reports" && <Reports transactions={transactions} />}
            {tab === "settings" && (
              <Settings
                profile={profile}
                transactions={transactions}
                wallpaper={wallpaper}
                route={settingsRoute}
                onNavigate={setSettingsRoute}
                onWallpaperChange={updateWallpaper}
                onProfileChange={updateProfile}
                onClear={() => setPendingClearAll(true)}
                onNotify={setToast}
              />
            )}
          </>
        )}
      </View>
      <BottomNav
        active={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "settings") setSettingsRoute("root");
        }}
        onAdd={() => setShowAdd(true)}
        bottomInset={insets.bottom}
      />
      <AddTransactionModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={addTransaction} />
      <ConfirmModal
        visible={pendingDeleteId !== null}
        title="Hapus catatan?"
        subtitle="Catatan ini akan dihapus dari perangkat."
        confirmLabel="Hapus"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        icon="trash-outline"
      />
      <ConfirmModal
        visible={pendingClearAll}
        title="Hapus semua data?"
        subtitle="Seluruh catatan duwitmu akan dihapus dari perangkat. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus semua"
        onCancel={() => setPendingClearAll(false)}
        onConfirm={async () => {
          setPendingClearAll(false);
          await saveTransactions([]);
          setToast("Semua catatan telah dihapus.");
        }}
        icon="warning-outline"
      />
      <ExportModal
        visible={showExport}
        transactions={transactions}
        onClose={() => setShowExport(false)}
        onNotify={setToast}
      />
      {toast ? <Toast text={toast} bottomInset={insets.bottom} /> : null}
    </View>
  );
}

// ---------------- Loading ----------------
function LoadingState() {
  return (
    <View style={styles.loading}>
      <View style={styles.loaderDot} />
      <Text style={styles.loadingText}>Menyiapkan dompetmu...</Text>
    </View>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({
  profile,
  transactions,
  onAdd,
  onSeeAll,
  onDelete,
  onOpenProfile,
}: {
  profile: Profile;
  transactions: Transaction[];
  onAdd: () => void;
  onSeeAll: () => void;
  onDelete: (id: string) => void;
  onOpenProfile: () => void;
}) {
  const [range, setRange] = useState<DayRange>(30);
  const filtered = useMemo(() => filterByDays(transactions, range), [transactions, range]);
  const totals = getTotals(filtered);
  const balance = getTotals(transactions);
  const score = useMemo(() => computeMonthlyScore(transactions, new Date()), [transactions]);
  return (
    <View testID="home-screen" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable testID="open-profile-avatar" onPress={onOpenProfile} style={styles.avatarWrap}>
            {profile.photoBase64 ? (
              <Image source={{ uri: profile.photoBase64 }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person-outline" size={22} color={COLORS.green} />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.eyebrow}>MY DUWIT GWEJH</Text>
            <Text style={styles.title} numberOfLines={1}>
              Halo, {profile.name}
            </Text>
          </View>
          <View style={styles.localBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.green} />
            <Text style={styles.localText}>Lokal</Text>
          </View>
        </View>

        <LinearGradient
          colors={["#173C33", "#123028", "#0F1B18"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceCardTop}>
            <Text style={styles.cardLabel}>Total saldo</Text>
            <Ionicons name="wallet-outline" size={22} color={COLORS.greenGlow} />
          </View>
          <Text style={styles.balanceAmount}>{formatIDR(balance.income - balance.expense)}</Text>
          <View style={styles.balanceFooter}>
            <Text style={styles.balanceHint}>Semua catatan</Text>
            <View style={styles.scorePill}>
              <View style={[styles.scoreDot, { backgroundColor: score.label === "Belum Ada Data" ? COLORS.muted : scoreColor(score.score) }]} />
              <Text style={styles.scorePillText}>{score.label === "Belum Ada Data" ? "Skor —" : `Skor ${score.score}`}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>RINGKASAN</Text>
            <Text style={styles.sectionTitle}>{range} hari terakhir</Text>
          </View>
        </View>
        <RangeChips value={range} onChange={setRange} />
        <View style={styles.statsRow}>
          <StatCard label="Pemasukan" value={totals.income} color={COLORS.green} icon="arrow-down" />
          <StatCard label="Pengeluaran" value={totals.expense} color={COLORS.red} icon="arrow-up" />
        </View>

        <Pressable onPress={onAdd} style={({ pressed }) => [styles.addCta, pressed && styles.pressed]} testID="dashboard-add-cta">
          <View style={styles.addIcon}>
            <Ionicons name="add" size={22} color={COLORS.bg} />
          </View>
          <View style={styles.addCopy}>
            <Text style={styles.addTitle}>Catat transaksi</Text>
            <Text style={styles.addSubtitle}>Ketik catatan → kategori auto-terpilih</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.bg} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>AKTIVITAS TERBARU</Text>
            <Text style={styles.sectionTitle}>Catatan terakhir</Text>
          </View>
          {transactions.length > 0 && (
            <Pressable onPress={onSeeAll} testID="dashboard-see-all">
              <Text style={styles.linkText}>Lihat semua</Text>
            </Pressable>
          )}
        </View>
        {transactions.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          transactions.slice(0, 5).map((t) => <TransactionRow key={t.id} transaction={t} onDelete={onDelete} />)
        )}
        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

function RangeChips({ value, onChange }: { value: DayRange; onChange: (v: DayRange) => void }) {
  const items: DayRange[] = [7, 30, 60, 90];
  return (
    <View style={styles.rangeRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rangeScroll}
      >
        {items.map((d) => {
          const active = value === d;
          return (
            <Pressable
              key={d}
              onPress={() => onChange(d)}
              testID={`range-chip-${d}`}
              style={[styles.rangeChip, active && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>{d} hari</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: "arrow-down" | "arrow-up" }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{formatShortIDR(value)}</Text>
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="journal-outline" size={28} color={COLORS.green} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada catatan duwit</Text>
      <Text style={styles.emptyText}>Mulai catat transaksi pertamamu dan lihat ke mana perginya uangmu.</Text>
      <Pressable onPress={onAdd} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} testID="empty-add">
        <Ionicons name="add" size={18} color={COLORS.bg} />
        <Text style={styles.primaryButtonText}>Tambah transaksi</Text>
      </Pressable>
    </View>
  );
}

function TransactionRow({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}) {
  const category = getCategory(transaction.category);
  const isIncome = transaction.kind === "income";
  return (
    <Pressable
      onLongPress={() => onDelete?.(transaction.id)}
      style={styles.transactionRow}
    >
      <View style={[styles.transactionIcon, { backgroundColor: `${category.color}22` }]}>
        <Ionicons name={isIncome ? "arrow-down" : category.icon} size={19} color={isIncome ? COLORS.green : category.color} />
      </View>
      <View style={styles.transactionMain}>
        <Text style={styles.transactionName} numberOfLines={1}>
          {transaction.category}
        </Text>
        <Text style={styles.transactionDate} numberOfLines={1}>
          {transaction.note ? `${transaction.note} · ${formatDate(transaction.date)}` : formatDate(transaction.date)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: isIncome ? COLORS.green : COLORS.text }]}>
        {isIncome ? "+" : "-"}
        {formatIDR(transaction.amount)}
      </Text>
      {onDelete && (
        <Pressable
          testID={`delete-${transaction.id}`}
          accessibilityLabel={`Hapus ${transaction.category}`}
          onPress={() => onDelete(transaction.id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={17} color={COLORS.red} />
        </Pressable>
      )}
    </Pressable>
  );
}

// ---------------- History ----------------
type HistoryFilter = { kind: "days"; value: DayRange } | { kind: "month"; index: number } | { kind: "all" };

function History({
  transactions,
  onDelete,
  onExport,
}: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionKind>("all");
  const [dateFilter, setDateFilter] = useState<HistoryFilter>({ kind: "days", value: 30 });
  const months = useMemo(() => getRecentMonths(12), []);

  const filtered = useMemo(() => {
    let list = transactions;
    if (dateFilter.kind === "days") list = filterByDays(list, dateFilter.value);
    else if (dateFilter.kind === "month") list = filterByMonth(list, months[dateFilter.index]);
    if (typeFilter !== "all") list = list.filter((t) => t.kind === typeFilter);
    return list;
  }, [transactions, typeFilter, dateFilter, months]);

  const totals = getTotals(filtered);
  const dayRanges: DayRange[] = [7, 30, 60, 90];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader kicker="RIWAYAT" title="Semua catatan" subtitle="Geser perjalanan duwitmu" />

      <View style={styles.historySummary}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>Arus kas bersih</Text>
          <Text style={styles.historyAmount}>{formatIDR(totals.income - totals.expense)}</Text>
        </View>
        <Pressable
          testID="open-export"
          onPress={onExport}
          style={({ pressed }) => [styles.historyExportBtn, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={16} color={COLORS.bg} />
          <Text style={styles.historyExportText}>Ekspor</Text>
        </Pressable>
      </View>

      <Text style={styles.filterLabel}>PERIODE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {dayRanges.map((d) => {
          const active = dateFilter.kind === "days" && dateFilter.value === d;
          return (
            <Pressable
              key={`d-${d}`}
              testID={`hist-days-${d}`}
              onPress={() => setDateFilter({ kind: "days", value: d })}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} hari</Text>
            </Pressable>
          );
        })}
        {months.map((m, i) => {
          const active = dateFilter.kind === "month" && dateFilter.index === i;
          return (
            <Pressable
              key={`m-${i}`}
              testID={`hist-month-${i}`}
              onPress={() => setDateFilter({ kind: "month", index: i })}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatMonth(m)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.filterRow}>
        {([
          ["all", "Semua"],
          ["income", "Masuk"],
          ["expense", "Keluar"],
        ] as const).map(([value, label]) => (
          <Pressable
            key={value}
            testID={`hist-type-${value}`}
            onPress={() => setTypeFilter(value)}
            style={[styles.filter, typeFilter === value && styles.filterActive]}
          >
            <Text style={[styles.filterText, typeFilter === value && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState onAdd={() => {}} />
      ) : (
        filtered.map((t) => <TransactionRow key={t.id} transaction={t} onDelete={onDelete} />)
      )}
      <Text style={styles.helperText}>Tekan dan tahan catatan untuk menghapus.</Text>
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

// ---------------- Reports ----------------
function Reports({ transactions }: { transactions: Transaction[] }) {
  const [monthIndex, setMonthIndex] = useState(0);
  const months = useMemo(() => getRecentMonths(12), []);
  const activeMonth = months[monthIndex];
  const monthTx = useMemo(() => filterByMonth(transactions, activeMonth), [transactions, activeMonth]);
  const totals = getTotals(monthTx);
  const score: FinancialScore = useMemo(
    () => computeMonthlyScore(transactions, activeMonth),
    [transactions, activeMonth],
  );
  const achievements = useMemo(() => computeAchievements(transactions), [transactions]);

  const categoryData = useMemo(() => {
    return EXPENSE_CATEGORIES.map((c) => ({
      label: c.name,
      color: c.color,
      value: monthTx.filter((t) => t.kind === "expense" && t.category === c.name).reduce((s, t) => s + t.amount, 0),
    }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTx]);

  const isCurrent = activeMonth.getMonth() === new Date().getMonth() && activeMonth.getFullYear() === new Date().getFullYear();
  const daysToShow = isCurrent ? new Date().getDate() : new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate();
  const barData = useMemo(() => {
    const bars = Array.from({ length: 7 }, (_, i) => {
      const dayNum = daysToShow - (6 - i);
      const day = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), dayNum);
      if (dayNum < 1) return { label: "-", value: 0 };
      const sum = monthTx
        .filter((t) => t.kind === "expense" && new Date(t.date).toDateString() === day.toDateString())
        .reduce((s, t) => s + t.amount, 0);
      return { label: `${dayNum}`, value: sum };
    });
    return bars;
  }, [monthTx, activeMonth, daysToShow]);

  const maxCat = categoryData[0]?.value ?? 1;
  const topCategory = categoryData[0];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader kicker="INSIGHT" title="Laporan" subtitle="Kenali pola pengeluaranmu" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {months.map((m, i) => {
          const active = i === monthIndex;
          return (
            <Pressable
              key={i}
              testID={`report-month-${i}`}
              onPress={() => setMonthIndex(i)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatMonth(m)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.scoreCard}>
        <ScoreGauge score={score.score} color={scoreColor(score.score)} testID="score-gauge" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.scoreKicker}>SKOR KEUANGAN</Text>
          <Text style={styles.scoreLabel}>{score.label}</Text>
          <Text style={styles.scoreHint}>{score.hint}</Text>
          <View style={styles.scoreStats}>
            <Text style={styles.scoreStat}>
              Pemasukan <Text style={styles.scoreStatVal}>{formatShortIDR(totals.income)}</Text>
            </Text>
            <Text style={styles.scoreStat}>
              Pengeluaran <Text style={styles.scoreStatVal}>{formatShortIDR(totals.expense)}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reportCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>7 hari terakhir</Text>
          <Text style={styles.cardMeta}>pengeluaran harian</Text>
        </View>
        <BarChart data={barData} height={130} color={COLORS.green} testID="bar-chart" />
      </View>

      <View style={styles.reportCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Sebaran kategori</Text>
          <Text style={styles.cardMeta}>{categoryData.length} kategori</Text>
        </View>
        {categoryData.length === 0 ? (
          <Text style={styles.noData}>Belum cukup data untuk membuat laporan bulan ini.</Text>
        ) : (
          <View style={styles.pieRow}>
            <DonutChart
              data={categoryData}
              size={160}
              strokeWidth={28}
              centerLabel="TOP"
              centerValue={topCategory ? topCategory.label.split(" ")[0] : ""}
              testID="pie-chart"
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              {categoryData.slice(0, 5).map((c) => (
                <View key={c.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={styles.legendValue}>{Math.round((c.value / totals.expense) * 100) || 0}%</Text>
                </View>
              ))}
              {categoryData.length > 5 && (
                <Text style={styles.legendMore}>+{categoryData.length - 5} lainnya</Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.reportCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Rincian kategori</Text>
        </View>
        {categoryData.length === 0 ? (
          <Text style={styles.noData}>Belum ada pengeluaran.</Text>
        ) : (
          categoryData.map((c) => (
            <View key={c.label} style={styles.categoryReport}>
              <View style={styles.categoryReportTop}>
                <View style={styles.categoryReportName}>
                  <View style={[styles.miniDot, { backgroundColor: c.color }]} />
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {c.label}
                  </Text>
                </View>
                <Text style={styles.categoryTotal}>{formatIDR(c.value)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(c.value / maxCat) * 100}%`, backgroundColor: c.color }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.reportCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Pencapaian</Text>
          <Text style={styles.cardMeta}>{achievements.filter((a) => a.unlocked).length}/{achievements.length}</Text>
        </View>
        {achievements.map((a) => (
          <AchievementRow key={a.id} achievement={a} />
        ))}
      </View>

      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

function AchievementRow({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.achieveRow, achievement.unlocked && styles.achieveRowUnlocked]}>
      <View style={[styles.achieveIcon, achievement.unlocked && styles.achieveIconUnlocked]}>
        <Ionicons
          name={achievement.icon as any}
          size={22}
          color={achievement.unlocked ? COLORS.bg : COLORS.green}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.achieveTitle}>{achievement.title}</Text>
        <Text style={styles.achieveDesc}>{achievement.description}</Text>
        <View style={styles.achieveTrack}>
          <View
            style={[
              styles.achieveFill,
              { width: `${achievement.progress * 100}%`, backgroundColor: achievement.unlocked ? COLORS.green : COLORS.greenSoft },
            ]}
          />
        </View>
        <Text style={styles.achieveProgressText}>{achievement.progressLabel}</Text>
      </View>
      {achievement.unlocked && <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />}
    </View>
  );
}

// ---------------- Settings ----------------
function Settings({
  profile,
  transactions,
  wallpaper,
  route,
  onNavigate,
  onWallpaperChange,
  onProfileChange,
  onClear,
  onNotify,
}: {
  profile: Profile;
  transactions: Transaction[];
  wallpaper: WallpaperSelection;
  route: SettingsRoute;
  onNavigate: (r: SettingsRoute) => void;
  onWallpaperChange: (w: WallpaperSelection) => Promise<void>;
  onProfileChange: (p: Profile) => Promise<void>;
  onClear: () => void;
  onNotify: (msg: string) => void;
}) {
  if (route === "profile") {
    return (
      <ProfileEdit profile={profile} onBack={() => onNavigate("root")} onSave={onProfileChange} onNotify={onNotify} />
    );
  }
  if (route === "wallpaper") {
    return (
      <WallpaperEdit
        wallpaper={wallpaper}
        onBack={() => onNavigate("root")}
        onChange={onWallpaperChange}
        onNotify={onNotify}
      />
    );
  }
  if (route === "support") {
    return <SupportPage onBack={() => onNavigate("root")} />;
  }
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader kicker="PENGATURAN" title="Profil dompet" subtitle="Semua tetap di perangkatmu" />
      <Pressable
        testID="settings-open-profile"
        onPress={() => onNavigate("profile")}
        style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
      >
        {profile.photoBase64 ? (
          <Image source={{ uri: profile.photoBase64 }} style={styles.profileMarkImg} />
        ) : (
          <View style={styles.profileMark}>
            <Ionicons name="wallet" size={26} color={COLORS.bg} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>Ketuk untuk ubah nama & foto</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
      </Pressable>

      <Text style={styles.groupLabel}>TAMPILAN</Text>
      <Pressable
        testID="settings-open-wallpaper"
        onPress={() => onNavigate("wallpaper")}
        style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
      >
        <View style={styles.settingIcon}>
          <Ionicons name="image-outline" size={19} color={COLORS.green} />
        </View>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>Wallpaper global</Text>
          <Text style={styles.settingSub}>Berlaku di seluruh menu aplikasi</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
      </Pressable>

      <Text style={styles.groupLabel}>PREFERENSI</Text>
      <SettingRow icon="cash-outline" label="Mata uang" value="Rupiah (IDR)" />
      <SettingRow icon="lock-closed-outline" label="Privasi" value="Lokal, tanpa akun" />
      <SettingRow icon="layers-outline" label="Total catatan" value={`${transactions.length} transaksi`} />

      <Text style={styles.groupLabel}>APRESIASI</Text>
      <Pressable
        testID="settings-open-support"
        onPress={() => onNavigate("support")}
        style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
      >
        <View style={[styles.settingIcon, { backgroundColor: "#3C2A19" }]}>
          <Ionicons name="heart-outline" size={19} color={COLORS.yellow} />
        </View>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>Dukung Pembuat</Text>
          <Text style={styles.settingSub}>Scan QRIS untuk mendukung pengembang</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
      </Pressable>

      <Text style={styles.groupLabel}>DATA PERANGKAT</Text>
      <Pressable
        testID="settings-clear-all"
        onPress={onClear}
        style={({ pressed }) => [styles.dangerRow, pressed && styles.pressed]}
      >
        <View style={styles.settingIconDanger}>
          <Ionicons name="trash-outline" size={19} color={COLORS.red} />
        </View>
        <View style={styles.settingCopy}>
          <Text style={styles.dangerTitle}>Hapus semua data</Text>
          <Text style={styles.settingSub}>Bersihkan seluruh catatan dari perangkat</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.red} />
      </Pressable>

      <View style={styles.about}>
        <Ionicons name="sparkles-outline" size={16} color={COLORS.green} />
        <Text style={styles.aboutText}>Dibuat sederhana untuk membantu kamu lebih sadar dengan setiap rupiah.</Text>
      </View>
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

function SettingRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={19} color={COLORS.green} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{label}</Text>
        <Text style={styles.settingSub}>{value}</Text>
      </View>
    </View>
  );
}

// ---------------- Profile edit ----------------
function ProfileEdit({
  profile,
  onBack,
  onSave,
  onNotify,
}: {
  profile: Profile;
  onBack: () => void;
  onSave: (p: Profile) => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<string | null>(profile.photoBase64);
  const [isPicking, setIsPicking] = useState(false);

  const pickPhoto = async () => {
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onNotify("Izin galeri diperlukan untuk memilih foto.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch {
      onNotify("Gagal membuka galeri. Coba lagi.");
    } finally {
      setIsPicking(false);
    }
  };

  const save = async () => {
    const trimmed = name.trim() || "Pemilik Duwit";
    await onSave({ name: trimmed, photoBase64: photo });
    onNotify("Profil tersimpan.");
    onBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SubHeader title="Profil" onBack={onBack} testID="profile-back" />

        <View style={styles.profileEditWrap}>
          <Pressable testID="profile-pick-photo" onPress={pickPhoto} disabled={isPicking} style={styles.profileEditAvatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.profileEditAvatar} />
            ) : (
              <View style={styles.profileEditAvatarEmpty}>
                <Ionicons name="camera-outline" size={30} color={COLORS.green} />
              </View>
            )}
            <View style={styles.profileEditBadge}>
              <Ionicons name="pencil" size={12} color={COLORS.bg} />
            </View>
          </Pressable>
          <Text style={styles.profilePickText}>{isPicking ? "Membuka galeri..." : "Ketuk foto untuk mengganti"}</Text>
        </View>

        <Text style={styles.inputLabel}>NAMA</Text>
        <TextInput
          testID="profile-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Nama panggilanmu"
          placeholderTextColor={COLORS.muted}
          style={styles.textField}
          maxLength={30}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        {photo && (
          <Pressable
            testID="profile-remove-photo"
            onPress={() => setPhoto(null)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
            <Text style={[styles.secondaryButtonText, { color: COLORS.red }]}>Hapus foto</Text>
          </Pressable>
        )}
        <Pressable
          testID="profile-save"
          onPress={save}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, { marginTop: 20 }]}
        >
          <Text style={styles.saveButtonText}>Simpan perubahan</Text>
          <Ionicons name="checkmark" size={18} color={COLORS.bg} />
        </Pressable>
        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------- Wallpaper edit ----------------
function WallpaperEdit({
  wallpaper,
  onBack,
  onChange,
  onNotify,
}: {
  wallpaper: WallpaperSelection;
  onBack: () => void;
  onChange: (w: WallpaperSelection) => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [isPicking, setIsPicking] = useState(false);

  const selectPhoto = async () => {
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onNotify("Izin galeri diperlukan.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        await onChange({ presetId: wallpaper.presetId, customBase64: `data:image/jpeg;base64,${result.assets[0].base64}` });
        onNotify("Wallpaper berhasil dipasang.");
      }
    } catch {
      onNotify("Gagal membuka galeri.");
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SubHeader title="Wallpaper global" onBack={onBack} testID="wallpaper-back" />
      <Text style={styles.settingSub}>
        Pilihan wallpaper berlaku pada semua menu aplikasi. Disimpan offline di perangkatmu.
      </Text>

      <Text style={[styles.groupLabel, { marginTop: 20 }]}>PRESET</Text>
      <View style={styles.presetGrid}>
        {WALLPAPER_PRESETS.map((preset) => {
          const active = wallpaper.presetId === preset.id && !wallpaper.customBase64;
          return (
            <Pressable
              key={preset.id}
              testID={`wallpaper-${preset.id}`}
              onPress={() => onChange({ presetId: preset.id, customBase64: null })}
              style={styles.presetTile}
            >
              <LinearGradient
                colors={preset.colors}
                style={[styles.presetGradient, active && { borderColor: COLORS.green, borderWidth: 3 }]}
              />
              <Text style={[styles.presetName, active && { color: COLORS.green }]}>{preset.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.groupLabel, { marginTop: 20 }]}>DARI FOTO</Text>
      <Pressable
        testID="pick-wallpaper-from-gallery"
        onPress={selectPhoto}
        disabled={isPicking}
        style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}
      >
        <Ionicons name="images-outline" size={20} color={COLORS.green} />
        <Text style={styles.galleryButtonText}>{isPicking ? "Membuka galeri..." : "Pilih foto dari galeri"}</Text>
      </Pressable>
      {wallpaper.customBase64 && (
        <View style={styles.wallpaperActive}>
          <Image source={{ uri: wallpaper.customBase64 }} style={styles.wallpaperPreview} />
          <Pressable
            testID="wallpaper-remove"
            onPress={() => onChange({ presetId: wallpaper.presetId, customBase64: null })}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, { marginTop: 12 }]}
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
            <Text style={[styles.secondaryButtonText, { color: COLORS.red }]}>Hapus wallpaper foto</Text>
          </Pressable>
        </View>
      )}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ---------------- Support page ----------------
function SupportPage({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SubHeader title="Dukung Pembuat" onBack={onBack} testID="support-back" />
      <View style={styles.supportCard}>
        <View style={styles.supportBadge}>
          <Ionicons name="heart" size={16} color={COLORS.bg} />
          <Text style={styles.supportBadgeText}>TERIMA KASIH</Text>
        </View>
        <Text style={styles.supportTitle}>Terima kasih sudah pakai aplikasinya!</Text>
        <Text style={styles.supportBody}>
          Aplikasi ini gratis dan sepenuhnya offline. Kalau kamu suka & ingin mendukung pengembang untuk terus
          menambah fitur, boleh banget scan QRIS di bawah. Sekecil apapun sangat berarti 💚
        </Text>
        <View style={styles.qrHolder}>
          <Image
            testID="donation-qr"
            source={require("../assets/images/donation-qr.png")}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.supportMerchant}>
          <Ionicons name="storefront-outline" size={16} color={COLORS.green} />
          <Text style={styles.supportMerchantText}>Kenean Store</Text>
        </View>
        <Text style={styles.supportFoot}>Scan QRIS di atas menggunakan aplikasi e-wallet / mobile banking favoritmu.</Text>
      </View>
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ---------------- Shared ----------------
function ScreenHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <View style={styles.screenHeader}>
      <Text style={styles.eyebrow}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function SubHeader({ title, onBack, testID }: { title: string; onBack: () => void; testID?: string }) {
  return (
    <View style={styles.subHeader}>
      <Pressable testID={testID} onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
      </Pressable>
      <Text style={styles.subHeaderTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function BottomNav({
  active,
  onChange,
  onAdd,
  bottomInset,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  onAdd: () => void;
  bottomInset: number;
}) {
  const items: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: "Beranda", icon: "grid-outline" },
    { key: "history", label: "Riwayat", icon: "time-outline" },
    { key: "reports", label: "Laporan", icon: "pie-chart-outline" },
    { key: "settings", label: "Profil", icon: "person-outline" },
  ];
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <View style={styles.bottomItems}>
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.key} item={item} active={active} onPress={() => onChange(item.key)} />
        ))}
        <Pressable
          testID="fab-add"
          onPress={onAdd}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Ionicons name="add" size={26} color={COLORS.bg} />
        </Pressable>
        {items.slice(2).map((item) => (
          <NavItem key={item.key} item={item} active={active} onPress={() => onChange(item.key)} />
        ))}
      </View>
    </View>
  );
}

function NavItem({
  item,
  active,
  onPress,
}: {
  item: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap };
  active: TabKey;
  onPress: () => void;
}) {
  const selected = active === item.key;
  return (
    <Pressable testID={`tab-${item.key}`} onPress={onPress} style={styles.navItem}>
      <Ionicons name={item.icon} size={21} color={selected ? COLORS.green : COLORS.muted} />
      <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
    </Pressable>
  );
}

// ---------------- Add transaction ----------------
function AddTransactionModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (t: Transaction) => void;
}) {
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [manualCategory, setManualCategory] = useState(false);
  const [note, setNote] = useState("");
  const [autoLabel, setAutoLabel] = useState("");
  const [error, setError] = useState("");
  const categoryOptions = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    setCategory(kind === "income" ? INCOME_CATEGORIES[0].name : EXPENSE_CATEGORIES[0].name);
    setManualCategory(false);
    setAutoLabel("");
  }, [kind]);

  useEffect(() => {
    if (visible) {
      setKind("expense");
      setAmount("");
      setNote("");
      setCategory(EXPENSE_CATEGORIES[0].name);
      setManualCategory(false);
      setAutoLabel("");
      setError("");
    }
  }, [visible]);

  useEffect(() => {
    if (manualCategory) return;
    const suggested = suggestCategory(note, kind);
    if (suggested && suggested !== category) {
      setCategory(suggested);
      setAutoLabel(suggested);
    } else if (!suggested) {
      setAutoLabel("");
    }
  }, [note, kind, manualCategory, category]);

  const save = () => {
    const numeric = Number(amount.replace(/[^0-9]/g, ""));
    if (!numeric) {
      setError("Masukkan nominal terlebih dahulu.");
      return;
    }
    onSave({ id: `${Date.now()}-${Math.random()}`, kind, amount: numeric, category, note: note.trim(), date: today() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View style={[styles.modalSheet, { maxHeight: "92%" }]}>
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>TRANSAKSI BARU</Text>
                <Text style={styles.modalTitle}>Catat duwit</Text>
              </View>
              <Pressable testID="close-transaction-modal" onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={21} color={COLORS.muted} />
              </Pressable>
            </View>

            <View style={styles.segment}>
              <Pressable
                testID="expense-toggle"
                onPress={() => setKind("expense")}
                style={[styles.segmentButton, kind === "expense" && styles.segmentActive]}
              >
                <Ionicons name="arrow-up" size={16} color={kind === "expense" ? COLORS.red : COLORS.muted} />
                <Text style={[styles.segmentText, kind === "expense" && styles.segmentTextActive]}>Pengeluaran</Text>
              </Pressable>
              <Pressable
                testID="income-toggle"
                onPress={() => setKind("income")}
                style={[styles.segmentButton, kind === "income" && styles.segmentActive]}
              >
                <Ionicons name="arrow-down" size={16} color={kind === "income" ? COLORS.green : COLORS.muted} />
                <Text style={[styles.segmentText, kind === "income" && styles.segmentTextActive]}>Pemasukan</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>NOMINAL</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                testID="amount-input"
                value={amount ? Number(amount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.muted}
                style={styles.amountInput}
              />
            </View>

            <Text style={styles.inputLabel}>CATATAN</Text>
            <TextInput
              testID="note-input"
              value={note}
              onChangeText={setNote}
              placeholder='Contoh: "membership game" akan otomatis pilih Hiburan'
              placeholderTextColor={COLORS.muted}
              style={styles.noteInput}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            {autoLabel && !manualCategory ? (
              <View style={styles.autoBanner} testID="auto-category-banner">
                <Ionicons name="sparkles" size={14} color={COLORS.green} />
                <Text style={styles.autoBannerText}>Kategori otomatis: {autoLabel}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>KATEGORI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categoryOptions.map((item: Category) => {
                const active = category === item.name;
                return (
                  <Pressable
                    key={item.name}
                    testID={`category-${item.name}`}
                    onPress={() => {
                      setCategory(item.name);
                      setManualCategory(true);
                      setAutoLabel("");
                    }}
                    style={[styles.categoryChip, active && { borderColor: item.color, backgroundColor: `${item.color}22` }]}
                  >
                    <Ionicons name={item.icon} size={16} color={active ? item.color : COLORS.muted} />
                    <Text style={[styles.categoryChipText, active && { color: COLORS.text }]}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="save-transaction"
              onPress={save}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Text style={styles.saveButtonText}>Simpan transaksi</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.bg} />
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------- Confirm modal ----------------
function ConfirmModal({
  visible,
  title,
  subtitle,
  confirmLabel,
  onCancel,
  onConfirm,
  icon = "trash-outline",
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onCancel} />
        <View style={[styles.modalSheet, { paddingTop: 22, paddingBottom: 20 }]}>
          <View style={styles.confirmHead}>
            <View style={styles.confirmIcon}>
              <Ionicons name={icon} size={21} color={COLORS.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.confirmTitle}>{title}</Text>
              <Text style={styles.confirmSubtitle}>{subtitle}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              testID="cancel-confirm"
              onPress={onCancel}
              style={({ pressed }) => [styles.confirmCancel, pressed && styles.pressed]}
            >
              <Text style={styles.confirmCancelText}>Batal</Text>
            </Pressable>
            <Pressable
              testID="do-confirm"
              onPress={onConfirm}
              style={({ pressed }) => [styles.confirmDo, pressed && styles.pressed]}
            >
              <Text style={styles.confirmDoText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------- Export modal ----------------
type ExportRange =
  | { kind: "days"; value: DayRange }
  | { kind: "month"; index: number }
  | { kind: "custom" }
  | { kind: "all" };

function ExportModal({
  visible,
  transactions,
  onClose,
  onNotify,
}: {
  visible: boolean;
  transactions: Transaction[];
  onClose: () => void;
  onNotify: (m: string) => void;
}) {
  const months = useMemo(() => getRecentMonths(12), []);
  const [range, setRange] = useState<ExportRange>({ kind: "days", value: 30 });
  const [busy, setBusy] = useState<null | "pdf" | "csv">(null);
  const [customStart, setCustomStart] = useState<string>(""); // YYYY-MM-DD
  const [customEnd, setCustomEnd] = useState<string>("");
  const [customErr, setCustomErr] = useState("");

  useEffect(() => {
    if (visible) {
      setRange({ kind: "days", value: 30 });
      setCustomStart("");
      setCustomEnd("");
      setCustomErr("");
      setBusy(null);
    }
  }, [visible]);

  const getFiltered = (): { list: Transaction[]; label: string } | null => {
    if (range.kind === "days") {
      return { list: filterByDays(transactions, range.value), label: `${range.value} hari terakhir` };
    }
    if (range.kind === "month") {
      const m = months[range.index];
      return { list: filterByMonth(transactions, m), label: formatMonth(m) };
    }
    if (range.kind === "all") {
      return { list: transactions, label: "Semua catatan" };
    }
    // custom
    const parse = (s: string) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
      if (!m) return null;
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d.getTime()) ? null : d;
    };
    const s = parse(customStart);
    const e = parse(customEnd);
    if (!s || !e) {
      setCustomErr("Format tanggal: YYYY-MM-DD (contoh 2026-01-31)");
      return null;
    }
    if (s > e) {
      setCustomErr("Tanggal awal harus sebelum tanggal akhir.");
      return null;
    }
    setCustomErr("");
    return {
      list: filterByRange(transactions, s, e),
      label: `${formatDateLong(s)} - ${formatDateLong(e)}`,
    };
  };

  const doExport = async (type: "pdf" | "csv") => {
    const data = getFiltered();
    if (!data) return;
    setBusy(type);
    try {
      const result =
        type === "pdf" ? await exportPdf(data.list, data.label) : await exportCsv(data.list, data.label);
      onNotify(result.message);
      if (result.ok) onClose();
    } catch {
      onNotify("Gagal membuat file ekspor. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const dayRanges: DayRange[] = [7, 30, 60, 90];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: "90%" }]}>
          <ScrollView
            style={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>EKSPOR LAPORAN</Text>
                <Text style={styles.modalTitle}>Pilih periode</Text>
              </View>
              <Pressable testID="close-export" onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={21} color={COLORS.muted} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>CEPAT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {dayRanges.map((d) => {
                const active = range.kind === "days" && range.value === d;
                return (
                  <Pressable
                    key={d}
                    testID={`export-days-${d}`}
                    onPress={() => setRange({ kind: "days", value: d })}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} hari</Text>
                  </Pressable>
                );
              })}
              <Pressable
                testID="export-all"
                onPress={() => setRange({ kind: "all" })}
                style={[styles.chip, range.kind === "all" && styles.chipActive]}
              >
                <Text style={[styles.chipText, range.kind === "all" && styles.chipTextActive]}>Semua</Text>
              </Pressable>
            </ScrollView>

            <Text style={styles.inputLabel}>BULAN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {months.map((m, i) => {
                const active = range.kind === "month" && range.index === i;
                return (
                  <Pressable
                    key={i}
                    testID={`export-month-${i}`}
                    onPress={() => setRange({ kind: "month", index: i })}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatMonth(m)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>RENTANG KUSTOM</Text>
            <Pressable
              testID="export-custom-toggle"
              onPress={() => setRange({ kind: "custom" })}
              style={[styles.customToggle, range.kind === "custom" && styles.customToggleActive]}
            >
              <Ionicons
                name={range.kind === "custom" ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={range.kind === "custom" ? COLORS.green : COLORS.muted}
              />
              <Text style={styles.customToggleText}>Aktifkan rentang tanggal manual</Text>
            </Pressable>
            {range.kind === "custom" && (
              <View style={{ marginTop: 10, gap: 10 }}>
                <TextInput
                  testID="export-custom-start"
                  placeholder="Tanggal awal (YYYY-MM-DD)"
                  placeholderTextColor={COLORS.muted}
                  value={customStart}
                  onChangeText={setCustomStart}
                  style={styles.textField}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  testID="export-custom-end"
                  placeholder="Tanggal akhir (YYYY-MM-DD)"
                  placeholderTextColor={COLORS.muted}
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  style={styles.textField}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {customErr ? <Text style={styles.errorText}>{customErr}</Text> : null}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable
                testID="export-pdf"
                onPress={() => doExport("pdf")}
                disabled={busy !== null}
                style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed, { backgroundColor: COLORS.green }]}
              >
                <Ionicons name="document-text-outline" size={18} color={COLORS.bg} />
                <Text style={[styles.exportBtnText, { color: COLORS.bg }]}>{busy === "pdf" ? "Menyiapkan..." : "PDF"}</Text>
              </Pressable>
              <Pressable
                testID="export-csv"
                onPress={() => doExport("csv")}
                disabled={busy !== null}
                style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed, styles.exportBtnOutline]}
              >
                <Ionicons name="grid-outline" size={18} color={COLORS.green} />
                <Text style={[styles.exportBtnText, { color: COLORS.green }]}>{busy === "csv" ? "Menyiapkan..." : "CSV"}</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>
              Setelah ditekan, akan muncul menu bagikan / simpan bawaan perangkat.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------- Toast ----------------
function Toast({ text, bottomInset }: { text: string; bottomInset: number }) {
  return (
    <View style={[styles.toastWrap, { bottom: 90 + bottomInset }]} pointerEvents="none">
      <View style={styles.toast}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.green} />
        <Text style={styles.toastText}>{text}</Text>
      </View>
    </View>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  rootOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,15,13,0.55)" },
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loaderDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.green },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  avatarWrap: { width: 44, height: 44, borderRadius: 14, overflow: "hidden" },
  avatarImg: { width: 44, height: 44, borderRadius: 14 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.greenDeep,
    borderWidth: 1,
    borderColor: COLORS.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: COLORS.green, fontSize: 10, letterSpacing: 1.8, fontWeight: "800", marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 6 },
  localBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.greenDeep,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.greenDark,
  },
  localText: { color: COLORS.greenGlow, fontSize: 11, fontWeight: "700" },
  balanceCard: {
    borderRadius: 22,
    padding: 20,
    minHeight: 160,
    justifyContent: "space-between",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#245C4C",
  },
  balanceCardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { color: COLORS.greenGlow, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  balanceAmount: { color: COLORS.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, marginTop: 18 },
  balanceFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  balanceHint: { color: "#7DD3B2", fontSize: 12 },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scorePillText: { color: COLORS.text, fontSize: 11, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  sectionKicker: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  linkText: { color: COLORS.green, fontSize: 12, fontWeight: "800", paddingBottom: 2 },
  rangeRow: { marginBottom: 14 },
  rangeScroll: { gap: 8, paddingRight: 20 },
  rangeChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  rangeChipText: { color: COLORS.mutedStrong, fontSize: 12, fontWeight: "700" },
  rangeChipTextActive: { color: COLORS.bg },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 5 },
  statValue: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  addCta: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    shadowColor: COLORS.green,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  addIcon: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.greenGlow,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addCopy: { flex: 1, marginLeft: 12 },
  addTitle: { color: COLORS.bg, fontSize: 15, fontWeight: "800" },
  addSubtitle: { color: "#064E3B", fontSize: 11, marginTop: 3 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  empty: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 26,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.greenDeep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginBottom: 6 },
  emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginBottom: 18 },
  primaryButton: {
    backgroundColor: COLORS.green,
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  primaryButtonText: { color: COLORS.bg, fontSize: 13, fontWeight: "800" },
  transactionRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
  },
  transactionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  transactionMain: { flex: 1 },
  transactionName: { color: COLORS.text, fontSize: 13, fontWeight: "800", marginBottom: 3 },
  transactionDate: { color: COLORS.muted, fontSize: 11 },
  transactionAmount: { fontSize: 13, fontWeight: "800", marginLeft: 8 },
  deleteBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center", marginLeft: 2 },
  screenHeader: { marginBottom: 22 },
  historySummary: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  historyAmount: { color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 6 },
  historyExportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: COLORS.green,
  },
  historyExportText: { color: COLORS.bg, fontSize: 12, fontWeight: "800" },
  filterLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 8 },
  chipsScroll: { gap: 8, paddingRight: 20, paddingBottom: 12 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  chipText: { color: COLORS.mutedStrong, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: COLORS.bg },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12, marginTop: 4 },
  filter: {
    paddingHorizontal: 17,
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterText: { color: COLORS.mutedStrong, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: COLORS.bg },
  helperText: { color: COLORS.muted, textAlign: "center", fontSize: 11, marginTop: 20 },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    marginTop: 6,
  },
  scoreKicker: { color: COLORS.green, fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 4 },
  scoreLabel: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  scoreHint: { color: COLORS.muted, fontSize: 11, marginTop: 6, lineHeight: 15 },
  scoreStats: { marginTop: 10, gap: 4 },
  scoreStat: { color: COLORS.mutedStrong, fontSize: 11 },
  scoreStatVal: { color: COLORS.text, fontWeight: "800" },
  reportCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  cardMeta: { color: COLORS.muted, fontSize: 11 },
  pieRow: { flexDirection: "row", alignItems: "center" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, color: COLORS.mutedStrong, fontSize: 11 },
  legendValue: { color: COLORS.text, fontSize: 11, fontWeight: "800" },
  legendMore: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  noData: { color: COLORS.muted, fontSize: 12, lineHeight: 18, paddingVertical: 6 },
  categoryReport: { marginBottom: 14 },
  categoryReportTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  categoryReportName: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 8 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  categoryText: { color: COLORS.mutedStrong, fontSize: 12, flex: 1 },
  categoryTotal: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 6, backgroundColor: COLORS.cardSoft, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  achieveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.cardSoft,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  achieveRowUnlocked: { borderColor: COLORS.green, backgroundColor: "#0E2419" },
  achieveIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.greenDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  achieveIconUnlocked: { backgroundColor: COLORS.green },
  achieveTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  achieveDesc: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  achieveTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.border, marginTop: 8, overflow: "hidden" },
  achieveFill: { height: "100%", borderRadius: 3 },
  achieveProgressText: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    gap: 14,
  },
  profileMark: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.green,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMarkImg: { width: 52, height: 52, borderRadius: 17 },
  profileName: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  profileSub: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  groupLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 8, marginTop: 6 },
  settingRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.greenDeep,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingCopy: { flex: 1 },
  settingTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  settingSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  dangerRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIconDanger: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#3C1F26",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dangerTitle: { color: COLORS.red, fontSize: 14, fontWeight: "700" },
  about: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    marginTop: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutText: { color: COLORS.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  subHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  subHeaderTitle: { flex: 1, textAlign: "center", color: COLORS.text, fontSize: 16, fontWeight: "800" },
  profileEditWrap: { alignItems: "center", marginBottom: 26 },
  profileEditAvatarWrap: { width: 116, height: 116 },
  profileEditAvatar: { width: 116, height: 116, borderRadius: 30 },
  profileEditAvatarEmpty: {
    width: 116,
    height: 116,
    borderRadius: 30,
    backgroundColor: COLORS.greenDeep,
    borderWidth: 1,
    borderColor: COLORS.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  profileEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.bg,
  },
  profilePickText: { color: COLORS.muted, fontSize: 12, marginTop: 12 },
  inputLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 7, marginTop: 10 },
  textField: {
    minHeight: 48,
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  presetTile: { width: "30%", alignItems: "center", gap: 6, marginBottom: 8 },
  presetGradient: { width: "100%", aspectRatio: 1.05, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  presetName: { color: COLORS.mutedStrong, fontSize: 11 },
  galleryButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,230,118,0.08)",
  },
  galleryButtonText: { color: COLORS.green, fontSize: 13, fontWeight: "800" },
  wallpaperActive: { marginTop: 18, alignItems: "center" },
  wallpaperPreview: { width: "100%", height: 140, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  supportCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  supportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  supportBadgeText: { color: COLORS.bg, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  supportTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  supportBody: { color: COLORS.mutedStrong, fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 20 },
  qrHolder: {
    backgroundColor: "#F0F4F1",
    padding: 12,
    borderRadius: 20,
    marginBottom: 14,
  },
  qrImage: { width: 260, height: 360 },
  supportMerchant: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    backgroundColor: COLORS.greenDeep,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  supportMerchantText: { color: COLORS.greenGlow, fontSize: 13, fontWeight: "800" },
  supportFoot: { color: COLORS.muted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  bottomNav: { backgroundColor: "rgba(21,26,23,0.92)", borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomItems: { height: 70, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  navItem: { width: 68, minHeight: 50, alignItems: "center", justifyContent: "center", gap: 4 },
  navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "600" },
  navLabelActive: { color: COLORS.green, fontWeight: "800" },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    borderWidth: 5,
    borderColor: COLORS.bg,
    shadowColor: COLORS.green,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPressed: { transform: [{ scale: 0.92 }] },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({ ios: 28, android: 20 }),
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 3,
    backgroundColor: COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  modalKicker: { color: COLORS.green, fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 5 },
  modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  segment: { flexDirection: "row", backgroundColor: COLORS.bg, borderRadius: 14, padding: 4, marginBottom: 18 },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  segmentActive: { backgroundColor: COLORS.cardSoft },
  segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  segmentTextActive: { color: COLORS.text },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    marginBottom: 6,
  },
  currencyPrefix: { color: COLORS.green, fontSize: 18, fontWeight: "800", marginRight: 8 },
  amountInput: { flex: 1, color: COLORS.text, fontSize: 22, fontWeight: "800", paddingVertical: 12 },
  categoryScroll: { gap: 8, paddingBottom: 12, paddingRight: 20 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 36,
    flexShrink: 0,
  },
  categoryChipText: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  noteInput: {
    minHeight: 48,
    backgroundColor: COLORS.bg,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 13,
    marginBottom: 8,
  },
  autoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    backgroundColor: COLORS.greenDeep,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.greenDark,
  },
  autoBannerText: { color: COLORS.greenGlow, fontSize: 12, fontWeight: "700", flex: 1 },
  errorText: { color: COLORS.red, fontSize: 12, marginBottom: 8 },
  saveButton: {
    backgroundColor: COLORS.green,
    minHeight: 50,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
  },
  saveButtonText: { color: COLORS.bg, fontSize: 14, fontWeight: "800" },
  confirmHead: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  confirmIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#3C1F26",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  confirmTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  confirmSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  confirmCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardSoft,
  },
  confirmCancelText: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  confirmDo: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.red,
  },
  confirmDoText: { color: COLORS.redDark, fontSize: 13, fontWeight: "800" },
  exportBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  exportBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  exportBtnText: { fontSize: 14, fontWeight: "800" },
  customToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customToggleActive: { borderColor: COLORS.green },
  customToggleText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  toastWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "88%",
  },
  toastText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
});
