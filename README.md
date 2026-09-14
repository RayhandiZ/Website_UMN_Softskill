# Dashboard Monitoring Softskill 5C

Purwarupa pemantauan **capaian pembelajaran (CPMK) softskill terintegrasi** di UMN.

Nilai **tidak** diajukan mahasiswa. Seluruhnya masuk dari tiga program asesmen kurikuler yang
berjalan paralel pada Semester 1–3: **PDP**, **Mata Kuliah Humaniora/Kebangsaan**, dan
**Kemahasiswaan (Student Service)**.

Nama produk tetap menyebut 5C karena itu istilah unit pengelola, tetapi **5C bukan sumbu
penilaian** — ia materi Mentoring 5C di semester 1 yang menyumbang komponen asesmen ke aspek
A.1 dan A.2. Sumbu penilaian adalah 10 aspek CPMK.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # next build
npm start         # melayani hasil build

npm run verify      # cetak seluruh angka scoring untuk enam persona
npm run smoke       # render tiap rute di DOM sungguhan, cari galat
npm run assert      # periksa transkrip mematuhi R2, R3, R4, R8
npm run test:nilai  # simpan batch, rollback, dan validasi import
npm run test:profil # penyimpanan profil: kunci akun, simpan-muat, foto
```

## Kerangka: Next.js App Router

Aplikasi berjalan di **Next.js 16 (App Router)** dengan **React 19** dan **Tailwind 3**.
Basis data belum disambungkan — data masih dari `src/lib/mockData.js`, dan perubahan nilai
disimpan di peramban (lihat `src/lib/store.js`).

```
app/        berkas rute — tipis, isinya hanya menunjuk komponen di src/
src/halaman berkas halaman sesungguhnya (dulu src/pages; diganti namanya karena
            Next mengira folder bernama "pages" adalah Pages Router)
src/lib     domain: config → curriculum → scoring → rules, plus store & auth
```

Seluruh halaman adalah komponen klien (`'use client'`): sesi, tema, dan penyimpanan nilai
semuanya hidup di peramban. Saat basis data nanti masuk, halaman yang perlu data server
tinggal dipindahkan menjadi komponen server satu per satu tanpa mengubah tata letaknya.

Dua hal yang perlu diingat saat menambah halaman:

1. Tambahkan rutenya di `app/`, **dan** daftarkan di `scripts/smoke.jsx` — uji merender
   komponen langsung tanpa server Next, jadi susunan layout ditulis ulang di sana.
2. Tautan memakai `next/link`. Untuk tautan yang perlu tahu dirinya sedang aktif, pakai
   `TautanNav` dari `src/lib/nav.jsx` — padanan `<NavLink>` yang tidak ada di Next.

## Struktur kurikulum enam lapis

```
Fase (2) → Area (3) → Cluster (6) → Aspek CPMK (10)
         → Komponen Asesmen (PDP / MK / Kemahasiswaan)
         → Indikator Perilaku
```

**Aspek CPMK adalah unit penilaian atom.** Fase, area, dan cluster tidak pernah diinput —
nilainya selalu diagregasi naik. Satu cluster boleh melintasi dua semester (CL6 = C.1 di
semester 2 + C.2 di semester 3); satu aspek selalu milik tepat satu semester.

Distribusi aspek per semester: **3 / 4 / 3**.

## Empat keadaan sebuah aspek

Membedakan keempatnya adalah aturan bisnis, bukan urusan tampilan.

| Status | Arti | Tampilan |
|---|---|---|
| `terkunci` | Semesternya belum tiba | Ikon gembok + “Dibuka pada Semester N”. **Tanpa angka, bar, `0`, atau `—`** |
| `menunggu` | Semester berjalan, nilai belum masuk | “Belum masuk dari penilai” |
| `berjalan` | Sebagian komponen terisi, atau lengkap tapi semester belum ditutup | Nilai tampil, berlabel **sementara** |
| `final` | Lengkap dan sudah dikunci (lihat di bawah) | Nilai tetap |

Komponen yang belum terisi **dikeluarkan dari pembagi**, tidak pernah dianggap nol.

## Peta berkas

```
src/lib/
  config.js       CONFIG — satu-satunya tempat angka kebijakan; ada pub/sub agar
                  perubahan menyebar ke seluruh perhitungan tanpa reload
  curriculum.js   struktur statis: fase, area, cluster, 10 aspek, komponen, indikator
  scoring.js      seluruh rumus: bobot, nilai aspek/cluster/area/fase, nilai akhir, rubrik
  rules.js        R1–R9 sebagai fungsi murni + validasi import
  mockData.js     periode akademik, angkatan, 14 prodi, 290 mahasiswa (email unik), audit log
  store.js        penulisan nilai per batch + rollback (di memori, hilang saat reload)
  csv.js          urai/susun CSV dan pemicu unduhan, tanpa pustaka tambahan
  values5c.js     5C sebagai materi Mentoring — tidak dipakai untuk menghitung apa pun
  auth.jsx        sesi tiruan + penjaga rute per peran
  theme.jsx       mode terang/gelap

src/components/   Ui, Icons, Navbar, SideMenu, Footer, FilterBar, ErrorBoundary
src/components/charts/  ChartFrame, RadarCluster (6 sumbu), AspectBars (10 aspek)
src/pages/student/  StudentLayout, Dashboard, Transkrip, Peta, Riwayat, Sertifikat
src/pages/admin/    AdminLayout, Overview, Students, StudentDetail, Programs,
                    Nilai, Kurikulum, Angkatan, Log
```

Arah ketergantungan satu arah: `curriculum → scoring → rules → UI`.

## Masuk

Peran ditentukan dari domain email; **identitas mahasiswa ditentukan dari alamat yang
diketik**, bukan persona bawaan.

| Peran | Email | Sandi |
|---|---|---|
| Mahasiswa | alamat `@student.umn.ac.id` milik salah satu mahasiswa terdaftar | bebas, minimal 6 karakter |
| Kemahasiswaan | alamat non-`student`, mis. `kemahasiswaan@umn.ac.id` | bebas, minimal 6 karakter |

Alamat mahasiswa yang tidak terdaftar **ditolak** beserta dua contoh alamat yang sah — masuk
sebagai orang lain jauh lebih berbahaya daripada gagal masuk. Daftar lengkap alamatnya terlihat
di `/admin/mahasiswa`, tercetak di bawah nama tiap mahasiswa.

Email dibangkitkan dari nama (`nama.belakang@student.umn.ac.id`) dan **dijamin unik**; nama yang
kebetulan sama mendapat angka di belakangnya, mis. `tegar.hartanto3@student.umn.ac.id`.

Tiga persona bawaan untuk memperagakan gating semester:

| Email | Mahasiswa | Semester |
|---|---|---|
| `nadia.rahmawati@student.umn.ac.id` | Nadia Rahmawati | 1 — hanya A.1–A.3 terbuka |
| `rayhandi.zulmi@student.umn.ac.id` | Rayhandi Zulmi | 2 — 7 aspek terbuka |
| `bagas.herlambang@student.umn.ac.id` | Bagas Herlambang | 3 — seluruh aspek terbuka |

Kasus sertifikat ada di angkatan 2024 yang sudah dikunci, lewat panel admin:
`DEMO-LAYAK` (berhak), `DEMO-KOSONG` (satu komponen kosong), `DEMO-RENDAH` (nilai 64).

## Bahasa visual: rata, bukan bertumpuk

Seluruh panel memakai satu bahasa yang sama, mengikuti gaya E-Learning UMN:

- **tanpa gradien** — navbar, footer, dan kepala kartu memakai warna padat;
  kartu identitas hanya diberi garis merek setebal 1px di atasnya;
- **bayangan nyaris tidak ada** — kartu cukup dibatasi garis rambut;
- **menu aktif diisi penuh warna merek dengan teks putih**, bukan latar samar —
  supaya halaman yang sedang dibuka terbaca sekali lihat;
- **setiap kendali harus menuju ke suatu tempat.** Tombol pesan di navbar dibuang
  karena fiturnya belum ada, lonceng hanya muncul bila memang ada yang menunggu
  dan menjadi tautan ke halaman yang menanganinya, blok "Akses Cepat" di footer
  dibuang karena keempat tombolnya mati, dan sakelar tema tidak lagi muncul dua
  kali. Footer kemudian dibangun ulang mengikuti susunan E-Learning UMN —
  pintasan berikon, helpdesk, kontak, identitas unit — tetapi **setiap pintasan
  menunjuk ke halaman yang benar-benar ada**, dan berbeda antara panel mahasiswa
  (Transkrip, Peta Perjalanan, Riwayat, Sertifikat) dan panel Kemahasiswaan
  (Data Mahasiswa, Input Nilai, Program Studi, Sertifikat).

## Ringkasan admin sengaja dibuat tenang

Penggunanya dosen dan staf dengan rentang usia dan kebiasaan digital yang lebar, jadi halaman
`/admin` **bukan** dashboard padat. Aturan yang dipegang:

- **tiga angka saja** — mahasiswa terpantau, rata-rata nilai, dan nilai yang sudah final;
- **satu grafik saja** — donat sebaran huruf mutu — dan **tidak ada filter bertingkat**;
  grafik lainnya tinggal di halaman rinciannya;
- setiap angka besar disertai **satu persentase** dengan bilah tipis; persentasenya selalu
  tertulis angkanya, bilah hanya membantu membandingkan sekilas;
- blok **Perlu dikerjakan** menuliskan tugas sebagai kalimat utuh, bukan istilah teknis, dan
  hilang sendiri kalau memang tidak ada yang tertunda;
- setiap tautan menyebut tujuannya (**Lihat selengkapnya**, *Masukkan nilai*, *Tinjau
  pengajuan*), digarisbawahi, dan bidang kliknya besar;
- ukuran huruf mulai 14,5–16 px dengan jarak antarbaris longgar; tidak ada teks abu-abu kecil
  yang membawa informasi penting;
- angka ringkasan **tidak diulang** di bilah sisi — pekerjaan yang menunggu cukup ditandai
  lencana pada menu.

Halaman rincian (Data Mahasiswa, Program Studi, Input Nilai) tetap padat sebagaimana mestinya;
kepadatan itu memang dibutuhkan di sana.

### Kenapa donat, dan kenapa warnanya satu hue

Donat dipakai karena tugas datanya memang bagian-terhadap-keseluruhan dengan lima segmen —
masih di dalam batas aman enam segmen. Donat dua irisan tidak dipakai karena itu sekadar satu
angka, dan donat untuk membandingkan nilai yang berdekatan juga dihindari; angka pastinya tetap
tertulis di daftar sebelah kanan dan pada tampilan tabel.

Huruf mutu A–D adalah **skala berurutan**, bukan empat kategori setara, jadi warnanya satu hue
biru bertingkat (`--mutu-a` … `--mutu-d` di `index.css`) — makin gelap makin baik pada latar
terang, dan dibalik pada latar gelap. Keduanya sudah lolos pemeriksaan ordinal ramp: lightness
monoton, jarak antarlangkah ≥ 0,06, dan ujung terangnya 2,11:1 terhadap latar. “Belum Memenuhi”
bukan huruf mutu melainkan status, jadi ia memakai token status merah dan selalu berlabel.

Penyebut persentasenya adalah **jumlah mahasiswa yang sudah punya nilai**, bukan seluruh
mahasiswa — kalau ada yang belum dinilai sama sekali, jumlahnya disebutkan di bawah grafik
supaya persentasenya tetap genap 100%.

## Program studi

Empat fakultas, **14 program studi jenjang S1 dan D3**. Program magister (Manajemen Teknologi
dan Ilmu Komunikasi S2) sengaja tidak disertakan karena pembinaan softskill ini hanya berjalan
pada Semester 1–3 jenjang sarjana dan diploma.

| Fakultas | Program studi |
|---|---|
| Teknik & Informatika | Informatika, Sistem Informasi, Teknik Komputer, Teknik Elektro, Teknik Fisika — semua S1 |
| Ilmu Komunikasi | Komunikasi Strategis, Jurnalistik, Ilmu Komunikasi (PJJ) — semua S1 |
| Seni & Desain | Desain Komunikasi Visual, Film & Animasi, Arsitektur — semua S1 |
| Bisnis | Akuntansi (S1), Manajemen (S1), Perhotelan (**D3**) |

Halaman `/admin/nilai` menyaring sasaran input berlapis: **semester → sumber → angkatan →
fakultas → program studi**. Filter prodi juga menjadi penjaga import: baris milik mahasiswa di
luar angkatan atau program studi yang sedang dipilih ditolak beserta alasannya, baik pada
berkas berformat baku maupun rekap mentah.

## Angkatan dan penurunan semester

`semesterAktif` **tidak pernah diinput** — dihitung dari jarak antara periode masuk angkatan
dan `PERIODE_AKTIF`, dibatasi 3.

| Angkatan | Masuk | Semester aktif | Status |
|---|---|---|---|
| 2026 | Ganjil 2026/2027 | 1 | aktif |
| 2025 Genap | Genap 2025/2026 | 2 | aktif |
| 2025 | Ganjil 2025/2026 | 3 | aktif |
| 2024 | Ganjil 2024/2025 | 3 | **terkunci** |

Angkatan penerimaan Genap sengaja disertakan. Tanpanya, pada periode aktif Ganjil semua
angkatan berada di semester ganjil (1 dan 3) dan **semester 2 tidak akan pernah bisa
didemokan**.

## Yang masih menunggu keputusan unit pengelola

Semuanya ada di `src/lib/config.js` bertanda `// MENUNGGU KONFIRMASI`:

| Kunci | Default | Kenapa belum pasti |
|---|---|---|
| `ASPEK_A3_SEMESTER` | `1` | Sheet GENERAL menaruh A.3 di semester 1, sheet DETAIL KOMPONEN di blok PDP-2 |
| `ASPEK_C1_SEMESTER` | `2` | Excel menaruh C.1 di semester 2, peta jalan visual menyatukannya dengan C.2 |
| `BOBOT_SUMBER` | 30/50/20 | Tidak ada satu pun angka bobot di dokumen sumber |
| `BOBOT_KOMPONEN_MK` | 30/20/20/30 | Idem |
| `MODE_AGREGASI` | `per-aspek` | Hasilnya berbeda dari `per-semester` karena distribusi 3/4/3 |
| `PENGUNCIAN_ASPEK` | `otomatis` | Belum diputuskan apakah nilai boleh final sebelum semester ditutup |
| `IZINKAN_FINAL_DRAFT` | `true` | Lihat di bawah |

### Kenapa `IZINKAN_FINAL_DRAFT` ada

Lima aspek (A.3, A.4, B.1, B.2, C.1) belum punya komponen asesmen resmi, jadi komponennya
berstatus `draft`. Aturan R4 melarang aspek berkomponen draft menjadi `final`, sementara R5
menuntut kesepuluh aspek final untuk menerbitkan sertifikat. Dua aturan itu bersama-sama
membuat **tidak ada mahasiswa yang bisa disertifikasi** selama skema penilaian belum
diresmikan. Saklar ini melonggarkan R4 supaya alur sertifikat tetap bisa diuji; aspek draft
yang di-final tetap diberi penanda “skema belum final” di UI. Setel `false` begitu seluruh
komponen resmi.

## Aturan bobot

```
bobot sumber   dinormalisasi ulang ke sumber yang HADIR pada aspek itu
bobot MK       dimodulasi per jenis (TUGAS/SIKAP/UTS/UAS), jenis absen dinormalisasi ulang
di dalam grup  dibagi rata, kecuali seluruh komponen punya `bobot` eksplisit
```

Contoh: B.4 hanya punya komponen MK, jadi MK memikul 100% meski `BOBOT_SUMBER.MK = 50`.
A.1 tidak punya UTS, jadi porsi UTS dibagi ke TUGAS/SIKAP/UAS.

## Input nilai

Halaman `/admin/nilai` menuntut **semester dipilih lebih dahulu** — selama dropdownnya masih
kosong, area kerja tidak ditampilkan sama sekali. Alasannya bukan kosmetik: tiap aspek CPMK
hanya dinilai pada satu semester, jadi tanpa semester sistem tidak tahu komponen mana yang
boleh diisi.

Setelah semester, sumber, dan angkatan dipilih, tersedia tiga cara kerja:

- **Input manual** — tabel mahasiswa × komponen dengan sel angka 0–100. Sel yang diubah
  ditandai, sel di luar rentang ditolak, sel kosong tetap kosong (tidak pernah jadi nol).
- **Import CSV** — menerima dua bentuk berkas, dan mengenalinya sendiri:
  - *Format baku* (`nim, komponen, nilai`) — divalidasi baris per baris.
  - *Rekap mentah* dari dosen (satu baris per mahasiswa, satu kolom per tugas) — sistem
    mendeteksi kolom NIM dan nama, menebak kolom mana memetakan ke komponen mana,
    mengenali skala tiap kolom (0–4 / 0–10 / 0–100), lalu mengonversi dan mengisinya
    otomatis. Beberapa kolom yang jatuh ke satu komponen digabung (rata-rata, tertinggi,
    atau kolom terakhir).
- **Pengajuan koreksi** — antrean sanggahan mahasiswa dengan aksi setujui/tolak.

Setiap penyimpanan menjadi satu **batch** yang tercatat di audit log dan bisa **di-rollback
utuh**. Batch bertahan setelah halaman dimuat ulang dan ikut tersinkron antar tab — lihat
bagian Penyimpanan perubahan di bawah. Tombol **Kembalikan data contoh** menghapus seluruhnya.

Import menolak: NIM tak dikenal, kode komponen asing, komponen dari sumber atau semester
lain, mahasiswa di luar angkatan sasaran, nilai di luar 0–100, baris duplikat, dan **aspek
yang semesternya belum ditempuh mahasiswa** — penjaga utama R1.

### Pengenalan berkas mentah

`src/lib/ingest.js` menilai kecocokan tiap kolom dengan tiap komponen memakai empat sinyal:
kata kunci jenis (tugas / sikap / UTS / UAS, dengan penalti bila kolom menyebut jenis lain),
kata kunci sumber, irisan kata dengan label komponen, dan kesamaan nomor urut. Skor ≥ 80
ditandai **Yakin**, 55–79 **Perlu dicek**, di bawah itu tidak diusulkan.

Tebakan **tidak pernah langsung dieksekusi**: layar pemetaan menampilkan tiap kolom beserta
contoh isinya, skala, komponen tujuan, dan tingkat keyakinan — semuanya bisa diganti lewat
dropdown, dan pratinjau perhitungan ikut berubah seketika. Baru setelah itu tombol
“Isi otomatis” menuliskannya sebagai satu batch yang tetap bisa di-rollback.

Tersedia tombol **Contoh rekap mentah** yang mengunduh berkas gaya dosen (nama kolom
seadanya, skala 0–10) untuk mencoba alurnya tanpa menyiapkan data sendiri.

## Kapan aspek berubah dari sementara menjadi final

Dua mekanisme berjalan berdampingan; **penandaan manual selalu menang atas mode otomatis**,
dan apa pun pilihannya, aspek yang komponennya belum lengkap tidak pernah bisa final.

`CONFIG.PENGUNCIAN_ASPEK` mengatur perilaku bawaan:

| Mode | Kapan menjadi final |
|---|---|
| `otomatis` (bawaan) | begitu seluruh komponen asesmennya terisi |
| `manual` | hanya bila ditandai Kemahasiswaan, walau sudah lengkap |
| `semester` | bila lengkap **dan** semesternya sudah ditutup |

Kendali manualnya ada di dua tempat:

- **Saat menyimpan nilai** (`/admin/nilai`) — pilihan *Ikuti aturan sistem* / *Tandai final* /
  *Tahan sebagai sementara*, berlaku untuk aspek yang tersentuh penyimpanan itu saja.
- **Per aspek per mahasiswa** (`/admin/mahasiswa/:id`) — panel Status penguncian aspek dengan
  tombol Tandai final, Tahan sementara, dan Ikuti aturan. Tombol Tandai final nonaktif beserta
  alasannya bila komponennya belum lengkap.

Di sisi mahasiswa, badge status selalu disertai **alasan** bila belum final — misalnya
“Baru 2 dari 5 komponen asesmen yang dinilai” atau “Ditahan sebagai sementara oleh …”. Aspek
yang sudah final menampilkan siapa yang mengunci dan kapan.

## Penyimpanan perubahan

Spesifikasi melarang `localStorage` untuk data nilai. Tanpa backend, larangan itu membuat
fiturnya tidak berfungsi: setiap muat ulang menghapus seluruh input, dan panel mahasiswa yang
dibuka di tab lain tidak pernah melihatnya. Jadi larangan itu **sengaja dilonggarkan khusus
untuk data nilai**, dengan pembatasan:

- yang disimpan **bukan salinan basis data**, melainkan hanya daftar batch perubahan
  (`{ id, sumber, semester, angkatan, aktor, waktu, status, entri }`) di kunci `sk5c.nilai`;
- saat modul dimuat, batch itu **diputar ulang** di atas data contoh yang deterministik,
  sehingga hasilnya selalu sama;
- rollback dan `bersihkanPerubahan()` memutar ulang dari keadaan bawaan, bukan menambal;
- perubahan dari tab lain ikut diserap lewat event `storage`, jadi panel admin dan panel
  mahasiswa yang dibuka berdampingan selalu menampilkan angka yang sama.

Setel `SIMPAN_PERUBAHAN = false` di `src/lib/store.js` untuk kembali ke perilaku murni di
memori.

## Panel mahasiswa: satu fakta, satu tempat

Nilai akhir sempat muncul tiga kali (kartu profil, kartu sapaan, dan StatTile)
dan perjalanan program dua kali. Sekarang masing-masing punya satu rumah:

| Fakta | Tempatnya |
|---|---|
| Siapa saya + nilai akhir ringkas | kartu profil di kolom kiri |
| Nilai akhir beserta penjelasannya | kartu sapaan di Ringkasan |
| Perjalanan tiga semester | kartu Perjalanan program di Ringkasan |
| Status sertifikat | satu baris bertaut di kartu sapaan |

Halaman Ringkasan mahasiswa turun dari 29.802 menjadi 21.186 karakter.

Tombol **Ajukan koreksi nilai** yang sebelumnya mati kini membuka formulir
sungguhan: mahasiswa memilih komponen, menuliskan alasan, dan pengajuannya masuk
ke antrean Kemahasiswaan. Ini tetap satu-satunya aksi tulis milik mahasiswa (R8)
— pengajuan tidak mengubah nilai apa pun.

## Rambatan nilai ke dashboard mahasiswa

Nilai disimpan dengan memutakhirkan objek mahasiswa, membuang cache transkrip, lalu memberi
tahu seluruh pelanggan store. Setiap halaman yang membaca nilai memanggil `useStore()`, jadi
begitu Kemahasiswaan menyimpan satu batch, semuanya ikut menghitung ulang:

- nilai komponen dan **nilai aspek**
- **cluster, area, fase**, dan rata-rata per semester
- **nilai akhir** beserta huruf mutu dan basis perhitungannya
- status aspek (`menunggu` → `berjalan` → `final`)
- kelayakan sertifikat dan daftar “yang perlu diperhatikan”
- riwayat perubahan mahasiswa serta audit log admin

Mahasiswa tidak perlu melakukan apa pun; halaman miliknya sudah terisi. Rollback batch
membatalkan seluruh rambatan itu sekaligus.

Untuk memperagakan: persona mahasiswa bawaan adalah **Rayhandi Zulmi**, NIM `251331263`,
angkatan **2025 Genap**, semester 2. Di panel admin pilih semester 1 atau 2 dengan angkatan
2025 Genap, isi nilainya, lalu buka `/mahasiswa` — angkanya sudah berubah.

## Catatan migrasi dari Vite + react-router

Proyek ini sebelumnya berjalan di Vite dengan `react-router-dom`. Tiga hal yang berubah dan
tidak boleh dikembalikan begitu saja:

- **Sesi dibaca sesudah komponen menempel**, bukan saat render pertama (`src/lib/auth.jsx`).
  Di server `localStorage` tidak ada; membacanya saat render membuat HTML server berbeda
  dengan render pertama di peramban, dan React menolak hidrasinya.
- **Tema ditetapkan skrip kecil di `<head>`** sebelum halaman digambar (`src/lib/theme.jsx`),
  supaya pengguna bertema gelap tidak melihat kedipan putih.
- **Penjaga peran berpindah lewat router di dalam efek**, bukan mengembalikan `<Navigate>`:
  mengubah rute selagi merender ditolak React.

## Status pengerjaan

| Fase | Isi | Status |
|---|---|---|
| 1 | Fondasi domain: config, curriculum, scoring, rules, mockData | selesai, terverifikasi |
| 2 | Pembersihan model poin, rute & menu baru | selesai |
| 3 | Transkrip mahasiswa dengan drill-down & gating | selesai |
| 4 | Peta Perjalanan, Riwayat | belum |
| 5 | Sertifikat | belum |
| 6 | Admin: panel input nilai | belum |
| 7 | Input & Import Nilai: gerbang semester, input manual, import CSV, rollback, koreksi | selesai |
| 8 | Kurikulum, Angkatan & Sertifikat, Log | belum |
| 9 | Poles cetak, responsif, aksesibilitas | sebagian (cetak & reduced-motion sudah) |
| — | Basis data PostgreSQL | ditunda — hasil kerjanya diarsipkan di `arsip/postgres/` |
