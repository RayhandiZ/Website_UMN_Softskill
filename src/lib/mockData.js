import { CONFIG, subscribeConfig } from './config.js'
import { getAspekList, getKomponen } from './curriculum.js'
import { hitungTranskrip, hurufMutu } from './scoring.js'

/* --------------------------------------------------------------------------
   Data contoh tahap purwarupa. Deterministik lewat PRNG berseed supaya angka
   pada panel kemahasiswaan tidak berubah tiap reload.

   Nilai TIDAK diajukan mahasiswa. Seluruhnya masuk dari tiga sumber asesmen
   kurikuler (PDP, MK Humaniora, Kemahasiswaan) lewat batch import.
   -------------------------------------------------------------------------- */

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260901)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (lo, hi) => Math.round(lo + rand() * (hi - lo))
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

/* ------------------------------ periode akademik -------------------------- */

export const PERIODE_AKTIF = { tahun: '2026/2027', semester: 'Ganjil' }

const tahunAwal = (t) => Number(String(t).slice(0, 4))
const ordinal = (p) => tahunAwal(p.tahun) * 2 + (p.semester === 'Ganjil' ? 0 : 1)

function periodeSetelah(p, n) {
  const o = ordinal(p) + n
  const th = Math.floor(o / 2)
  const ganjil = o % 2 === 0
  return { tahun: th + '/' + (th + 1), semester: ganjil ? 'Ganjil' : 'Genap' }
}

export const labelPeriode = (p) => p.semester + ' ' + p.tahun

/**
 * semesterAktif TIDAK PERNAH diinput — selalu diturunkan dari jarak antara
 * periode masuk angkatan dan periode aktif, dibatasi panjang program.
 */
export function turunkanSemesterAktif(intake, aktif = PERIODE_AKTIF) {
  const jarak = ordinal(aktif) - ordinal(intake) + 1
  return Math.max(1, Math.min(CONFIG.TOTAL_SEMESTER_PROGRAM, jarak))
}

/* --------------------------------- angkatan ------------------------------- */

/* Penerimaan Genap sengaja disertakan. Tanpanya, pada periode aktif Ganjil
   seluruh angkatan hanya berada di semester ganjil (1 dan 3) dan semester 2
   tidak akan pernah bisa didemokan. */

const ANGKATAN_DASAR = [
  { id: '2026', angkatan: 2026, label: '2026', intake: { tahun: '2026/2027', semester: 'Ganjil' }, status: 'aktif' },
  { id: '2025B', angkatan: 2025, label: '2025 Genap', intake: { tahun: '2025/2026', semester: 'Genap' }, status: 'aktif' },
  { id: '2025', angkatan: 2025, label: '2025', intake: { tahun: '2025/2026', semester: 'Ganjil' }, status: 'aktif' },
  { id: '2024', angkatan: 2024, label: '2024', intake: { tahun: '2024/2025', semester: 'Ganjil' }, status: 'terkunci' },
]

export const COHORTS = ANGKATAN_DASAR.map((a) => ({
  ...a,
  semesterAktif: turunkanSemesterAktif(a.intake),
  periode: [0, 1, 2].map((n) => periodeSetelah(a.intake, n)),
}))

export const getAngkatan = (id) => COHORTS.find((c) => c.id === id) ?? null

/* ------------------------------ fakultas & prodi -------------------------- */

/* Program studi UMN jenjang S1 dan D3. Program magister (Manajemen Teknologi
   dan Ilmu Komunikasi S2) sengaja tidak disertakan karena pembinaan softskill
   ini hanya berjalan pada Semester 1–3 jenjang sarjana dan diploma. */

export const FACULTIES = [
  {
    name: 'Teknik & Informatika',
    programs: [
      { nama: 'Informatika', jenjang: 'S1' },
      { nama: 'Sistem Informasi', jenjang: 'S1' },
      { nama: 'Teknik Komputer', jenjang: 'S1' },
      { nama: 'Teknik Elektro', jenjang: 'S1' },
      { nama: 'Teknik Fisika', jenjang: 'S1' },
    ],
  },
  {
    name: 'Ilmu Komunikasi',
    programs: [
      { nama: 'Komunikasi Strategis', jenjang: 'S1' },
      { nama: 'Jurnalistik', jenjang: 'S1' },
      { nama: 'Ilmu Komunikasi (PJJ)', jenjang: 'S1' },
    ],
  },
  {
    name: 'Seni & Desain',
    programs: [
      { nama: 'Desain Komunikasi Visual', jenjang: 'S1' },
      { nama: 'Film & Animasi', jenjang: 'S1' },
      { nama: 'Arsitektur', jenjang: 'S1' },
    ],
  },
  {
    name: 'Bisnis',
    programs: [
      { nama: 'Akuntansi', jenjang: 'S1' },
      { nama: 'Manajemen', jenjang: 'S1' },
      { nama: 'Perhotelan', jenjang: 'D3' },
    ],
  },
]

export const PROGRAMS = FACULTIES.flatMap((f) =>
  f.programs.map((p) => ({ program: p.nama, jenjang: p.jenjang, faculty: f.name })),
)

export const FACULTY_OF = Object.fromEntries(PROGRAMS.map((p) => [p.program, p.faculty]))
export const JENJANG_OF = Object.fromEntries(PROGRAMS.map((p) => [p.program, p.jenjang]))

/* Satu program studi hanya milik satu fakultas, jadi fakultasnya bisa
   disimpulkan dari prodinya — tidak perlu dipilih dua kali. */
export const FAKULTAS_OF = Object.fromEntries(PROGRAMS.map((p) => [p.program, p.faculty]))

/** Nama program studi pada sebuah fakultas — 'Semua' berarti seluruh fakultas. */
export function programStudi(faculty = 'Semua') {
  return (faculty === 'Semua' ? PROGRAMS : PROGRAMS.filter((p) => p.faculty === faculty)).map((p) => p.program)
}

/* --------------------------------- penilai -------------------------------- */

const PENILAI = {
  PDP: ['Tim PDP: Yohanes Adi, M.Psi.', 'Tim PDP: Ratna Widyastuti, M.Pd.', 'Tim PDP: Bagas Aryo, M.Psi.'],
  MK: [
    'Suryasari, S.Kom., M.MSI.',
    'Adhi Kusnadi, S.T., M.Si.',
    'Fransisca Puspitasari, M.Hum.',
    'Yustinus Prasetya, M.Th.',
    'Nurul Hidayah, M.Pd.',
  ],
  ENGAGEMENT: ['Student Service: Andini Prameswari, M.Psi.', 'Student Service: Rizky Maulana, S.Psi.'],
}

/* ----------------------------------- nama --------------------------------- */

const FIRST = [
  'Rayhandi', 'Aurel', 'Bimo', 'Cindy', 'Dimas', 'Elena', 'Farrel', 'Gita', 'Hafiz', 'Intan',
  'Joshua', 'Kirana', 'Lukas', 'Maura', 'Naufal', 'Olivia', 'Panji', 'Queenie', 'Raka', 'Sarah',
  'Tegar', 'Utari', 'Vicky', 'Winona', 'Yudha', 'Zahra', 'Arman', 'Bella', 'Candra', 'Diandra',
]
const LAST = [
  'Zulmi', 'Pratama', 'Wijaya', 'Nugroho', 'Halim', 'Santoso', 'Kusuma', 'Anggraini', 'Siregar',
  'Situmorang', 'Hartanto', 'Maheswari', 'Ramadhan', 'Setiawan', 'Gunawan', 'Lesmana', 'Putri', 'Tanuwijaya',
]
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '')

/* Email dipakai sebagai identitas saat masuk, jadi harus unik. Nama yang
   kebetulan sama diberi angka di belakangnya, seperti praktik kampus pada
   umumnya. Alamat persona demo dipesan lebih dulu agar tetap bersih. */
const emailTerpakai = new Set()

function buatEmail(depan, belakang, paksa = null) {
  if (paksa) {
    emailTerpakai.add(paksa)
    return paksa
  }
  const dasar = slug(depan) + '.' + slug(belakang)
  let alamat = dasar + '@student.umn.ac.id'
  let n = 1
  while (emailTerpakai.has(alamat)) {
    n++
    alamat = dasar + n + '@student.umn.ac.id'
  }
  emailTerpakai.add(alamat)
  return alamat
}

/* ------------------------------ pembangkit nilai -------------------------- */

/* Sebaran realistis: mayoritas B, sebagian C, sedikit A dan D. */
function basisNilai() {
  const r = rand()
  if (r < 0.1) return 91
  if (r < 0.55) return 84
  if (r < 0.85) return 75
  return 66
}

const tanggalDi = (periode, urut) => {
  const th = tahunAwal(periode.tahun) + (periode.semester === 'Ganjil' ? 0 : 1)
  const bulan = periode.semester === 'Ganjil' ? ['09', '10', '11', '12'] : ['02', '03', '04', '06']
  return th + '-' + bulan[urut % bulan.length] + '-' + String(between(3, 27)).padStart(2, '0')
}

function isiKomponen(aspekId, basis, periode, batchId, lewati = new Set()) {
  const komponen = {}
  getKomponen(aspekId).forEach((x, i) => {
    if (lewati.has(x.id)) return
    komponen[x.id] = {
      nilai: clamp(basis + between(-6, 6)),
      penilai: pick(PENILAI[x.sumber]),
      tanggal: tanggalDi(periode, i),
      batchId,
    }
  })
  return komponen
}

/**
 * Membangun peta nilai seorang mahasiswa.
 * Aspek yang semesternya belum tiba TIDAK diberi key sama sekali — bukan
 * diberi objek kosong — supaya tidak ada yang bisa salah membacanya sebagai nol.
 */
function bangunNilai(angkatan, semesterAktif, basis, opsi = {}) {
  const nilai = {}
  for (const aspek of getAspekList()) {
    if (aspek.semester > semesterAktif) continue

    const periode = angkatan.periode[aspek.semester - 1]
    const batchId = 'B-' + angkatan.id + '-S' + aspek.semester
    const lampau = aspek.semester < semesterAktif
    const terkunci = angkatan.status === 'terkunci'

    if (lampau || terkunci || opsi.lengkap) {
      const lewati = opsi.kosongkan?.[aspek.id] ?? new Set()
      nilai[aspek.id] = { komponen: isiKomponen(aspek.id, basis, periode, batchId, lewati) }
      continue
    }

    // Semester yang sedang berjalan: sebagian belum masuk dari dosen.
    // Persona demo dikecualikan dari keadaan "menunggu" supaya setiap aspek yang
    // sudah terbuka benar-benar punya nilai — itu yang diperagakan ke unit pengelola.
    const r = opsi.tanpaMenunggu ? 0.5 : rand()
    if (r < 0.2) {
      nilai[aspek.id] = { komponen: {} } // menunggu
      continue
    }
    const semua = getKomponen(aspek.id)
    const lewati = new Set()
    if (r < 0.75) {
      const buang = between(1, Math.max(1, semua.length - 1))
      for (let i = 0; i < buang; i++) lewati.add(semua[semua.length - 1 - i].id)
    }
    nilai[aspek.id] = { komponen: isiKomponen(aspek.id, basis, periode, batchId, lewati) }
  }
  return nilai
}

/* -------------------------------- mahasiswa ------------------------------- */

let seq = 0

function buatMahasiswa({ program, faculty, jenjang, angkatan, nama, id, basis, opsi, email }) {
  seq++
  const [depan, belakang] = nama ? nama.split(' ') : [pick(FIRST), pick(LAST)]
  const b = basis ?? basisNilai()
  const nim =
    String(angkatan.angkatan).slice(2) + String(110 + (seq % 60)) + String(1000 + seq).slice(-4)

  return {
    id: id ?? 'S' + String(seq).padStart(11, '0'),
    nim,
    name: depan + ' ' + belakang,
    email: buatEmail(depan, belakang, email),
    program,
    faculty,
    jenjang: jenjang ?? JENJANG_OF[program] ?? 'S1',
    angkatan: angkatan.angkatan,
    angkatanId: angkatan.id,
    angkatanLabel: angkatan.label,
    semesterAktif: angkatan.semesterAktif,
    statusAngkatan: angkatan.status,
    periode: angkatan.periode,
    nilai: bangunNilai(angkatan, angkatan.semesterAktif, b, opsi ?? {}),
    // Penandaan final/sementara per aspek oleh Kemahasiswaan. Kosong berarti
    // status aspek mengikuti CONFIG.PENGUNCIAN_ASPEK.
    penguncian: {},
  }
}

function bangunSemua() {
  const daftar = []
  for (const { program, faculty, jenjang } of PROGRAMS) {
    for (const angkatan of COHORTS) {
      const n = between(4, 6)
      for (let i = 0; i < n; i++) daftar.push(buatMahasiswa({ program, faculty, jenjang, angkatan }))
    }
  }
  return daftar
}

/* Alamat persona dipesan lebih dulu supaya tidak direbut mahasiswa lain yang
   kebetulan bernama sama, dan tetap tanpa angka di belakangnya. */
const NAMA_PERSONA = [
  'Nadia Rahmawati',
  'Rayhandi Zulmi',
  'Bagas Herlambang',
  'Kirana Wulandari',
  'Farrel Baskoro',
  'Tegar Prasetyo',
]
const EMAIL_PERSONA = Object.fromEntries(
  NAMA_PERSONA.map((n) => {
    const [d, b] = n.split(' ')
    return [n, slug(d) + '.' + slug(b) + '@student.umn.ac.id']
  }),
)
for (const alamat of Object.values(EMAIL_PERSONA)) emailTerpakai.add(alamat)

const UMUM = bangunSemua()

/* ------------------------------ persona demo ------------------------------ */

/* Tiga persona untuk memperagakan gating, plus tiga kasus sertifikat pada
   angkatan yang sudah dikunci. */

const angkatanSem1 = getAngkatan('2026')
const angkatanSem2 = getAngkatan('2025B')
const angkatanSem3 = getAngkatan('2025')
const angkatanKunci = getAngkatan('2024')

const PERSONA = [
  buatMahasiswa({
    id: 'DEMO-1',
    nama: 'Nadia Rahmawati',
    email: EMAIL_PERSONA['Nadia Rahmawati'],
    program: 'Sistem Informasi',
    faculty: 'Teknik & Informatika',
    angkatan: angkatanSem1,
    basis: 82,
    opsi: { tanpaMenunggu: true },
  }),
  buatMahasiswa({
    id: 'DEMO-2',
    nama: 'Rayhandi Zulmi',
    email: EMAIL_PERSONA['Rayhandi Zulmi'],
    program: 'Sistem Informasi',
    faculty: 'Teknik & Informatika',
    angkatan: angkatanSem2,
    basis: 84,
    opsi: { tanpaMenunggu: true },
  }),
  buatMahasiswa({
    id: 'DEMO-3',
    nama: 'Bagas Herlambang',
    email: EMAIL_PERSONA['Bagas Herlambang'],
    program: 'Informatika',
    faculty: 'Teknik & Informatika',
    angkatan: angkatanSem3,
    basis: 81,
    opsi: { tanpaMenunggu: true },
  }),
]

const SERTIFIKAT_DEMO = [
  // Lengkap dan di atas ambang — sertifikat terbit.
  buatMahasiswa({
    id: 'DEMO-LAYAK',
    nama: 'Kirana Wulandari',
    email: EMAIL_PERSONA['Kirana Wulandari'],
    program: 'Manajemen',
    faculty: 'Bisnis',
    angkatan: angkatanKunci,
    basis: 86,
    opsi: { lengkap: true },
  }),
  // Satu komponen sengaja dikosongkan — sertifikat harus menyebut namanya.
  buatMahasiswa({
    id: 'DEMO-KOSONG',
    nama: 'Farrel Baskoro',
    email: EMAIL_PERSONA['Farrel Baskoro'],
    program: 'Komunikasi Strategis',
    faculty: 'Ilmu Komunikasi',
    angkatan: angkatanKunci,
    basis: 83,
    opsi: { lengkap: true, kosongkan: { B4: new Set(['B4-MK-UAS']) } },
  }),
  // Lengkap tetapi nilai akhir di bawah ambang.
  buatMahasiswa({
    id: 'DEMO-RENDAH',
    nama: 'Tegar Prasetyo',
    email: EMAIL_PERSONA['Tegar Prasetyo'],
    program: 'Teknik Komputer',
    faculty: 'Teknik & Informatika',
    angkatan: angkatanKunci,
    basis: 64,
    opsi: { lengkap: true },
  }),
]

export const STUDENTS = [...PERSONA, ...SERTIFIKAT_DEMO, ...UMUM]

export const getStudent = (id) => STUDENTS.find((s) => s.id === id) ?? null
export const getStudentByNim = (nim) => STUDENTS.find((s) => s.nim === String(nim).trim()) ?? null

/** Mencari mahasiswa dari alamat email kampusnya — identitas saat masuk. */
export const getStudentByEmail = (email) => {
  const cari = String(email ?? '').trim().toLowerCase()
  return STUDENTS.find((s) => s.email.toLowerCase() === cari) ?? null
}

/** Beberapa alamat contoh, dipakai membantu pengguna yang salah ketik. */
export const contohEmailMahasiswa = (n = 3) => PERSONA.slice(0, n).map((s) => s.email)

/* ---------------------------- mahasiswa yang login ------------------------ */

const PERSONA_SEMESTER = { 1: 'DEMO-1', 2: 'DEMO-2', 3: 'DEMO-3' }

/** Persona demo dipilih lewat ?sem=1|2|3 — default semester 2. */
export function personaAktif(search = typeof window !== 'undefined' ? window.location.search : '') {
  const sem = new URLSearchParams(search).get('sem')
  return getStudent(PERSONA_SEMESTER[sem] ?? PERSONA_SEMESTER[2])
}

export const ME = PERSONA[1]

export const PEMBIMBING = 'Suryasari, S.Kom., M.MSI.'

/* ------------------------------- transkrip ------------------------------- */

/* Menghitung 10 aspek untuk 250+ mahasiswa berkali-kali per render itu mahal,
   jadi hasilnya disimpan. Cache dibuang saat konfigurasi berubah karena seluruh
   angka ikut berubah. */

let cache = new Map()
subscribeConfig(() => {
  cache = new Map()
})

/** Dipanggil store.js setiap kali ada nilai yang berubah. */
export function resetTranskripCache() {
  cache = new Map()
}

export function transkripOf(student) {
  if (!student) return null
  const kunci = student.id
  if (!cache.has(kunci)) cache.set(kunci, hitungTranskrip(student))
  return cache.get(kunci)
}

export const nilaiAkhirOf = (student) => transkripOf(student).akhir

/* ------------------------------ riwayat & audit --------------------------- */

const AKTOR = [
  'Andini Prameswari (Kemahasiswaan)',
  'Suryasari, S.Kom., M.MSI.',
  'Tim PDP',
  'Rizky Maulana (Student Service)',
]

export const BATCH_IMPORT = [
  { id: 'B-2025-S1', sumber: 'MK', angkatanId: '2025', periode: 'Ganjil 2025/2026', waktu: '2025-12-18 14:20', aktor: AKTOR[1], baris: 412, ditolak: 6, status: 'diproses' },
  { id: 'B-2025-S2', sumber: 'PDP', angkatanId: '2025', periode: 'Genap 2025/2026', waktu: '2026-06-22 09:41', aktor: AKTOR[2], baris: 388, ditolak: 12, status: 'diproses' },
  { id: 'B-2025B-S1', sumber: 'MK', angkatanId: '2025B', periode: 'Genap 2025/2026', waktu: '2026-06-24 11:05', aktor: AKTOR[1], baris: 196, ditolak: 3, status: 'diproses' },
  { id: 'B-2026-S1', sumber: 'ENGAGEMENT', angkatanId: '2026', periode: 'Ganjil 2026/2027', waktu: '2026-08-28 16:12', aktor: AKTOR[3], baris: 204, ditolak: 0, status: 'diproses' },
  { id: 'B-2024-S3', sumber: 'MK', angkatanId: '2024', periode: 'Ganjil 2025/2026', waktu: '2026-01-14 10:02', aktor: AKTOR[1], baris: 356, ditolak: 4, status: 'dikunci' },
]

function bangunAudit() {
  const log = []
  const contoh = [...PERSONA, ...SERTIFIKAT_DEMO, ...UMUM.slice(0, 24)]
  for (const m of contoh) {
    for (const [aspekId, isi] of Object.entries(m.nilai)) {
      for (const [komponenId, entri] of Object.entries(isi.komponen)) {
        if (rand() > 0.16) continue
        const lama = clamp(entri.nilai + between(-8, -2))
        log.push({
          id: 'L-' + log.length.toString().padStart(4, '0'),
          waktu: entri.tanggal + ' ' + String(between(8, 17)).padStart(2, '0') + ':' + String(between(0, 59)).padStart(2, '0'),
          aktor: entri.penilai,
          nim: m.nim,
          nama: m.name,
          aspek: aspekId,
          komponen: komponenId,
          nilaiLama: lama,
          nilaiBaru: entri.nilai,
          sumber: komponenId.includes('-PDP-') ? 'PDP' : komponenId.includes('-ENG-') ? 'ENGAGEMENT' : 'MK',
          batchId: entri.batchId,
        })
      }
    }
  }
  return log.sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
}

export const AUDIT_LOG = bangunAudit()

export const auditUntuk = (nim) => AUDIT_LOG.filter((l) => l.nim === nim)

export const PENGAJUAN_KOREKSI = [
  {
    id: 'K-3301', nim: ME.nim, nama: ME.name, komponenId: 'A2-MK-SIKAP', komponenLabel: 'Sikap: nilai dosen + peer review 2 aspek',
    aspekId: 'A2', alasan: 'Peer review kelompok saya belum terhitung, hanya nilai dosen yang masuk.',
    nilaiDiharapkan: null, status: 'menunggu', diajukan: '2026-08-26', keputusan: null,
  },
  {
    id: 'K-3298', nim: ME.nim, nama: ME.name, komponenId: 'A1-ENG-HADIR', komponenLabel: 'Mentoring 5C: Kehadiran',
    aspekId: 'A1', alasan: 'Saya hadir pada sesi 4 tetapi tercatat absen; ada foto dokumentasi.',
    nilaiDiharapkan: 90, status: 'disetujui', diajukan: '2026-03-11',
    keputusan: { oleh: AKTOR[0], tanggal: '2026-03-14', catatan: 'Dokumentasi valid, kehadiran diperbaiki.' },
  },
  {
    id: 'K-3290', nim: STUDENTS[6]?.nim ?? '', nama: STUDENTS[6]?.name ?? '', komponenId: 'A1-MK-T1',
    komponenLabel: 'Tugas 1: Nilai Refleksi Proposal SLH', aspekId: 'A1',
    alasan: 'Nilai tugas berbeda dengan yang tertera di kelas.', nilaiDiharapkan: 85,
    status: 'ditolak', diajukan: '2026-02-20',
    keputusan: { oleh: AKTOR[1], tanggal: '2026-02-25', catatan: 'Nilai yang tercatat sudah sesuai berita acara.' },
  },
]

/* ------------------------------ agregasi admin ---------------------------- */

export function filterStudents({ faculty = 'Semua', program = 'Semua', angkatan = 'Semua', semester = 'Semua', query = '' } = {}) {
  const q = query.trim().toLowerCase()
  return STUDENTS.filter(
    (s) =>
      (faculty === 'Semua' || s.faculty === faculty) &&
      (program === 'Semua' || s.program === program) &&
      (angkatan === 'Semua' || s.angkatanId === angkatan) &&
      (semester === 'Semua' || String(s.semesterAktif) === String(semester)) &&
      (!q || s.name.toLowerCase().includes(q) || s.nim.includes(q) || s.program.toLowerCase().includes(q)),
  )
}

const rerataAman = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null)

export function ringkas(rows) {
  const akhir = rows.map((s) => transkripOf(s).akhir)
  const bernilai = akhir.filter((a) => a.nilai != null)
  const huruf = { A: 0, B: 0, C: 0, D: 0, belum: 0 }
  for (const a of bernilai) {
    const h = hurufMutu(a.nilai)
    if (h?.huruf) huruf[h.huruf]++
    else huruf.belum++
  }
  return {
    total: rows.length,
    rata: rerataAman(bernilai.map((a) => a.nilai)),
    huruf,
    final: akhir.filter((a) => a.status === 'final').length,
    diAtasAmbang: bernilai.filter((a) => a.nilai >= CONFIG.AMBANG_SERTIFIKAT).length,
  }
}

/** Rata-rata tiap aspek CPMK pada sekumpulan mahasiswa. */
export function rataAspek(rows) {
  return getAspekList().map((a) => {
    const nilai = rows.map((s) => transkripOf(s).aspekById[a.id]?.nilai).filter((n) => n != null)
    return { ...a, nilai: rerataAman(nilai), dinilai: nilai.length, total: rows.length }
  })
}

/** Rata-rata tiap cluster — sumbu radar. */
export function rataCluster(rows) {
  const contoh = transkripOf(rows[0] ?? STUDENTS[0])
  return Object.values(contoh.cluster).map((c) => {
    const nilai = rows.map((s) => transkripOf(s).cluster[c.cluster.id]?.nilai).filter((n) => n != null)
    return { cluster: c.cluster, nilai: rerataAman(nilai), dinilai: nilai.length, total: rows.length }
  })
}

export function rataArea(rows) {
  const contoh = transkripOf(rows[0] ?? STUDENTS[0])
  return Object.values(contoh.area).map((a) => {
    const nilai = rows.map((s) => transkripOf(s).area[a.area.id]?.nilai).filter((n) => n != null)
    return { area: a.area, nilai: rerataAman(nilai), dinilai: nilai.length, total: rows.length }
  })
}

export function byProgram(rows) {
  const map = new Map()
  for (const s of rows) {
    if (!map.has(s.program)) map.set(s.program, [])
    map.get(s.program).push(s)
  }
  return [...map.entries()]
    .map(([program, list]) => ({
      program,
      faculty: FACULTY_OF[program],
      jenjang: JENJANG_OF[program],
      total: list.length,
      ...ringkas(list),
    }))
    .sort((a, b) => (b.rata ?? 0) - (a.rata ?? 0))
}

export function byAngkatan(rows) {
  return COHORTS.map((c) => {
    const list = rows.filter((s) => s.angkatanId === c.id)
    return { angkatan: c, total: list.length, ...ringkas(list) }
  })
}

/** Kelengkapan komponen per semester dan per sumber — panel utama admin. */
export function kelengkapanMatriks(rows) {
  const hasil = []
  for (let sem = 1; sem <= CONFIG.TOTAL_SEMESTER_PROGRAM; sem++) {
    const aspek = getAspekList().filter((a) => a.semester === sem)
    const baris = { semester: sem, sumber: {} }
    for (const sumber of ['PDP', 'MK', 'ENGAGEMENT']) {
      let terisi = 0
      let total = 0
      for (const s of rows) {
        if (s.semesterAktif < sem) continue
        for (const a of aspek) {
          for (const k of getKomponen(a.id)) {
            if (k.sumber !== sumber) continue
            total++
            if (s.nilai?.[a.id]?.komponen?.[k.id]?.nilai != null) terisi++
          }
        }
      }
      baris.sumber[sumber] = { terisi, total, persen: total ? Math.round((terisi / total) * 100) : null }
    }
    hasil.push(baris)
  }
  return hasil
}

/* --------------------------------------------------------------------------
   Pekerjaan penilaian yang masih menganggur.

   Dikelompokkan persis seperti yang diminta Langkah 1 pada halaman Input Nilai:
   ANGKATAN × SEMESTER × SUMBER. Dengan begitu satu baris pada lonceng bisa
   langsung menjadi satu sasaran input — pengguna tidak perlu menerjemahkan
   sendiri "ada 340 nilai kosong" menjadi pilihan dropdown.

   Per mahasiswa akan terlalu banyak (ratusan mahasiswa × puluhan komponen);
   per semester saja terlalu kasar karena satu semester diisi oleh tiga unit
   penilai yang berbeda.
   -------------------------------------------------------------------------- */
export function pekerjaanPenilaian(rows = STUDENTS) {
  const hasil = []

  for (const c of COHORTS) {
    const mhs = rows.filter((s) => s.angkatanId === c.id)
    if (!mhs.length) continue

    for (let sem = 1; sem <= CONFIG.TOTAL_SEMESTER_PROGRAM; sem++) {
      // Semester yang belum dibuka tidak punya pekerjaan — bukan nol, melainkan belum waktunya.
      if (c.semesterAktif < sem) continue
      const aspek = getAspekList().filter((a) => a.semester === sem)

      for (const sumber of ['PDP', 'MK', 'ENGAGEMENT']) {
        let kosong = 0
        const aspekKurang = []
        const mhsKurang = new Set()

        for (const a of aspek) {
          const komponen = getKomponen(a.id).filter((k) => k.sumber === sumber)
          if (!komponen.length) continue
          let kurangDiAspek = false
          for (const s of mhs) {
            for (const k of komponen) {
              if (s.nilai?.[a.id]?.komponen?.[k.id]?.nilai == null) {
                kosong++
                kurangDiAspek = true
                mhsKurang.add(s.nim)
              }
            }
          }
          if (kurangDiAspek) aspekKurang.push(a)
        }

        if (kosong) {
          hasil.push({
            id: c.id + '-S' + sem + '-' + sumber,
            angkatan: c,
            semester: sem,
            sumber,
            kosong,
            mahasiswa: mhsKurang.size,
            /* Bila yang tertinggal cuma satu orang, NIM-nya ikut dibawa supaya
               halaman input bisa langsung menyaring ke baris orang itu. */
            nimTunggal: mhsKurang.size === 1 ? [...mhsKurang][0] : null,
            aspek: aspekKurang,
          })
        }
      }
    }
  }

  /* Yang paling banyak tertunda muncul lebih dulu — itu yang paling menahan
     terbitnya nilai akhir. */
  return hasil.sort((a, b) => b.kosong - a.kosong)
}

/* --------------------------------------------------------------------------
   Dua hal yang perlu ditinjau Kemahasiswaan, di luar urusan memasukkan nilai.

   Keduanya bukan pekerjaan mengetik melainkan keputusan: menindaklanjuti
   mahasiswa yang nilainya belum cukup, dan mengunci angkatan yang sudah
   tuntas. Karena itu dikumpulkan terpisah dari pekerjaanPenilaian().
   -------------------------------------------------------------------------- */
export function perluDitinjau(rows = STUDENTS) {
  const dibawahAmbang = rows.filter((s) => {
    if (s.semesterAktif < CONFIG.TOTAL_SEMESTER_PROGRAM) return false
    const n = transkripOf(s).akhir.nilai
    return n != null && n < CONFIG.AMBANG_SERTIFIKAT
  }).length

  const siapDikunci = COHORTS.filter(
    (c) =>
      c.status === 'aktif' &&
      c.semesterAktif >= CONFIG.TOTAL_SEMESTER_PROGRAM &&
      rows.some((s) => s.angkatanId === c.id),
  ).length

  return { dibawahAmbang, siapDikunci }
}

/* ==========================================================================
   DOSEN PENGAMPU

   Seorang dosen di sini bukan "punya akses ke semuanya". Ia memegang satu
   KELAS: satu unit asesmen (PDP atau MK Humaniora) × satu semester × satu
   program studi. Tiga hal itulah yang menentukan pengumpulan mana yang masuk
   ke antreannya dan komponen mana yang boleh ia nilai.

   Sumber ENGAGEMENT sengaja tidak diberikan kepada siapa pun di sini: itu
   penilaian Student Service & Engagement, yang dikerjakan Biro Kemahasiswaan
   sendiri lewat panelnya.
   ========================================================================== */

/** Inisial dari nama tanpa gelar — "Suryasari, S.Kom., M.MSI." → "SU". */
function inisialDosen(nama) {
  const bersih = nama.split(',')[0].trim().split(/\s+/)
  return bersih.length > 1
    ? (bersih[0][0] + bersih[1][0]).toUpperCase()
    : bersih[0].slice(0, 2).toUpperCase()
}

const emailDosen = (nama) =>
  nama
    .split(',')[0]
    .trim()
    .split(/\s+/)
    .map(slug)
    .join('.') + '@lecturer.umn.ac.id'

const d = ({ nip, nama, jabatan, sumber, semester, prodi }) => ({
  id: 'DSN-' + nip.slice(-4),
  nip,
  nama,
  inisial: inisialDosen(nama),
  email: emailDosen(nama),
  jabatan,
  sumber,
  semester,
  prodi,
  fakultas: FACULTY_OF[prodi] ?? 'Teknik & Informatika',
})

export const DOSEN = [
  d({
    nip: '0312078801',
    nama: 'Suryasari, S.Kom., M.MSI.',
    jabatan: 'Dosen MK Humaniora',
    sumber: 'MK',
    semester: 1,
    prodi: 'Sistem Informasi',
  }),
  d({
    nip: '0325118502',
    nama: 'Rahmat Nugroho, S.Hum., M.Hum.',
    jabatan: 'Dosen MK Humaniora',
    sumber: 'MK',
    semester: 2,
    prodi: 'Sistem Informasi',
  }),
  d({
    nip: '0410098703',
    nama: 'Maria Ulfah, S.Psi., M.Psi.',
    jabatan: 'Dosen MK Humaniora',
    sumber: 'MK',
    semester: 3,
    prodi: 'Informatika',
  }),
  d({
    nip: '0208088204',
    nama: 'Bambang Setiawan, S.Sos., M.Si.',
    jabatan: 'Fasilitator PDP',
    sumber: 'PDP',
    semester: 1,
    prodi: 'Informatika',
  }),
  d({
    nip: '0119059005',
    nama: 'Yohanes Kurniawan, S.Fil., M.Th.',
    jabatan: 'Fasilitator PDP',
    sumber: 'PDP',
    semester: 2,
    prodi: 'Komunikasi Strategis',
  }),
]

export const getDosenByNip = (nip) => DOSEN.find((x) => x.nip === String(nip).trim()) ?? null

export const getDosenByEmail = (email) => {
  const cari = String(email ?? '').trim().toLowerCase()
  return DOSEN.find((x) => x.email.toLowerCase() === cari) ?? null
}

/** Beberapa alamat contoh, dipakai membantu pengguna yang salah ketik. */
export const contohEmailDosen = (n = 2) => DOSEN.slice(0, n).map((x) => x.email)

/** Kelas yang dipegang seorang dosen — dipakai menyaring daftar pengumpulan. */
export function komponenDosen(dosen) {
  if (!dosen) return []
  return getAspekList()
    .filter((a) => a.semester === dosen.semester)
    .flatMap((a) => getKomponen(a.id))
    .filter((k) => k.sumber === dosen.sumber)
}

/* ==========================================================================
   PENGUMPULAN MAHASISWA

   Ini konsep baru di aplikasi: mahasiswa MENGUMPULKAN berkas, bukan memasukkan
   nilai. Aturan R8 tetap utuh — tidak ada satu pun angka di sini yang berasal
   dari mahasiswa. Yang mereka kirim hanya bukti pekerjaan; angkanya lahir di
   panel dosen.

   Dibangkitkan sekali saat modul dimuat, dari keadaan DASAR data mahasiswa —
   sebelum store memutar ulang perubahan nilai. Jadi daftarnya tidak berubah
   sendiri setiap ada yang menyimpan nilai; yang berubah hanya STATUS tiap
   baris, dan itu dihitung di store.js dari nilai yang benar-benar tersimpan.

   PRNG-nya sengaja instance sendiri dengan seed berbeda. Kalau ikut memakai
   `rand` di atas, setiap penambahan baris di sini akan menggeser seluruh nilai
   mahasiswa yang sudah ada — data contoh yang deterministik justru jadi
   berubah-ubah.
   ========================================================================== */

const JUDUL_BERKAS = {
  TUGAS: 'Laporan tugas',
  SIKAP: 'Lembar refleksi sikap',
  UTS: 'Berkas UTS',
  UAS: 'Berkas UAS',
}

const BENTUK = ['PDF', 'DOCX', 'Tautan Drive']

/** '2026-09-01' + n hari, dikembalikan sebagai 'YYYY-MM-DD HH:MM'. */
function waktuKumpul(hari, menit) {
  const t = new Date(Date.UTC(2026, 8, 1, 8, 0) + hari * 86400000 + menit * 60000)
  return t.toISOString().slice(0, 16).replace('T', ' ')
}

function bangunPengumpulan() {
  const acak = mulberry32(20260917)
  const hasil = []
  let urut = 0

  for (const dosen of DOSEN) {
    const komponen = komponenDosen(dosen)
    if (!komponen.length) continue

    const kelas = STUDENTS.filter(
      (m) => m.program === dosen.prodi && m.semesterAktif >= dosen.semester,
    )

    for (const m of kelas) {
      for (const k of komponen) {
        /* Tidak semua mahasiswa mengumpulkan — daftar yang selalu penuh tidak
           akan pernah menunjukkan rupa halaman ini pada hari biasa.

           Yang nilainya SUDAH ada tetap ikut masuk daftar: ia tetap sebuah
           pengumpulan, hanya statusnya sudah "dinilai". Menyaringnya di sini
           akan membuat dosen kehilangan riwayat pekerjaannya sendiri. */
        if (acak() > 0.62) continue

        urut++
        const hari = Math.floor(acak() * 12)
        const bentuk = BENTUK[Math.floor(acak() * BENTUK.length)]
        hasil.push({
          id: 'PG-' + String(urut).padStart(4, '0'),
          nim: m.nim,
          nama: m.name,
          program: m.program,
          fakultas: m.faculty,
          angkatanId: m.angkatanId,
          angkatanLabel: m.angkatanLabel,
          semester: dosen.semester,
          sumber: dosen.sumber,
          dosenNip: dosen.nip,
          komponenId: k.id,
          komponenLabel: k.label,
          aspekId: k.aspekId,
          /* Apa yang dikirim mahasiswa. Nama komponennya sudah ada di
             komponenLabel, jadi baris ini menyebut BENTUKNYA. */
          jenisBerkas: JUDUL_BERKAS[k.jenis] ?? 'Berkas pengumpulan',
          bentuk,
          berkas:
            bentuk === 'Tautan Drive'
              ? 'drive.google.com/…/' + k.id.toLowerCase()
              : slug(m.name.split(' ')[0]) + '-' + k.id.toLowerCase() + '.' + bentuk.toLowerCase(),
          waktu: waktuKumpul(hari, Math.floor(acak() * 600)),
          /* Lewat hari ke-9 dihitung terlambat. Penanda ini tidak mengubah
             nilai apa pun — ia hanya informasi bagi dosen yang menilai. */
          terlambat: hari > 9,
        })
      }
    }
  }

  return hasil.sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
}

export const PENGUMPULAN = bangunPengumpulan()

/** Pengumpulan yang menjadi tanggung jawab seorang dosen. */
export const pengumpulanDosen = (nip) => PENGUMPULAN.filter((p) => p.dosenNip === nip)

/* --------------------------------------------------------------------------
   Dua usulan nilai yang sudah menunggu sejak awal.

   Tanpa ini, halaman Persetujuan Nilai Dosen selalu kosong sampai seseorang
   sempat masuk sebagai dosen dan mengirim sesuatu — dan fitur yang tidak
   pernah terlihat akan dikira rusak.

   Isinya mengacu ke pengumpulan yang benar-benar ada dan benar-benar belum
   bernilai, jadi menyetujuinya menghasilkan perubahan yang sungguhan, bukan
   angka hiasan yang tidak nyambung ke mana-mana.
   -------------------------------------------------------------------------- */
function bangunUsulanAwal() {
  const acak = mulberry32(20260918)
  const hasil = []

  /* Dosen ke-2 dan ke-3: keduanya punya antrean cukup panjang, dan keduanya
     memakai cara berbeda supaya dua bentuk usulan terlihat di layar. */
  const rencana = [
    { dosen: DOSEN[1], cara: 'manual', jumlah: 5, catatan: 'Nilai tugas 2 sudah termasuk revisi.' },
    { dosen: DOSEN[2], cara: 'import', jumlah: 8, catatan: '' },
  ]

  rencana.forEach(({ dosen, cara, jumlah, catatan }, i) => {
    const belum = PENGUMPULAN.filter(
      (p) =>
        p.dosenNip === dosen.nip &&
        !getStudentByNim(p.nim)?.nilai?.[p.aspekId]?.komponen?.[p.komponenId],
    ).slice(0, jumlah)
    if (!belum.length) return

    const angkatan = [...new Set(belum.map((p) => p.angkatanId))]
    hasil.push({
      id: 'U-AWAL-' + (i + 1),
      dosenNip: dosen.nip,
      dosenNama: dosen.nama,
      sumber: dosen.sumber,
      semester: dosen.semester,
      prodi: dosen.prodi,
      angkatanId: angkatan.length === 1 ? angkatan[0] : 'campuran',
      cara,
      catatan,
      waktu: waktuKumpul(12 + i, Math.floor(acak() * 400)),
      status: 'menunggu',
      entri: belum.map((p) => ({
        nim: p.nim,
        nama: p.nama,
        komponenId: p.komponenId,
        nilai: 70 + Math.floor(acak() * 26),
      })),
      keputusan: null,
      batchId: null,
    })
  })

  return hasil
}

export const USULAN_AWAL = bangunUsulanAwal()
