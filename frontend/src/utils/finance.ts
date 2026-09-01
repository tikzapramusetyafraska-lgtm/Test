import type { Ionicons } from "@expo/vector-icons";

export type TransactionKind = "income" | "expense";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  note: string;
  date: string;
};

export type Category = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { name: "MAKANAN & MINUMAN", icon: "restaurant-outline", color: "#F59E0B" },
  { name: "TRANSPORTASI", icon: "car-outline", color: "#60A5FA" },
  { name: "BELANJA", icon: "bag-handle-outline", color: "#C084FC" },
  { name: "BELANJA ONLINE", icon: "cart-outline", color: "#F472B6" },
  { name: "TAGIHAN", icon: "receipt-outline", color: "#FB7185" },
  { name: "HIBURAN & LIFESTYLE", icon: "game-controller-outline", color: "#2DD4BF" },
  { name: "KESEHATAN", icon: "medkit-outline", color: "#34D399" },
  { name: "PENDIDIKAN & SELF-DEVELOPMENT", icon: "book-outline", color: "#38BDF8" },
  { name: "RUMAH TANGGA", icon: "home-outline", color: "#F97316" },
  { name: "TEMPAT TINGGAL", icon: "business-outline", color: "#FBBF24" },
  { name: "TABUNGAN & INVESTASI", icon: "trending-up-outline", color: "#22D3EE" },
  { name: "DONASI & ZAKAT", icon: "heart-outline", color: "#EF4444" },
  { name: "HUTANG", icon: "cash-outline", color: "#A78BFA" },
  { name: "LAINNYA", icon: "ellipsis-horizontal-circle-outline", color: "#94A3B8" },
];

// Legacy export retained for backward compat
export const CATEGORIES = EXPENSE_CATEGORIES;

export const INCOME_CATEGORIES: Category[] = [
  { name: "GAJI", icon: "briefcase-outline", color: "#34D399" },
  { name: "BONUS", icon: "gift-outline", color: "#FBBF24" },
  { name: "PENJUALAN", icon: "storefront-outline", color: "#60A5FA" },
  { name: "INVESTASI", icon: "trending-up-outline", color: "#22D3EE" },
  { name: "HADIAH", icon: "ribbon-outline", color: "#F472B6" },
  { name: "LAINNYA", icon: "ellipsis-horizontal-circle-outline", color: "#94A3B8" },
];

export const STORAGE_KEY = "my-duwit-gwejh-transactions-v1";

// Keyword based auto-categorization. First match wins (order matters — specific first).
const KEYWORD_MAP: { keywords: string[]; category: string }[] = [
  { category: "BELANJA ONLINE", keywords: ["shopee", "tokopedia", "lazada", "bukalapak", "blibli", "tiktok shop", "tiktokshop", "amazon", "ebay", "olshop", "online shop"] },
  { category: "MAKANAN & MINUMAN", keywords: ["makan", "minum", "kopi", "coffee", "nasi", "mie", "resto", "restoran", "cafe", "kafe", "warung", "gofood", "grabfood", "shopeefood", "starbucks", "kfc", "mcd", "burger", "pizza", "boba", "es teh", "es krim", "roti", "snack", "cemilan", "sarapan", "makan siang", "makan malam", "brunch", "dessert"] },
  { category: "TRANSPORTASI", keywords: ["bensin", "pertamax", "pertalite", "solar", "spbu", "ojek", "grab", "gojek", "maxim", "indriver", "taxi", "taksi", "bus", "kereta", "krl", "mrt", "trans", "angkot", "parkir", "tol", "e-toll", "etoll", "transport", "gocar", "grabcar"] },
  { category: "TAGIHAN", keywords: ["listrik", "pln", "air", "pdam", "internet", "wifi", "indihome", "biznet", "myrepublic", "pulsa", "kuota", "token", "tagihan", "tv kabel", "iuran"] },
  { category: "HIBURAN & LIFESTYLE", keywords: ["game", "gaming", "nonton", "bioskop", "cinema", "xxi", "cgv", "netflix", "spotify", "disney", "youtube premium", "hbo", "prime video", "hiburan", "karaoke", "membership", "streaming", "discord nitro", "steam", "playstation", "psn", "xbox", "mobile legend", "genshin", "top up game", "topup game", "topup", "top up", "salon", "spa", "gym", "fitness", "hobi"] },
  { category: "KESEHATAN", keywords: ["obat", "dokter", "apotek", "apotik", "rumah sakit", "rs ", "klinik", "vitamin", "kesehatan", "bpjs", "puskesmas", "medical", "laboratorium", "checkup", "vaksin", "suntik"] },
  { category: "PENDIDIKAN & SELF-DEVELOPMENT", keywords: ["kuliah", "kursus", "buku", "sekolah", "les", "training", "workshop", "udemy", "coursera", "self development", "seminar", "webinar", "ebook", "spp", "ukt", "bimbel", "skripsi"] },
  { category: "RUMAH TANGGA", keywords: ["sabun", "deterjen", "sapu", "pel", "peralatan rumah", "rumah tangga", "dapur", "gas elpiji", "elpiji", "gas 3kg", "beras", "minyak goreng", "gula", "garam", "sembako", "tissue", "sikat", "pasta gigi", "shampo"] },
  { category: "TEMPAT TINGGAL", keywords: ["kontrakan", "kost", "kos ", "sewa", "kpr", "cicilan rumah", "renovasi", "perbaikan rumah"] },
  { category: "TABUNGAN & INVESTASI", keywords: ["nabung", "tabungan", "investasi", "saham", "reksadana", "reksa dana", "deposito", "emas", "crypto", "bitcoin", "eth", "trading", "obligasi", "sbn"] },
  { category: "DONASI & ZAKAT", keywords: ["donasi", "zakat", "infaq", "infak", "sedekah", "amal", "sumbangan", "kitabisa"] },
  { category: "HUTANG", keywords: ["hutang", "utang", "pinjam", "cicilan", "kredit", "debt", "pinjol", "kredivo", "akulaku", "shopee paylater", "spaylater", "gopaylater", "kartu kredit", "cc "] },
  { category: "BELANJA", keywords: ["belanja", "mall", "baju", "sepatu", "toko", "supermarket", "indomaret", "alfamart", "hypermart", "carrefour", "transmart", "pakaian", "kosmetik", "fashion", "tas"] },
];

export const suggestCategory = (
  note: string,
  kind: TransactionKind,
): string | null => {
  if (kind !== "expense") return null;
  const text = note.trim().toLowerCase();
  if (!text) return null;
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => text.includes(kw))) return entry.category;
  }
  return null;
};

export const formatIDR = (value: number) => {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return formatted.replace(/\s/g, " ");
};

export const formatShortIDR = (value: number) => {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".0", "")} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".0", "")} jt`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(1).replace(".0", "")} rb`;
  return formatIDR(value);
};

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(date));

export const formatDateLong = (date: string | Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

export const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);

export const getCategory = (name: string): Category => {
  return (
    EXPENSE_CATEGORIES.find((c) => c.name === name) ||
    INCOME_CATEGORIES.find((c) => c.name === name) || {
      name,
      icon: "ellipsis-horizontal-circle-outline",
      color: "#94A3B8",
    }
  );
};

// Time filters
export type DayRange = 7 | 30 | 60 | 90;

export const filterByDays = (transactions: Transaction[], days: DayRange) => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return transactions.filter((t) => new Date(t.date) >= cutoff);
};

export const filterByMonth = (transactions: Transaction[], monthDate: Date) => {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
  });
};

export const filterByRange = (transactions: Transaction[], start: Date, end: Date) => {
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(23, 59, 59, 999);
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= s && d <= e;
  });
};

// Returns last N months including current, most recent first
export const getRecentMonths = (count = 12): Date[] => {
  const now = new Date();
  const out: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return out;
};
