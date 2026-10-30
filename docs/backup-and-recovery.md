# Panduan Backup, Disaster Recovery & Pemulihan Sistem — Linguora

Dokumen ini menjelaskan strategi cadangan (backup), kebijakan pemulihan bencana (Disaster Recovery / DR), target RPO/RTO, dan prosedur operasional standar (SOP) pemulihan data untuk platform pembelajaran bahasa Inggris **Linguora**.

---

## 1. Target Service Level Objective (SLO)

| Metrik | Definisi | Target Produksi | Target Staging / Dev |
|---|---|---|---|
| **RPO** (Recovery Point Objective) | Batas maksimal kehilangan data saat insiden | **< 1 Jam** (dengan WAL/PITR) / **< 24 Jam** (Snapshot harian) | < 24 Jam |
| **RTO** (Recovery Time Objective) | Waktu maksimal pemulihan hingga sistem live kembali | **< 30 Menit** (Failover / Restorasi snapshot) | < 2 Jam |
| **Data Retention** | Masa penyimpanan riwayat backup | **30 Hari** (harian), **12 Bulan** (bulanan) | 7 Hari |

---

## 2. Lapisan Cadangan (Backup Layers)

### 2.1 Cadangan Fisik & Point-In-Time Recovery (PITR)
- **WAL Archiving**: Pada infrastruktur produksi Supabase PostgreSQL (AWS/GCP), aktifkan *Write-Ahead Logging* (WAL) terus menerus ke cold storage (Amazon S3 / Google Cloud Storage).
- **Point-in-Time Restore**: Memungkinkan rollback ke titik detik tertentu sebelum terjadinya kesalahan manusia (human error), kegagalan migrasi, atau kerusakan database.

### 2.2 Cadangan Logis Otomatis (Logical Dumps)
Cadangan logis menghasilkan berkas `.sql` atau format kustom PostgreSQL (`.dump`) yang independen dari versi kernel database:
- **Jadwal**: Dijalankan setiap hari pukul 02:00 WIB (saat trafik rendah).
- **Cakupan**:
  - Skema publik (`public` schema): tabel, views, functions, triggers, constraints.
  - Skema auth (`auth` schema): akun pengguna Supabase Auth, identitas, dan refresh token.
  - Skema storage (`storage` schema): metadata berkas media dan bucket.

### 2.3 Cadangan Objek Media (Supabase Storage)
- Seluruh aset pembelajaran non-relasional (audio pelafalan, avatar pengguna, file listening) yang tersimpan pada bucket Supabase Storage direplikasi secara multi-region atau disinkronkan berkala menggunakan rclone/AWS CLI ke S3 bucket cadangan sekunder.

---

## 3. Prosedur Operasional Pembuatan Backup

### 3.1 Backup Lingkungan Lokal / Staging (Supabase CLI)

```bash
# 1. Ekspor seluruh skema dan data database
npx supabase db dump -f supabase/backups/linguora_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Ekspor data saja (tanpa skema DDL)
npx supabase db dump --data-only -f supabase/backups/linguora_data_$(date +%Y%m%d_%H%M%S).sql

# 3. Ekspor struktur peran dan peran database
npx supabase db dump --role-only -f supabase/backups/linguora_roles_$(date +%Y%m%d_%H%M%S).sql
```

### 3.2 Backup Lingkungan Produksi (Native pg_dump)

```bash
# Cadangan terkompresi dengan format kustom (disarankan untuk database > 1GB)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="linguora_prod_$(date +%Y%m%d_%H%M%S).dump"

# Cadangan plaintext terkompresi gzip
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges | gzip > "linguora_prod_$(date +%Y%m%d_%H%M%S).sql.gz"
```

---

## 4. Prosedur Pemulihan (Restoration Runbook)

### 4.1 Pemulihan Penuh (Full Disaster Recovery)

Jika terjadi insiden fatal yang mengharuskan pembangunan ulang instans database:

1. **Siapkan instans PostgreSQL target**:
   Pastikan ekstensi yang dibutuhkan sudah tersedia (`pgcrypto`, `pg_trgm`).

2. **Eksekusi migrasi dasar (jika memulihkan data saja)**:
   ```bash
   npx supabase db reset
   ```

3. **Restorasi dari berkas dump**:
   ```bash
   # Jika menggunakan format kustom (.dump):
   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname="$DATABASE_URL" linguora_prod_20261030.dump

   # Jika menggunakan format SQL gzip:
   gunzip -c linguora_prod_20261030.sql.gz | psql "$DATABASE_URL"
   ```

4. **Regenerasi Type Definitions TypeScript**:
   ```bash
   npm run db:types
   ```

5. **Jalankan Verifikasi Integritas**:
   ```bash
   npm run content:validate
   npm run test:unit
   npm run test:integration
   ```

### 4.2 Pemulihan Selektif / Tabel Tertentu (Partial Table Restore)

Jika terjadi penghapusan atau kerusakan data pada satu tabel tertentu (misalnya kurikulum `lessons` atau `questions` tidak sengaja terhapus, tetapi data riwayat belajar siswa `user_stats` dan `xp_transactions` tidak boleh tertimpa):

1. **Restorasi dump ke database sementara (temporary staging database)**.
2. **Ekspor tabel spesifik dari database sementara**:
   ```bash
   pg_dump "$TEMP_DB_URL" -t lessons -t lesson_sections --data-only > lessons_recovery.sql
   ```
3. **Import ke database produksi dengan transaksi aman**:
   ```sql
   BEGIN;
   -- Nonaktifkan trigger sementara jika diperlukan
   ALTER TABLE public.lessons DISABLE TRIGGER ALL;
   \i lessons_recovery.sql
   ALTER TABLE public.lessons ENABLE TRIGGER ALL;
   COMMIT;
   ```

---

## 5. Rollback Konten Melalui CMS (Tanpa Downtime Database)

Linguora dilengkapi dengan tabel `content_versions` dan fungsi SQL `cms_rollback_lesson`:
- Setiap kali administrator atau editor mengubah materi lesson, snapshot status sebelumnya otomatis tersimpan dalam JSONB lengkap beserta 12 seksi materinya.
- Jika materi yang baru dipublish memuat kekeliruan fatal, administrator cukup memanggil rollback melalui antarmuka CMS atau via fungsi RPC:
  ```sql
  SELECT public.cms_rollback_lesson(
    p_lesson := 'UUID_LESSON_TERKAIT',
    p_version := 2,
    p_note := 'Rollback darurat ke versi stabil'
  );
  ```
- Operasi ini bersifat atomik, tidak mengganggu pengguna yang sedang belajar, dan dicatat ke dalam `audit_logs`.

---

## 6. Uji Kelayakan Cadangan Berkala (Backup Testing SOP)

Backup yang tidak pernah diuji adalah backup yang belum terbukti berfungsi.
- **Frekuensi Simulasi**: Setiap bulan sekali pada minggu pertama.
- **Checklist Pengujian**:
  - [ ] Unduh berkas backup harian terbaru dari cloud storage.
  - [ ] Spin up kontainer database lokal/staging terisolasi.
  - [ ] Jalankan restorasi penuh tanpa kesalahan sintaks.
  - [ ] Verifikasi checksum baris tabel kunci (`COUNT(*)` pada `questions`, `profiles`, `xp_transactions`).
  - [ ] Jalankan test suite otomatis (`npm run check` & `npm run test:integration`).
  - [ ] Dokumentasikan hasil uji ke log audit sistem.
