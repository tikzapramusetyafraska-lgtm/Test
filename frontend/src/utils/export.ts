import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  Transaction,
  formatDateLong,
  formatIDR,
} from "./finance";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const totalsFor = (list: Transaction[]) =>
  list.reduce(
    (acc, t) => {
      if (t.kind === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

const escapeCsv = (v: string) => {
  const needs = /[",\n]/.test(v);
  const clean = v.replace(/"/g, '""');
  return needs ? `"${clean}"` : clean;
};

export const exportCsv = async (
  transactions: Transaction[],
  label: string,
): Promise<{ ok: boolean; message: string }> => {
  if (transactions.length === 0) {
    return { ok: false, message: "Belum ada catatan pada periode ini." };
  }
  const header = "Tanggal,Jenis,Kategori,Nominal,Catatan";
  const rows = transactions.map((t) => {
    const date = formatDateLong(t.date);
    const kind = t.kind === "income" ? "Pemasukan" : "Pengeluaran";
    return [
      escapeCsv(date),
      escapeCsv(kind),
      escapeCsv(t.category),
      String(t.amount),
      escapeCsv(t.note || ""),
    ].join(",");
  });
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const safe = label.replace(/[^a-z0-9-_]/gi, "_");
  const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}duwit_${safe}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  const available = await Sharing.isAvailableAsync();
  if (!available) return { ok: false, message: "Fitur berbagi tidak tersedia di perangkat ini." };
  await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Simpan / Bagikan CSV" });
  return { ok: true, message: "CSV siap dibagikan." };
};

export const exportPdf = async (
  transactions: Transaction[],
  label: string,
): Promise<{ ok: boolean; message: string }> => {
  if (transactions.length === 0) {
    return { ok: false, message: "Belum ada catatan pada periode ini." };
  }
  const { income, expense } = totalsFor(transactions);
  const net = income - expense;
  const rowsHtml = transactions
    .map(
      (t, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(formatDateLong(t.date))}</td>
        <td>${t.kind === "income" ? "Pemasukan" : "Pengeluaran"}</td>
        <td>${escapeHtml(t.category)}</td>
        <td class="right ${t.kind}">${t.kind === "income" ? "+" : "-"}${escapeHtml(formatIDR(t.amount))}</td>
        <td>${escapeHtml(t.note || "-")}</td>
      </tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
    * { font-family: -apple-system, Helvetica, Arial, sans-serif; box-sizing: border-box; }
    body { padding: 32px; color: #0B1410; background: #F0F4F1; }
    .brand { color: #00A843; letter-spacing: 3px; font-weight: 800; font-size: 11px; }
    h1 { margin: 4px 0 6px; font-size: 24px; }
    .subtitle { color: #4b5563; margin-bottom: 20px; font-size: 12px; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; }
    .card { flex: 1; padding: 14px 16px; border-radius: 12px; background: white; border: 1px solid #E5E7EB; }
    .card h3 { margin: 0 0 6px; font-size: 11px; color: #6B7280; letter-spacing: 1.5px; }
    .card p { margin: 0; font-weight: 700; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; }
    th, td { padding: 8px 10px; text-align: left; font-size: 11px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
    th { background: #F3F4F6; color: #374151; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
    .right { text-align: right; white-space: nowrap; }
    .income { color: #00A843; }
    .expense { color: #DC2626; }
    footer { margin-top: 22px; text-align: center; color: #6B7280; font-size: 10px; }
  </style></head><body>
    <div class="brand">MY DUWIT GWEJH</div>
    <h1>Laporan Keuangan</h1>
    <div class="subtitle">Periode: ${escapeHtml(label)}</div>
    <div class="summary">
      <div class="card"><h3>PEMASUKAN</h3><p class="income">${escapeHtml(formatIDR(income))}</p></div>
      <div class="card"><h3>PENGELUARAN</h3><p class="expense">${escapeHtml(formatIDR(expense))}</p></div>
      <div class="card"><h3>SELISIH</h3><p style="color:${net >= 0 ? "#00A843" : "#DC2626"}">${escapeHtml(formatIDR(net))}</p></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th class="right">Nominal</th><th>Catatan</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <footer>Dibuat oleh My duwit gwejh · offline · tanpa akun</footer>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (!available) return { ok: false, message: "Fitur berbagi tidak tersedia di perangkat ini." };
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Simpan / Bagikan PDF" });
  return { ok: true, message: "PDF siap dibagikan." };
};
