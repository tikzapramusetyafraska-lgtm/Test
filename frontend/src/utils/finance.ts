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

export const CATEGORIES: Category[] = [
  { name: "Makanan", icon: "restaurant-outline", color: "#F59E0B" },
  { name: "Transportasi", icon: "car-outline", color: "#60A5FA" },
  { name: "Belanja", icon: "bag-handle-outline", color: "#C084FC" },
  { name: "Tagihan", icon: "receipt-outline", color: "#FB7185" },
  { name: "Hiburan", icon: "game-controller-outline", color: "#2DD4BF" },
  { name: "Kesehatan", icon: "medkit-outline", color: "#34D399" },
  { name: "Rumah", icon: "home-outline", color: "#F97316" },
  { name: "Lainnya", icon: "ellipsis-horizontal-circle-outline", color: "#94A3B8" },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: "Gaji", icon: "briefcase-outline", color: "#34D399" },
  { name: "Bonus", icon: "gift-outline", color: "#FBBF24" },
  { name: "Lainnya", icon: "ellipsis-horizontal-circle-outline", color: "#94A3B8" },
];

export const STORAGE_KEY = "my-duwit-gwejh-transactions-v1";

export const formatIDR = (value: number) => {
  const formatted = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.round(value));
  return formatted.replace(/\s/g, " ");
};

export const formatShortIDR = (value: number) => {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace(".0", "")} jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(1).replace(".0", "")} rb`;
  return formatIDR(value);
};

export const formatDate = (date: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(date));
export const formatMonth = (date: Date) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
export const getCategory = (name: string) => CATEGORIES.find((category) => category.name === name) ?? CATEGORIES[CATEGORIES.length - 1];