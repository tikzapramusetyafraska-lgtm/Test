import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

import {
  CATEGORIES,
  Category,
  formatDate,
  formatIDR,
  formatMonth,
  formatShortIDR,
  getCategory,
  INCOME_CATEGORIES,
  STORAGE_KEY,
  Transaction,
  TransactionKind,
} from "@/src/utils/finance";
import { storage } from "@/src/utils/storage";

type TabKey = "home" | "history" | "reports" | "settings";

const COLORS = {
  bg: "#121417",
  card: "#1A1D23",
  cardSoft: "#20242C",
  text: "#F4F5F7",
  muted: "#9FA3B1",
  border: "#2E3440",
  green: "#10B981",
  greenDark: "#064E3B",
  red: "#F87171",
  blue: "#60A5FA",
  yellow: "#FBBF24",
  onSurface: "#F4F5F7",
  borderStrong: "#4C566A",
};

const today = () => new Date().toISOString();

const getTotals = (transactions: Transaction[]) => transactions.reduce(
  (totals, transaction) => {
    if (transaction.kind === "income") totals.income += transaction.amount;
    else totals.expense += transaction.amount;
    return totals;
  },
  { income: 0, expense: 0 },
);

const getMonthTransactions = (transactions: Transaction[]) => {
  const now = new Date();
  return transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
};

export default function Index() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("home");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    storage.getItem(STORAGE_KEY, [] as Transaction[]).then((saved) => {
      if (Array.isArray(saved)) setTransactions(saved as Transaction[]);
      setIsLoaded(true);
    });
  }, []);

  const saveTransactions = async (next: Transaction[]) => {
    setTransactions(next);
    await storage.setItem(STORAGE_KEY, next);
  };

  const addTransaction = async (transaction: Transaction) => {
    await saveTransactions([transaction, ...transactions]);
    setShowAdd(false);
    setTab("home");
  };

  const deleteTransaction = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const next = transactions.filter((item) => item.id !== pendingDeleteId);
    setPendingDeleteId(null);
    await saveTransactions(next);
  };

  const clearData = () => {
    Alert.alert("Hapus semua data?", "Semua catatan duwit di perangkat akan dihapus.", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus semua", style: "destructive", onPress: () => saveTransactions([]) },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        {!isLoaded ? <LoadingState /> : (
          <>
            {tab === "home" && <Dashboard transactions={transactions} onAdd={() => setShowAdd(true)} onSeeAll={() => setTab("history")} onDelete={deleteTransaction} />}
            {tab === "history" && <History transactions={transactions} onDelete={deleteTransaction} />}
            {tab === "reports" && <Reports transactions={transactions} />}
            {tab === "settings" && <Settings transactions={transactions} onClear={clearData} />}
          </>
        )}
      </View>
      <BottomNav active={tab} onChange={setTab} onAdd={() => setShowAdd(true)} bottomInset={insets.bottom} />
      <AddTransactionModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={addTransaction} />
      <ConfirmDeleteModal visible={pendingDeleteId !== null} onCancel={() => setPendingDeleteId(null)} onConfirm={confirmDelete} />
    </View>
  );
}

function LoadingState() {
  return <View style={styles.loading}><View style={styles.loaderDot} /><Text style={styles.loadingText}>Menyiapkan dompetmu...</Text></View>;
}

function Dashboard({ transactions, onAdd, onSeeAll, onDelete }: { transactions: Transaction[]; onAdd: () => void; onSeeAll: () => void; onDelete: (id: string) => void }) {
  const monthTransactions = getMonthTransactions(transactions);
  const totals = getTotals(monthTransactions);
  const balance = getTotals(transactions);
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>MY DUWIT GWEJH</Text>
          <Text style={styles.title}>Halo, pemilik duwit</Text>
        </View>
        <View style={styles.localBadge}><Ionicons name="shield-checkmark" size={15} color={COLORS.green} /><Text style={styles.localText}>Lokal</Text></View>
      </View>
      <LinearGradient colors={["#173C33", "#123028", "#1A1D23"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <View style={styles.balanceCardTop}><Text style={styles.cardLabel}>Total saldo</Text><Ionicons name="wallet-outline" size={22} color="#A7F3D0" /></View>
        <Text style={styles.balanceAmount}>{formatIDR(balance.income - balance.expense)}</Text>
        <View style={styles.balanceFooter}><Text style={styles.balanceHint}>Semua catatan</Text><Ionicons name="trending-up" size={16} color="#6EE7B7" /></View>
      </LinearGradient>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>RINGKASAN</Text><Text style={styles.sectionTitle}>{formatMonth(new Date())}</Text></View><Pressable onPress={() => {}}><Text style={styles.linkText}>Bulan ini</Text></Pressable></View>
      <View style={styles.statsRow}>
        <StatCard label="Pemasukan" value={totals.income} color={COLORS.green} icon="arrow-down" />
        <StatCard label="Pengeluaran" value={totals.expense} color={COLORS.red} icon="arrow-up" />
      </View>
      <Pressable onPress={onAdd} style={({ pressed }) => [styles.addCta, pressed && styles.pressed]}><View style={styles.addIcon}><Ionicons name="add" size={22} color={COLORS.bg} /></View><View style={styles.addCopy}><Text style={styles.addTitle}>Catat transaksi</Text><Text style={styles.addSubtitle}>Jangan biarkan pengeluaran lewat begitu saja</Text></View><Ionicons name="chevron-forward" size={20} color={COLORS.green} /></Pressable>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>AKTIVITAS TERBARU</Text><Text style={styles.sectionTitle}>Catatan terakhir</Text></View>{transactions.length > 0 && <Pressable onPress={onSeeAll}><Text style={styles.linkText}>Lihat semua</Text></Pressable>}</View>
      {transactions.length === 0 ? <EmptyState onAdd={onAdd} /> : transactions.slice(0, 4).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onDelete={onDelete} />)}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: "arrow-down" | "arrow-up" }) {
  return <View style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={17} color={color} /></View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{formatShortIDR(value)}</Text></View>;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="journal-outline" size={29} color={COLORS.green} /></View><Text style={styles.emptyTitle}>Belum ada catatan duwit</Text><Text style={styles.emptyText}>Mulai catat transaksi pertamamu dan lihat ke mana perginya uangmu.</Text><Pressable onPress={onAdd} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Ionicons name="add" size={18} color={COLORS.bg} /><Text style={styles.primaryButtonText}>Tambah transaksi</Text></Pressable></View>;
}

function TransactionRow({ transaction, onDelete }: { transaction: Transaction; onDelete?: (id: string) => void }) {
  const category = getCategory(transaction.category);
  const isIncome = transaction.kind === "income";
  return <Pressable onLongPress={() => onDelete?.(transaction.id)} style={styles.transactionRow}><View style={[styles.transactionIcon, { backgroundColor: `${category.color}20` }]}><Ionicons name={isIncome ? "arrow-down" : category.icon} size={19} color={isIncome ? COLORS.green : category.color} /></View><View style={styles.transactionMain}><Text style={styles.transactionName}>{transaction.category}</Text><Text style={styles.transactionDate}>{transaction.note || formatDate(transaction.date)}</Text></View><Text style={[styles.transactionAmount, { color: isIncome ? COLORS.green : COLORS.text }]}>{isIncome ? "+" : "-"}{formatIDR(transaction.amount)}</Text>{onDelete && <Pressable testID={`delete-${transaction.id}`} accessibilityLabel={`Hapus ${transaction.category}`} onPress={() => onDelete(transaction.id)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: 2 }}><Ionicons name="trash-outline" size={18} color={COLORS.red} /></Pressable>}</Pressable>;
}

function History({ transactions, onDelete }: { transactions: Transaction[]; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<"all" | TransactionKind>("all");
  const filtered = transactions.filter((item) => filter === "all" || item.kind === filter);
  const totals = getTotals(transactions);
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader kicker="RIWAYAT" title="Semua catatan" subtitle="Geser perjalanan duwitmu" /><View style={styles.historySummary}><View><Text style={styles.cardLabel}>Arus kas bersih</Text><Text style={styles.historyAmount}>{formatIDR(totals.income - totals.expense)}</Text></View><View style={styles.historyPill}><Ionicons name="pulse" size={15} color={COLORS.green} /><Text style={styles.historyPillText}>{transactions.length} catatan</Text></View></View><View style={styles.filterRow}>{([["all", "Semua"], ["income", "Masuk"], ["expense", "Keluar"]] as const).map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text></Pressable>)}</View>{filtered.length === 0 ? <EmptyState onAdd={() => {}} /> : filtered.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onDelete={onDelete} />)}<Text style={styles.helperText}>Tekan dan tahan catatan untuk menghapus.</Text></ScrollView>;
}

function Reports({ transactions }: { transactions: Transaction[] }) {
  const monthTransactions = getMonthTransactions(transactions);
  const totals = getTotals(monthTransactions);
  const categoryTotals = useMemo(() => CATEGORIES.map((category) => ({ ...category, total: monthTransactions.filter((item) => item.kind === "expense" && item.category === category.name).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total), [monthTransactions]);
  const max = categoryTotals[0]?.total ?? 1;
  const daily = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (6 - index)); return monthTransactions.filter((item) => item.kind === "expense" && new Date(item.date).toDateString() === day.toDateString()).reduce((sum, item) => sum + item.amount, 0); });
  const maxDaily = Math.max(...daily, 1);
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader kicker="INSIGHT" title="Laporan" subtitle="Kenali pola pengeluaranmu" /><View style={styles.reportMain}><Text style={styles.cardLabel}>Pengeluaran bulan ini</Text><Text style={styles.reportAmount}>{formatIDR(totals.expense)}</Text><View style={styles.reportCompare}><Ionicons name="calendar-outline" size={14} color={COLORS.muted} /><Text style={styles.reportCompareText}>{formatMonth(new Date())}</Text></View></View><View style={styles.reportCard}><Text style={styles.cardTitle}>Aktivitas 7 hari terakhir</Text><View style={styles.chart}>{daily.map((amount, index) => <View key={index} style={styles.chartColumn}><View style={[styles.bar, { height: Math.max(amount ? (amount / maxDaily) * 90 : 4, 4), backgroundColor: amount ? COLORS.green : COLORS.border }]} /><Text style={styles.chartLabel}>{["S", "M", "S", "R", "K", "J", "S"][index]}</Text></View>)}</View></View><View style={styles.reportCard}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}>Menurut kategori</Text><Text style={styles.cardMeta}>{categoryTotals.length} kategori</Text></View>{categoryTotals.length === 0 ? <Text style={styles.noData}>Belum cukup data untuk membuat laporan.</Text> : categoryTotals.map((item) => <View key={item.name} style={styles.categoryReport}><View style={styles.categoryReportTop}><View style={styles.categoryReportName}><View style={[styles.miniDot, { backgroundColor: item.color }]} /><Text style={styles.categoryText}>{item.name}</Text></View><Text style={styles.categoryTotal}>{formatIDR(item.total)}</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(item.total / max) * 100}%`, backgroundColor: item.color }]} /></View></View>)}</View></ScrollView>;
}

function Settings({ transactions, onClear }: { transactions: Transaction[]; onClear: () => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader kicker="PENGATURAN" title="Profil dompet" subtitle="Semua tetap di perangkatmu" /><View style={styles.profileCard}><View style={styles.profileMark}><Ionicons name="wallet" size={26} color={COLORS.bg} /></View><View><Text style={styles.profileName}>My duwit gwejh</Text><Text style={styles.profileSub}>Pencatat keuangan pribadi</Text></View></View><Text style={styles.groupLabel}>PREFERENSI</Text><SettingRow icon="cash-outline" label="Mata uang" value="Rupiah (IDR)" /><SettingRow icon="lock-closed-outline" label="Privasi" value="Lokal, tanpa akun" /><SettingRow icon="layers-outline" label="Total catatan" value={`${transactions.length} transaksi`} /><Text style={styles.groupLabel}>DATA PERANGKAT</Text><Pressable onPress={onClear} style={({ pressed }) => [styles.dangerRow, pressed && styles.pressed]}><View style={styles.settingIconDanger}><Ionicons name="trash-outline" size={19} color={COLORS.red} /></View><View style={styles.settingCopy}><Text style={styles.dangerTitle}>Hapus semua data</Text><Text style={styles.settingSub}>Bersihkan seluruh catatan dari perangkat</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.red} /></Pressable><View style={styles.about}><Ionicons name="sparkles-outline" size={16} color={COLORS.green} /><Text style={styles.aboutText}>Dibuat sederhana untuk membantu kamu lebih sadar dengan setiap rupiah.</Text></View></ScrollView>;
}

function SettingRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.settingRow}><View style={styles.settingIcon}><Ionicons name={icon} size={19} color={COLORS.green} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{label}</Text><Text style={styles.settingSub}>{value}</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.muted} /></View>;
}

function ConfirmDeleteModal({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}><View style={styles.modalOverlay}><Pressable style={styles.modalBackdrop} onPress={onCancel} /><View style={[styles.modalSheet, { paddingTop: 22, paddingBottom: 20 }]}><View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}><View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: "#3C1F26", alignItems: "center", justifyContent: "center", marginRight: 12 }}><Ionicons name="trash-outline" size={21} color={COLORS.red} /></View><View style={{ flex: 1 }}><Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800" }}>Hapus catatan?</Text><Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>Catatan ini akan dihapus dari perangkat.</Text></View></View><View style={{ flexDirection: "row", gap: 10 }}><Pressable testID="cancel-delete" onPress={onCancel} style={{ flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.cardSoft }}><Text style={{ color: COLORS.text, fontSize: 13, fontWeight: "800" }}>Batal</Text></Pressable><Pressable testID="confirm-delete" onPress={onConfirm} style={{ flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.red }}><Text style={{ color: "#450A0A", fontSize: 13, fontWeight: "800" }}>Hapus</Text></Pressable></View></View></View></Modal>;
}

function ScreenHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return <View style={styles.screenHeader}><Text style={styles.eyebrow}>{kicker}</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>;
}

function BottomNav({ active, onChange, onAdd, bottomInset }: { active: TabKey; onChange: (tab: TabKey) => void; onAdd: () => void; bottomInset: number }) {
  const items: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [{ key: "home", label: "Beranda", icon: "grid-outline" }, { key: "history", label: "Riwayat", icon: "time-outline" }, { key: "reports", label: "Laporan", icon: "pie-chart-outline" }, { key: "settings", label: "Profil", icon: "person-outline" }];
  return <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 10) }]}><View style={styles.bottomItems}>{items.slice(0, 2).map((item) => <NavItem key={item.key} item={item} active={active} onPress={() => onChange(item.key)} />)}<Pressable onPress={onAdd} style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}><Ionicons name="add" size={26} color={COLORS.bg} /></Pressable>{items.slice(2).map((item) => <NavItem key={item.key} item={item} active={active} onPress={() => onChange(item.key)} />)}</View></View>;
}

function NavItem({ item, active, onPress }: { item: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }; active: TabKey; onPress: () => void }) {
  const selected = active === item.key;
  return <Pressable testID={`tab-${item.key}`} onPress={onPress} style={styles.navItem}><Ionicons name={item.icon} size={21} color={selected ? COLORS.green : COLORS.muted} /><Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text></Pressable>;
}

function AddTransactionModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (transaction: Transaction) => void }) {
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const categoryOptions = kind === "income" ? INCOME_CATEGORIES : CATEGORIES;
  useEffect(() => {
    setCategory(kind === "income" ? INCOME_CATEGORIES[0].name : CATEGORIES[0].name);
  }, [kind]);
  useEffect(() => {
    if (visible) {
      setKind("expense");
      setCategory(CATEGORIES[0].name);
      setError("");
    }
  }, [visible]);
  const save = () => {
    const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!numericAmount) { setError("Masukkan nominal terlebih dahulu."); return; }
    onSave({ id: `${Date.now()}-${Math.random()}`, kind, amount: numericAmount, category, note: note.trim(), date: today() });
    setAmount(""); setNote(""); setError("");
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}><Pressable style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); onClose(); }} /><View style={[styles.modalSheet, { maxHeight: "92%" }]}><ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={styles.modalHandle} /><View style={styles.modalHeader}><View><Text style={styles.modalKicker}>TRANSAKSI BARU</Text><Text style={styles.modalTitle}>Catat duwit</Text></View><Pressable testID="close-transaction-modal" onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={21} color={COLORS.muted} /></Pressable></View><View style={styles.segment}><Pressable testID="expense-toggle" onPress={() => setKind("expense")} style={[styles.segmentButton, kind === "expense" && styles.segmentActive]}><Ionicons name="arrow-up" size={16} color={kind === "expense" ? COLORS.red : COLORS.muted} /><Text style={[styles.segmentText, kind === "expense" && styles.segmentTextActive]}>Pengeluaran</Text></Pressable><Pressable testID="income-toggle" onPress={() => setKind("income")} style={[styles.segmentButton, kind === "income" && styles.segmentActive]}><Ionicons name="arrow-down" size={16} color={kind === "income" ? COLORS.green : COLORS.muted} /><Text style={[styles.segmentText, kind === "income" && styles.segmentTextActive]}>Pemasukan</Text></Pressable></View><Text style={styles.inputLabel}>NOMINAL</Text><View style={styles.amountInputWrap}><Text style={styles.currencyPrefix}>Rp</Text><TextInput testID="amount-input" value={amount ? Number(amount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : "0"} onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={COLORS.muted} style={styles.amountInput} /></View><Text style={styles.inputLabel}>KATEGORI</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>{categoryOptions.map((item: Category) => <Pressable testID={`category-${item.name}`} key={item.name} onPress={() => setCategory(item.name)} style={[styles.categoryChip, category === item.name && { borderColor: item.color, backgroundColor: `${item.color}18` }]}><Ionicons name={item.icon} size={16} color={category === item.name ? item.color : COLORS.muted} /><Text style={[styles.categoryChipText, category === item.name && { color: COLORS.text }]}>{item.name}</Text></Pressable>)}</ScrollView><TextInput testID="note-input" value={note} onChangeText={setNote} placeholder="Catatan (opsional)" placeholderTextColor={COLORS.muted} style={styles.noteInput} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />{error ? <Text style={styles.errorText}>{error}</Text> : null}<Pressable testID="save-transaction" onPress={save} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveButtonText}>Simpan transaksi</Text><Ionicons name="arrow-forward" size={18} color={COLORS.bg} /></Pressable></ScrollView></View></KeyboardAvoidingView></Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg }, screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 20 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }, loaderDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.green }, loadingText: { color: COLORS.muted, fontSize: 14 }, topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }, eyebrow: { color: COLORS.green, fontSize: 11, letterSpacing: 1.8, fontWeight: "700", marginBottom: 8 }, title: { color: COLORS.text, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.5 }, subtitle: { color: COLORS.muted, fontSize: 15, marginTop: 7 }, localBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: COLORS.greenDark, borderRadius: 20 }, localText: { color: "#A7F3D0", fontSize: 12, fontWeight: "700" }, balanceCard: { borderRadius: 22, padding: 22, minHeight: 164, justifyContent: "space-between", marginBottom: 30, borderWidth: 1, borderColor: "#245C4C" }, balanceCardTop: { flexDirection: "row", justifyContent: "space-between" }, cardLabel: { color: "#A7F3D0", fontSize: 13, fontWeight: "600" }, balanceAmount: { color: COLORS.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.8, marginTop: 22 }, balanceFooter: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 14 }, balanceHint: { color: "#7DD3B2", fontSize: 12 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }, sectionKicker: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 5 }, sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800" }, linkText: { color: COLORS.green, fontSize: 13, fontWeight: "700", paddingBottom: 2 }, statsRow: { flexDirection: "row", gap: 12, marginBottom: 18 }, statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 17, padding: 15, borderWidth: 1, borderColor: COLORS.border }, statIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 13 }, statLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 6 }, statValue: { color: COLORS.text, fontSize: 16, fontWeight: "800" }, addCta: { backgroundColor: COLORS.green, borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 31, shadowColor: COLORS.green, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, addIcon: { width: 40, height: 40, backgroundColor: "#A7F3D0", borderRadius: 13, alignItems: "center", justifyContent: "center" }, addCopy: { flex: 1, marginLeft: 12 }, addTitle: { color: COLORS.bg, fontSize: 15, fontWeight: "800" }, addSubtitle: { color: "#064E3B", fontSize: 11, marginTop: 4 }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] }, empty: { alignItems: "center", backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 24, paddingVertical: 28 }, emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLORS.greenDark, alignItems: "center", justifyContent: "center", marginBottom: 15 }, emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 7 }, emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 18 }, primaryButton: { backgroundColor: COLORS.green, minHeight: 44, paddingHorizontal: 17, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 7 }, primaryButtonText: { color: COLORS.bg, fontSize: 13, fontWeight: "800" }, transactionRow: { minHeight: 70, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border }, transactionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 }, transactionMain: { flex: 1 }, transactionName: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginBottom: 5 }, transactionDate: { color: COLORS.muted, fontSize: 12 }, transactionAmount: { fontSize: 13, fontWeight: "800" }, screenHeader: { marginBottom: 25 }, historySummary: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 }, historyAmount: { color: COLORS.text, fontSize: 23, fontWeight: "800", marginTop: 8 }, historyPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.greenDark, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 }, historyPillText: { color: "#A7F3D0", fontSize: 11, fontWeight: "700" }, filterRow: { flexDirection: "row", gap: 8, marginBottom: 10 }, filter: { paddingHorizontal: 17, minHeight: 38, justifyContent: "center", borderRadius: 20, backgroundColor: COLORS.card }, filterActive: { backgroundColor: COLORS.green }, filterText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" }, filterTextActive: { color: COLORS.bg }, helperText: { color: COLORS.muted, textAlign: "center", fontSize: 11, marginTop: 22 }, reportMain: { backgroundColor: COLORS.greenDark, borderRadius: 20, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: "#176C52" }, reportAmount: { color: COLORS.text, fontSize: 28, fontWeight: "800", marginTop: 11 }, reportCompare: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 13 }, reportCompareText: { color: "#A7F3D0", fontSize: 12 }, reportCard: { backgroundColor: COLORS.card, borderRadius: 19, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border }, cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" }, cardMeta: { color: COLORS.muted, fontSize: 11 }, chart: { height: 125, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingTop: 15 }, chartColumn: { height: 110, alignItems: "center", justifyContent: "flex-end", gap: 8 }, bar: { width: 22, borderRadius: 7, minHeight: 4 }, chartLabel: { color: COLORS.muted, fontSize: 11 }, noData: { color: COLORS.muted, fontSize: 13, lineHeight: 20, paddingVertical: 8 }, categoryReport: { marginBottom: 16 }, categoryReportTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }, categoryReportName: { flexDirection: "row", alignItems: "center", gap: 8 }, miniDot: { width: 8, height: 8, borderRadius: 4 }, categoryText: { color: COLORS.onSurface ?? COLORS.text, fontSize: 13 }, categoryTotal: { color: COLORS.text, fontSize: 12, fontWeight: "700" }, progressTrack: { height: 6, backgroundColor: COLORS.cardSoft, borderRadius: 5, overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 5 }, profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 28 }, profileMark: { width: 52, height: 52, backgroundColor: COLORS.green, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 14 }, profileName: { color: COLORS.text, fontSize: 17, fontWeight: "800" }, profileSub: { color: COLORS.muted, fontSize: 12, marginTop: 5 }, groupLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 10 }, settingRow: { minHeight: 69, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border }, settingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.greenDark, alignItems: "center", justifyContent: "center", marginRight: 12 }, settingCopy: { flex: 1 }, settingTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" }, settingSub: { color: COLORS.muted, fontSize: 12, marginTop: 4 }, dangerRow: { minHeight: 70, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border }, settingIconDanger: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#3C1F26", alignItems: "center", justifyContent: "center", marginRight: 12 }, dangerTitle: { color: COLORS.red, fontSize: 14, fontWeight: "700" }, about: { flexDirection: "row", gap: 8, backgroundColor: COLORS.card, borderRadius: 15, padding: 15, marginTop: 30, marginBottom: 20 }, aboutText: { color: COLORS.muted, flex: 1, fontSize: 12, lineHeight: 18 }, bottomNav: { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border }, bottomItems: { height: 70, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }, navItem: { width: 68, minHeight: 50, alignItems: "center", justifyContent: "center", gap: 4 }, navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "600" }, navLabelActive: { color: COLORS.green, fontWeight: "800" }, fab: { width: 52, height: 52, borderRadius: 19, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center", marginTop: -22, borderWidth: 5, borderColor: COLORS.bg, shadowColor: COLORS.green, shadowOpacity: 0.3, shadowRadius: 9, elevation: 6 }, fabPressed: { transform: [{ scale: 0.92 }] }, modalOverlay: { flex: 1, justifyContent: "flex-end" }, modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" }, modalSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: Platform.select({ ios: 28, android: 20 }), paddingTop: 12, borderWidth: 1, borderColor: COLORS.border }, modalHandle: { width: 40, height: 4, borderRadius: 3, backgroundColor: COLORS.borderStrong ?? COLORS.border, alignSelf: "center", marginBottom: 18 }, modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }, modalKicker: { color: COLORS.green, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 6 }, modalTitle: { color: COLORS.text, fontSize: 24, fontWeight: "800" }, closeButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.cardSoft, alignItems: "center", justifyContent: "center" }, segment: { flexDirection: "row", backgroundColor: COLORS.bg, borderRadius: 14, padding: 4, marginBottom: 21 }, segmentButton: { flex: 1, minHeight: 44, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, segmentActive: { backgroundColor: COLORS.cardSoft }, segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" }, segmentTextActive: { color: COLORS.text }, inputLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 7 }, amountInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 15, marginBottom: 17 }, currencyPrefix: { color: COLORS.green, fontSize: 18, fontWeight: "800", marginRight: 8 }, amountInput: { flex: 1, color: COLORS.text, fontSize: 24, fontWeight: "800", paddingVertical: 13 }, categoryScroll: { gap: 8, paddingBottom: 16 }, categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg, borderRadius: 20, paddingHorizontal: 12, minHeight: 38 }, categoryChipText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" }, noteInput: { minHeight: 48, backgroundColor: COLORS.bg, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.text, fontSize: 13, marginBottom: 10 }, errorText: { color: COLORS.red, fontSize: 12, marginBottom: 10 }, saveButton: { backgroundColor: COLORS.green, minHeight: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 4 }, saveButtonText: { color: COLORS.bg, fontSize: 14, fontWeight: "800" },
});