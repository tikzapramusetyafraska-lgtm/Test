# PRD — My duwit gwejh

## Problem statement
“Halo bisa bantu aku membuat website atau apk menghitung pengeluaran?”

Pengguna membutuhkan aplikasi Android sederhana untuk mencatat pemasukan dan pengeluaran dalam Rupiah, melihat saldo, dan memahami pola pengeluaran tanpa membuat akun.

## Architecture
- Expo React Native mobile app, Android-first, dengan satu entry screen dan navigasi tab internal.
- Penyimpanan lokal memakai AsyncStorage melalui utilitas `src/utils/storage`; tidak ada login dan tidak ada ketergantungan API backend untuk alur utama.
- Data transaksi bertipe `Transaction` berisi jenis, nominal, kategori, catatan, tanggal, dan ID lokal.
- Styling dark-first obsidian dengan aksen emerald, kartu ringkasan, grafik batang sederhana, dan ikon Expo Vector Icons.

## User personas
- Pengguna harian yang ingin cepat mencatat pengeluaran kecil dalam IDR.
- Pengguna pribadi yang ingin memantau saldo dan membandingkan pemasukan dengan pengeluaran tanpa membagikan data ke server.

## Core requirements (static)
- Catat pemasukan dan pengeluaran.
- Kategori pengeluaran.
- Kategori pemasukan Gaji, Bonus, dan Lainnya.
- Ringkasan saldo, pemasukan, dan pengeluaran bulan berjalan.
- Riwayat transaksi dengan filter Semua, Masuk, dan Keluar.
- Laporan sederhana berdasarkan aktivitas 7 hari dan kategori.
- Hapus catatan pemasukan maupun pengeluaran dengan konfirmasi.
- Data tersimpan lokal tanpa login, menggunakan format Rupiah.

## Implemented (2026-08-30)
- Dashboard dark/elegan dengan saldo total, ringkasan bulan berjalan, CTA tambah transaksi, dan empty state.
- Modal transaksi scrollable dan keyboard-aware untuk layar kecil; mendukung pemasukan/pengeluaran, nominal IDR, kategori, dan catatan.
- Menambahkan kategori pemasukan Gaji dan Bonus.
- Bottom navigation Beranda, Riwayat, Laporan, dan Profil.
- Persistensi transaksi lokal, filter riwayat, grafik 7 hari, breakdown kategori, dan profil privasi lokal.
- Menambahkan tombol hapus terlihat di setiap baris transaksi pada dashboard dan riwayat, plus konfirmasi internal lintas platform.
- Menambahkan test IDs untuk kontrol modal dan navigasi utama.

## Prioritized backlog

### P0 — Remaining
- Tidak ada item P0 untuk MVP saat ini.

### P1 — Next improvements
- Tambahkan edit transaksi dari detail catatan.
- Tambahkan tanggal transaksi yang dapat dipilih pengguna.
- Tambahkan ekspor dan impor backup JSON lokal.
- Tambahkan budget per kategori dan indikator batas pengeluaran.

### P2 — Later improvements
- Pengingat pencatatan transaksi.
- Tema terang sebagai opsi.
- Widget ringkasan saldo Android.

## Next tasks
1. Validasi tombol konfirmasi hapus pada perangkat Android fisik.
2. Prioritaskan edit transaksi dan pemilihan tanggal.
3. Tambahkan ekspor/impor agar pengguna dapat memindahkan data dengan aman.