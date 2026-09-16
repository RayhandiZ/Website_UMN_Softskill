import { useSyncExternalStore } from 'react'
import { getKomponenById } from './curriculum.js'
import { AUDIT_LOG, PENGAJUAN_KOREKSI, getStudentByNim, resetTranskripCache } from './mockData.js'

/* --------------------------------------------------------------------------
   Penyimpanan perubahan nilai.

   Spesifikasi melarang localStorage untuk data nilai, tetapi tanpa backend
   larangan itu membuat fiturnya tidak berfungsi sebagaimana mestinya: setiap
   muat ulang halaman menghapus seluruh input, dan panel mahasiswa yang dibuka
   di tab lain tidak pernah melihatnya. Jadi yang disimpan di sini BUKAN salinan
   basis data, melainkan hanya DAFTAR BATCH PERUBAHAN — cukup untuk diputar ulang
   di atas data contoh yang deterministik.

   Setel SIMPAN_PERUBAHAN ke false untuk kembali ke perilaku murni di memori.

   Setiap penulisan selalu lewat sebuah batch supaya bisa di-rollback utuh (9.4)
   dan tercatat di audit log (R12).
   -------------------------------------------------------------------------- */

export const SIMPAN_PERUBAHAN = true
const KUNCI = 'sk5c.nilai'

let versi = 0
const listeners = new Set()

/* Kapan data terakhir BERUBAH — bukan kapan halaman dibuka.

   Disetel di satu tempat ini karena setiap perubahan, dari mana pun asalnya
   (nilai tersimpan, koreksi diputuskan, data disegarkan, atau jendela lain
   menulis lewat peristiwa storage), semuanya bermuara ke sini. Jadi penanda
   waktunya mustahil tertinggal. */
let waktuPerubahan = new Date()

export const terakhirDiperbarui = () => waktuPerubahan

function berubah() {
  versi++
  waktuPerubahan = new Date()
  resetTranskripCache()
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const bacaVersi = () => versi

/** Membuat komponen ikut menghitung ulang setiap ada nilai yang berubah. */
export function useStore() {
  return useSyncExternalStore(subscribe, bacaVersi, bacaVersi)
}

/* ------------------------------ keadaan asli ------------------------------ */

/* Nilai bawaan tiap komponen yang pernah disentuh, supaya seluruh perubahan
   bisa dibatalkan dan diputar ulang dari nol tanpa menyalin seluruh data. */
const ASLI = new Map()
const kunciSel = (nim, komponenId) => nim + '|' + komponenId

function catatAsli(mahasiswa, komponen) {
  const k = kunciSel(mahasiswa.nim, komponen.id)
  if (!ASLI.has(k)) {
    ASLI.set(k, mahasiswa.nilai?.[komponen.aspekId]?.komponen?.[komponen.id] ?? null)
  }
}

function kembalikanSemua() {
  for (const [k, lama] of ASLI) {
    const [nim, komponenId] = k.split('|')
    const mahasiswa = getStudentByNim(nim)
    const komponen = getKomponenById(komponenId)
    const slot = mahasiswa?.nilai?.[komponen?.aspekId]
    if (!slot) continue
    if (lama) slot.komponen[komponenId] = lama
    else delete slot.komponen[komponenId]
  }
}

/* --------------------------------- batch ---------------------------------- */

/** Batch perubahan yang masih berlaku — terbaru di depan. */
export const BATCH_SESI = []

let urut = 0

const waktuSekarang = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

/** Menuliskan satu batch ke data mahasiswa dan menyusun jejak auditnya. */
function terapkanBatch(batch) {
  batch.jejak = []
  const tanggal = batch.waktu.slice(0, 10)

  batch.entri.forEach((e, i) => {
    const mahasiswa = getStudentByNim(e.nim)
    const komponen = getKomponenById(e.komponenId)
    if (!mahasiswa || !komponen) return

    catatAsli(mahasiswa, komponen)

    const slot = (mahasiswa.nilai[komponen.aspekId] ??= { komponen: {} })
    const lama = slot.komponen[e.komponenId] ?? null
    slot.komponen[e.komponenId] = { nilai: e.nilai, penilai: batch.aktor, tanggal, batchId: batch.id }

    batch.jejak.push({
      id: 'L-' + batch.id + '-' + i,
      waktu: batch.waktu,
      aktor: batch.aktor,
      nim: mahasiswa.nim,
      nama: mahasiswa.name,
      aspek: komponen.aspekId,
      komponen: e.komponenId,
      nilaiLama: lama?.nilai ?? null,
      nilaiBaru: e.nilai,
      sumber: komponen.sumber,
      batchId: batch.id,
    })
  })

  batch.jumlah = batch.jejak.length
}

/* --------------------------- penguncian aspek ----------------------------- */

/* Penandaan "final" atau "tahan sebagai sementara" per (mahasiswa, aspek).
   Disimpan terpisah dari nilai karena sifatnya keputusan, bukan data asesmen. */
export const PENGUNCIAN = []

const NIM_KUNCI = new Set()

function terapkanPenguncian() {
  for (const nim of NIM_KUNCI) {
    const m = getStudentByNim(nim)
    if (m) m.penguncian = {}
  }
  for (const p of PENGUNCIAN) {
    const m = getStudentByNim(p.nim)
    if (!m) continue
    NIM_KUNCI.add(p.nim)
    m.penguncian[p.aspekId] = { status: p.status, oleh: p.aktor, tanggal: p.waktu.slice(0, 10) }
  }
}

/**
 * Menandai satu aspek milik satu mahasiswa.
 *   status 'final'      kunci sebagai nilai final
 *   status 'sementara'  tahan sebagai sementara walau komponennya sudah lengkap
 *   status null         lepaskan penandaan, ikuti CONFIG.PENGUNCIAN_ASPEK
 */
export function setPenguncian({ nim, aspekId, status, aktor }) {
  const i = PENGUNCIAN.findIndex((p) => p.nim === nim && p.aspekId === aspekId)
  if (i >= 0) PENGUNCIAN.splice(i, 1)
  if (status) PENGUNCIAN.push({ nim, aspekId, status, aktor, waktu: waktuSekarang() })
  NIM_KUNCI.add(nim)
  terapkanUlang()
  simpanKePenyimpanan()
}

/** Menandai banyak aspek sekaligus — dipakai setelah satu batch nilai masuk. */
export function setPenguncianBanyak(daftar, { status, aktor }) {
  for (const { nim, aspekId } of daftar) {
    const i = PENGUNCIAN.findIndex((p) => p.nim === nim && p.aspekId === aspekId)
    if (i >= 0) PENGUNCIAN.splice(i, 1)
    if (status) PENGUNCIAN.push({ nim, aspekId, status, aktor, waktu: waktuSekarang() })
    NIM_KUNCI.add(nim)
  }
  terapkanUlang()
  simpanKePenyimpanan()
}

/**
 * Memutar ulang seluruh batch dari keadaan bawaan.
 * Dipakai setelah menyimpan, setelah rollback, dan saat tab lain mengubah data —
 * jadi hasilnya selalu sama tak peduli urutan kejadiannya.
 */
function terapkanUlang() {
  kembalikanSemua()

  for (let i = AUDIT_LOG.length - 1; i >= 0; i--) {
    if (String(AUDIT_LOG[i].batchId ?? '').startsWith('B-SESI')) AUDIT_LOG.splice(i, 1)
  }

  const kronologis = [...BATCH_SESI].reverse()
  for (const b of kronologis) {
    if (b.status !== 'diproses') {
      b.jejak = []
      b.jumlah = b.entri.length
      continue
    }
    terapkanBatch(b)
    for (const j of b.jejak) AUDIT_LOG.unshift(j)
  }

  terapkanPenguncian()
  berubah()
}

/**
 * Menulis sekumpulan nilai sebagai satu batch.
 * `entri` berbentuk { nim, komponenId, nilai }.
 */
export function simpanBatch({ sumber, semester, angkatanId, aktor, cara, entri }) {
  urut++
  const batch = {
    id: 'B-SESI-' + String(urut).padStart(2, '0'),
    sumber,
    semester,
    angkatanId,
    aktor,
    cara,
    waktu: waktuSekarang(),
    status: 'diproses',
    entri: entri.map(({ nim, komponenId, nilai }) => ({ nim, komponenId, nilai })),
    jejak: [],
    jumlah: entri.length,
  }

  BATCH_SESI.unshift(batch)
  terapkanUlang()
  simpanKePenyimpanan()
  return batch
}

/** Mengembalikan seluruh nilai batch ke keadaan sebelumnya. */
export function rollbackBatch(id) {
  const batch = BATCH_SESI.find((b) => b.id === id)
  if (!batch || batch.status === 'dibatalkan') return false
  batch.status = 'dibatalkan'
  terapkanUlang()
  simpanKePenyimpanan()
  return true
}

/* ---------------------------- pengajuan koreksi --------------------------- */

export function putuskanKoreksi(id, keputusan, { aktor, catatan }) {
  const k = PENGAJUAN_KOREKSI.find((x) => x.id === id)
  if (!k) return false
  k.status = keputusan
  k.keputusan = { oleh: aktor, tanggal: new Date().toISOString().slice(0, 10), catatan }
  berubah()
  simpanKePenyimpanan()
  return true
}

/* ------------------------------- penyimpanan ------------------------------ */

const adaPenyimpanan = () => {
  if (!SIMPAN_PERUBAHAN) return false
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

let sedangMenulis = false

function simpanKePenyimpanan() {
  if (!adaPenyimpanan()) return
  try {
    sedangMenulis = true
    localStorage.setItem(
      KUNCI,
      JSON.stringify({
        versi: 1,
        urut,
        batch: BATCH_SESI.map(({ id, sumber, semester, angkatanId, aktor, cara, waktu, status, entri }) => ({
          id, sumber, semester, angkatanId, aktor, cara, waktu, status, entri,
        })),
        penguncian: PENGUNCIAN,
        koreksi: Object.fromEntries(
          PENGAJUAN_KOREKSI.filter((k) => k.keputusan).map((k) => [k.id, { status: k.status, keputusan: k.keputusan }]),
        ),
        koreksiBaru: PENGAJUAN_KOREKSI.filter((k) => k.baru),
      }),
    )
  } catch {
    /* kuota penuh atau penyimpanan diblokir — perubahan tetap hidup di memori */
  } finally {
    sedangMenulis = false
  }
}

/** Membaca kembali perubahan dari penyimpanan dan memutarnya ulang. */
export function muatDariPenyimpanan() {
  if (!adaPenyimpanan()) return
  let data
  try {
    data = JSON.parse(localStorage.getItem(KUNCI) ?? 'null')
  } catch {
    return
  }
  if (!data?.batch) return

  BATCH_SESI.length = 0
  for (const b of data.batch) BATCH_SESI.push({ ...b, jejak: [], jumlah: b.entri.length })
  urut = data.urut ?? BATCH_SESI.length

  PENGUNCIAN.length = 0
  for (const p of data.penguncian ?? []) {
    PENGUNCIAN.push(p)
    NIM_KUNCI.add(p.nim)
  }

  for (const k of data.koreksiBaru ?? []) {
    if (!PENGAJUAN_KOREKSI.some((x) => x.id === k.id)) PENGAJUAN_KOREKSI.unshift(k)
  }

  for (const [id, nilai] of Object.entries(data.koreksi ?? {})) {
    const k = PENGAJUAN_KOREKSI.find((x) => x.id === id)
    if (k) Object.assign(k, nilai)
  }

  terapkanUlang()
}

/* ------------------------------ segarkan data ----------------------------- */

/* Kapan data terakhir dibaca ulang. Dibaca komponen lewat useStore(), jadi
   ikut menyegar sendiri setiap ada perubahan. */
let waktuSegar = null

export const terakhirSegar = () => waktuSegar

/**
 * SATU-SATUNYA pintu untuk memuat ulang data mahasiswa.
 *
 * Hari ini ia membaca ulang sumber yang ada — perubahan nilai yang tersimpan
 * di peramban (termasuk yang disimpan jendela lain), lalu memutarnya ulang di
 * atas data dasar dan membuang seluruh hasil hitungan lama.
 *
 * Ketika basis data nanti tersambung, HANYA fungsi ini yang berubah menjadi
 * pemanggilan API; tombol di halaman, penanda waktunya, dan seluruh komponen
 * yang ikut menghitung ulang tidak perlu disentuh sama sekali.
 */
export function segarkanData() {
  muatDariPenyimpanan()
  /* terapkanUlang() sudah dipanggil di dalam muatDariPenyimpanan bila ada
     perubahan tersimpan. Bila tidak ada, tetap perlu memberi tahu komponen —
     kalau tidak, menekan tombolnya akan terasa tidak melakukan apa-apa. */
  waktuSegar = new Date()
  berubah()
  return waktuSegar
}

/** Menghapus seluruh perubahan dan kembali ke data contoh bawaan. */
export function bersihkanPerubahan() {
  BATCH_SESI.length = 0
  PENGUNCIAN.length = 0
  urut = 0
  terapkanUlang()
  try {
    localStorage.removeItem(KUNCI)
  } catch {
    /* diabaikan */
  }
}

/* Muat perubahan yang tersimpan sebelum komponen pertama dirender. */
muatDariPenyimpanan()

/* Tab lain menulis → ikut menyesuaikan, sehingga panel admin dan panel
   mahasiswa yang dibuka berdampingan selalu menampilkan angka yang sama. */
if (typeof window !== 'undefined' && adaPenyimpanan()) {
  window.addEventListener('storage', (e) => {
    if (e.key === KUNCI && !sedangMenulis) muatDariPenyimpanan()
  })
}

export const PERINGATAN_SESI = SIMPAN_PERUBAHAN
  ? 'Perubahan tersimpan di peramban ini dan bertahan setelah halaman dimuat ulang — purwarupa ini belum terhubung ke basis data kampus.'
  : 'Perubahan tersimpan selama sesi ini saja dan hilang bila halaman dimuat ulang.'



/* ------------------------- pengajuan koreksi mahasiswa -------------------- */

/**
 * Satu-satunya aksi tulis milik mahasiswa (R8).
 * Pengajuan TIDAK mengubah nilai apa pun — ia hanya masuk ke antrean
 * Kemahasiswaan untuk diputuskan.
 */
export function ajukanKoreksi({ student, komponenId, alasan, nilaiDiharapkan = null }) {
  const komponen = getKomponenById(komponenId)
  if (!komponen) throw new Error('Komponen tidak dikenal.')
  if (!String(alasan ?? '').trim()) throw new Error('Alasan pengajuan wajib diisi.')

  const pengajuan = {
    id: 'K-' + Date.now().toString(36).toUpperCase().slice(-5),
    nim: student.nim,
    nama: student.name,
    komponenId,
    komponenLabel: komponen.label,
    aspekId: komponen.aspekId,
    alasan: String(alasan).trim(),
    nilaiDiharapkan,
    status: 'menunggu',
    diajukan: new Date().toISOString().slice(0, 10),
    keputusan: null,
    baru: true,
  }

  PENGAJUAN_KOREKSI.unshift(pengajuan)
  berubah()
  simpanKePenyimpanan()
  return pengajuan
}

/** Pengajuan milik seorang mahasiswa — dipakai halaman transkrip. */
export const koreksiMilik = (nim) => PENGAJUAN_KOREKSI.filter((k) => k.nim === nim)
