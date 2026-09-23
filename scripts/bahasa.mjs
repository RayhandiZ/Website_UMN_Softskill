/* --------------------------------------------------------------------------
   Pemeriksa cakupan terjemahan.

   Menjawab satu pertanyaan: kalimat mana yang sudah dibungkus t(...) tetapi belum punya padanan Inggris di teks.js. Kalimat seperti itu
   tidak membuat aplikasi rusak — ia jatuh kembali ke bahasa Indonesia — tetapi
   ia muncul sebagai satu baris Indonesia di tengah halaman berbahasa Inggris,
   dan itu persis keluhan yang membuat fitur ini dibuat.

   Kunci yang EJAANNYA SAMA di kedua bahasa (Dashboard, Email, Status, Maret,
   April, September, November) sengaja tidak dihitung sebagai kekurangan.
   -------------------------------------------------------------------------- */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { EN } from '../src/lib/teks.js'

const BERKAS = [
  ...readdirSync('src/halaman/student').map((f) => join('src/halaman/student', f)),
  ...readdirSync('src/halaman/dosen').map((f) => join('src/halaman/dosen', f)),
  ...readdirSync('src/halaman/admin').map((f) => join('src/halaman/admin', f)),
  ...readdirSync('src/components').map((f) => join('src/components', f)),
  ...readdirSync('src/components/charts').map((f) => join('src/components/charts', f)),
  'src/halaman/Login.jsx',
  'src/halaman/Profil.jsx',
].filter((f) => f.endsWith('.jsx'))

/* Kata yang memang identik di kedua bahasa. */
const SAMA = new Set([
  'Dashboard', 'Email', 'Status', 'Helpdesk', 'draft', 'Admin', 'Workspace',
  'Maret', 'April', 'September', 'November', 'Februari', 'Final', 'Semester {n}',
  'Area {kode}', 'Nilai akhir', 'WhatsApp UMN', 'Customer Service',
  /* Bukan kalimat: keduanya argumen toLocaleTimeString yang kebetulan
     tertangkap pemindai. */
  '2-digit', 'id-ID',
  'Pilih Yan Akan Di Input', 'Manual', 'Semester', 'Skala', 'Keyakinan', 'Konversi',
  'Rollback', 'Import CSV', 'Overview', 'Nilai',
])

const tanpaKomentar = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/* Semua literal di dalam pemanggilan t(...) atau teks(...), termasuk yang ada
   di dalam ternary. */
function kunciDi(sumber) {
  const hasil = new Set()
  const teks = tanpaKomentar(sumber)
  const re = /\b(?:t|teks)\(/g
  let m
  while ((m = re.exec(teks))) {
    let i = re.lastIndex
    let dalam = 1
    let mulai = i
    while (i < teks.length && dalam > 0) {
      const c = teks[i]
      if (c === '(') dalam++
      else if (c === ')') dalam--
      i++
    }
    const isi = teks.slice(mulai, i - 1)
    for (const lit of isi.matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
      const k = lit[1].replace(/\\'/g, "'")
      /* Nama properti dan potongan kode ikut tertangkap; yang diambil hanya
         yang benar-benar terbaca sebagai kalimat. */
      if (k && /[A-Za-z]/.test(k) && !/^[a-z]+$/.test(k.trim())) hasil.add(k)
      else if (['siap', 'belum', 'sementara', 'pada', 'draft'].includes(k)) hasil.add(k)
    }
  }
  return hasil
}

/* Kalimat yang tidak ditulis sebagai literal di dalam t(), melainkan datang
   dari modul data dan diterjemahkan lewat t(variabel). Pemindai tidak bisa
   melihatnya, jadi didaftarkan di sini supaya tetap ikut diperiksa. */
const DARI_DATA = [
  'WhatsApp UMN', 'Customer Service', 'Surel Softskill 5C',
  'Kirim pesan, dibalas pada jam kerja',
  'Hubungi lewat telepon pada jam kerja',
  'Untuk pertanyaan yang butuh lampiran',
  'Senin sampai Jumat, 08.00 hingga 17.00 WIB',
]

const semua = new Set(DARI_DATA)
for (const f of BERKAS) for (const k of kunciDi(readFileSync(f, 'utf8'))) semua.add(k)

const hilang = [...semua].filter((k) => !(k in EN) && !SAMA.has(k)).sort()

console.log('kunci terpakai di seluruh panel  :', semua.size)
console.log('punya padanan Inggris             :', semua.size - hilang.length)

if (hilang.length) {
  console.log('\nBELUM diterjemahkan (' + hilang.length + '):')
  for (const k of hilang) console.log('  - ' + k)
  process.exitCode = 1
} else {
  console.log('\nSeluruh kalimat aplikasi punya padanan Inggris')
}
