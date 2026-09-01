# My duwit gwejh — PRD

## Ringkasan
Aplikasi pencatat pemasukan & pengeluaran pribadi berbahasa Indonesia (mata uang IDR). Fokus utama: **100% offline, tanpa login, elegan dan gamified**. Berjalan di Expo (Android/iOS) dengan penyimpanan lokal AsyncStorage.

## Prinsip Produk
- Zero-login, semua data disimpan di perangkat.
- UI dark/emerald "obsidian luxe" dengan wallpaper global yang bisa diganti.
- Setiap fitur harus tetap fungsional saat tanpa internet.

## Fitur Inti (v1.1)
1. **Profil Pengguna** — nama & foto (galeri) tersimpan lokal, avatar di dashboard.
2. **Wallpaper Global** — 6 preset gradient + upload foto dari galeri. Berlaku di semua menu.
3. **Kategori Lengkap** — 14 kategori pengeluaran + 6 kategori pemasukan.
4. **Auto-Kategorisasi** — kata kunci di catatan otomatis pilih kategori (contoh: "membership game" → Hiburan & Lifestyle). User bisa override manual.
5. **Filter Waktu Dinamis** — 7/30/60/90 hari + picker 12 bulan terakhir untuk riwayat & laporan.
6. **Ekspor PDF & CSV** — via share menu bawaan (expo-print + expo-sharing). Periode: cepat, per bulan, atau rentang tanggal kustom.
7. **Chart Bar & Donut** — pengeluaran 7 hari terakhir + sebaran kategori pie (react-native-svg).
8. **Skor Keuangan** — kombinasi rasio pengeluaran/pemasukan + konsistensi mencatat harian. Skala 0-100 dengan label (Sangat Hemat/Hemat/Seimbang/Boros/Sangat Boros).
9. **Achievements** — 4 pencapaian: konsisten 3 bulan skor 100, legenda hemat 12 bulan, 7 hari beruntun mencatat, 30 transaksi pertama.
10. **Dukung Pembuat** — halaman apresiasi dengan QRIS Kenean Store + pesan terima kasih.

## Arsitektur
- Frontend: Expo Router (single tab shell), React Native, react-native-svg
- Storage: AsyncStorage via `@/src/utils/storage`
- Keys: `my-duwit-gwejh-transactions-v1`, `my-duwit-gwejh-wallpaper-v1`, `my-duwit-gwejh-profile-v1`

## Tidak Ada
- Autentikasi
- Backend / API eksternal
- Sinkronisasi cloud
