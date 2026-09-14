import { createRoot } from 'react-dom/client'
import { act } from 'react'
import Penyedia from '../app/penyedia'
import { RequireRole } from '../src/lib/auth'
import { STUDENTS } from '../src/lib/mockData'
import { aturJalur } from './palsu-next-navigation'

import Login from '../src/halaman/Login'
import Profil from '../src/halaman/Profil'
import StudentLayout from '../src/halaman/student/StudentLayout'
import Dashboard from '../src/halaman/student/Dashboard'
import TranskripPage from '../src/halaman/student/TranskripPage'
import Peta from '../src/halaman/student/Peta'
import Riwayat from '../src/halaman/student/Riwayat'
import Sertifikat from '../src/halaman/student/Sertifikat'
import AdminLayout from '../src/halaman/admin/AdminLayout'
import Overview from '../src/halaman/admin/Overview'
import Students from '../src/halaman/admin/Students'
import StudentDetail from '../src/halaman/admin/StudentDetail'
import Programs from '../src/halaman/admin/Programs'
import Nilai from '../src/halaman/admin/Nilai'

/* Dibuka untuk uji sinkronisasi foto profil. */
export { kunciSesi, simpanProfil } from '../src/lib/profil'
export { BATAS_BARIS_ASPEK } from '../src/halaman/student/Dashboard'

/* --------------------------------------------------------------------------
   Peta rute untuk uji.

   Next menyusun halaman dari berkas: app/mahasiswa/layout.jsx membungkus
   app/mahasiswa/page.jsx, dan seterusnya. Di jsdom tidak ada penyusun itu,
   jadi susunannya ditulis ulang di sini — TERMASUK RequireRole dan layoutnya,
   supaya yang diuji benar-benar sama dengan yang dilihat pengguna, bukan
   halaman telanjang tanpa kerangka.

   Kalau nanti ada rute baru di app/, tambahkan juga di sini.
   -------------------------------------------------------------------------- */
const mahasiswa = (isi) => (
  <RequireRole role="student">
    <StudentLayout>{isi}</StudentLayout>
  </RequireRole>
)

const admin = (isi) => (
  <RequireRole role="admin">
    <AdminLayout>{isi}</AdminLayout>
  </RequireRole>
)

const RUTE = {
  '/masuk': { pohon: () => <Login />, params: {} },
  '/mahasiswa': { pohon: () => mahasiswa(<Dashboard />) },
  '/mahasiswa/transkrip': { pohon: () => mahasiswa(<TranskripPage />) },
  '/mahasiswa/peta': { pohon: () => mahasiswa(<Peta />) },
  '/mahasiswa/riwayat': { pohon: () => mahasiswa(<Riwayat />) },
  '/mahasiswa/sertifikat': { pohon: () => mahasiswa(<Sertifikat />) },
  '/mahasiswa/profil': { pohon: () => mahasiswa(<Profil />) },
  '/admin': { pohon: () => admin(<Overview />) },
  '/admin/mahasiswa': { pohon: () => admin(<Students />) },
  '/admin/mahasiswa/DEMO-3': { pohon: () => admin(<StudentDetail />), params: { id: 'DEMO-3' } },
  '/admin/program-studi': { pohon: () => admin(<Programs />) },
  '/admin/nilai': { pohon: () => admin(<Nilai />) },
  '/admin/profil': { pohon: () => admin(<Profil />) },
}

/* Memasang satu rute lengkap dengan penyedia konteks yang sama persis dengan
   app/layout.jsx — supaya uji tidak pernah memakai susunan provider sendiri
   yang diam-diam berbeda dari aplikasinya. */
async function pasang(rute) {
  const entri = RUTE[rute]
  if (!entri) throw new Error('Rute belum terdaftar di scripts/smoke.jsx: ' + rute)
  aturJalur(rute, entri.params ?? {})

  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(<Penyedia>{entri.pohon()}</Penyedia>)
  })
  await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
  const lepas = () => {
    root.unmount()
    el.remove()
  }
  return { el, lepas }
}

const klik = async (node) => {
  await act(async () => {
    node?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

export async function render(rute) {
  const { el, lepas } = await pasang(rute)
  const html = el.innerHTML
  lepas()
  return html
}

/**
 * Menguji perilaku menu di layar kecil dengan benar-benar menekannya.
 *
 * Memeriksa markup saja tidak cukup: laci yang selalu ada di DOM, atau tombol
 * yang tidak tersambung ke apa pun, tetap akan lolos. Yang diperiksa di sini
 * adalah perubahan keadaan sesudah klik.
 */
export async function ujiMenuHp(rute) {
  const { el, lepas } = await pasang(rute)
  const cariLaci = () => el.querySelector('[role="dialog"][aria-label="Menu navigasi"]')

  const hasil = {}
  const hamburger = el.querySelector('[aria-label="Buka menu navigasi"]')
  hasil.adaHamburger = !!hamburger
  hasil.laciTertutupAwal = !cariLaci()

  await klik(hamburger)
  const laci = cariLaci()
  hasil.laciTerbuka = !!laci
  hasil.tautanDiLaci = laci ? laci.querySelectorAll('a').length : 0
  hasil.gulirTerkunci = document.body.style.overflow === 'hidden'

  await klik(laci?.querySelector('a'))
  hasil.laciTertutupSetelahPilih = !cariLaci()
  hasil.gulirPulih = document.body.style.overflow !== 'hidden'

  lepas()
  return hasil
}

/**
 * Tab penyaring dan baris aspek yang bisa dibuka di dashboard mahasiswa.
 * Angka di tab harus sama dengan jumlah baris yang benar-benar tampil, dan
 * rincian komponen hanya ada di DOM setelah barisnya diketuk.
 */
export async function ujiAspek(rute) {
  const { el, lepas } = await pasang(rute)
  const tab = (nama) => [...el.querySelectorAll('[role="tab"]')].find((t) => t.textContent.startsWith(nama))
  const angka = (t) => Number(t.textContent.replace(/\D+/g, ''))
  const baris = () => [...el.querySelectorAll('button[aria-controls^="rinci-"]')]

  const hasil = { tabSesuai: {} }
  for (const nama of ['Semua', 'Final', 'Berjalan', 'Terkunci']) {
    const t = tab(nama)
    await klik(t)
    const tautan = [...el.querySelectorAll('a[href="/mahasiswa/transkrip"]')].map((a) => a.textContent)
    hasil.tabSesuai[nama] = {
      tertulis: angka(t),
      tampil: baris().length,
      terpilih: t.getAttribute('aria-selected') === 'true',
      tautan,
    }
  }

  await klik(tab('Semua'))
  const pertama = baris()[0]
  const idRinci = pertama?.getAttribute('aria-controls')
  hasil.rinciTertutupAwal = !el.querySelector('#' + idRinci)
  await klik(pertama)
  hasil.rinciTerbuka = !!el.querySelector('#' + idRinci) && pertama.getAttribute('aria-expanded') === 'true'
  await klik(pertama)
  hasil.rinciTertutupLagi = !el.querySelector('#' + idRinci)

  lepas()
  return hasil
}

/**
 * Dua penghemat gulir di ponsel: ubin ringkasan yang dilipat, dan lonceng
 * "Belum dinilai" yang menggantikan kartu di badan halaman.
 */
export async function ujiRingkasHp(rute) {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  const wadah = el.querySelector('#ubin-rinci')
  const pelipat = el.querySelector('button[aria-controls="ubin-rinci"]')
  hasil.ubinTerlipatAwal = !!wadah && wadah.className.split(' ').includes('hidden')
  hasil.tetapUtuhDiLayarLebar = !!wadah && wadah.className.includes('sm:contents')
  await klik(pelipat)
  hasil.ubinTerbuka = !!wadah && wadah.className.split(' ').includes('grid') && pelipat.getAttribute('aria-expanded') === 'true'
  hasil.nilaiAkhirTetapDiLuar = !!el.querySelector('#ubin-rinci') && !el.querySelector('#ubin-rinci').textContent.includes('Nilai akhir')

  const lonceng = el.querySelector('button[aria-label$="komponen belum dinilai"]')
  hasil.adaLonceng = !!lonceng
  hasil.angkaLonceng = lonceng ? Number(lonceng.getAttribute('aria-label').match(/\d+/)[0]) : 0
  const panel = () => el.querySelector('[role="dialog"][aria-label="Komponen belum dinilai"]')
  hasil.panelTertutupAwal = !panel()
  await klik(lonceng)
  hasil.panelTerbuka = !!panel()
  hasil.itemDiPanel = panel() ? panel().querySelectorAll('li').length : 0
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  hasil.panelTutupDenganEscape = !panel()

  lepas()
  return hasil
}

/**
 * Road Map: semester berjalan terbuka lebih dulu, hanya satu yang terbuka
 * sekaligus, dan semester terkunci memperlihatkan kegiatannya tanpa angka.
 */
export async function ujiPeta(rute) {
  const { el, lepas } = await pasang(rute)
  const kepala = (n) => el.querySelector('button[aria-controls="semester-' + n + '"]')
  const isi = (n) => el.querySelector('#semester-' + n)
  const terbuka = () => [1, 2, 3].filter((n) => isi(n))

  const hasil = { awal: terbuka() }

  await klik(kepala(1))
  hasil.setelahSem1 = terbuka()
  hasil.sem1 = isi(1)?.textContent ?? ''

  await klik(kepala(3))
  hasil.setelahSem3 = terbuka()
  hasil.sem3 = isi(3)?.textContent ?? ''

  await klik(kepala(3))
  hasil.setelahTutup = terbuka()

  lepas()
  return hasil
}

/**
 * History: tab menyaring dengan benar, kalimat "disetujui" hanya dipakai untuk
 * yang final, dan angka yang ditunggu sama dengan angka di lonceng.
 */
export async function ujiRiwayat(rute) {
  const { el, lepas } = await pasang(rute)
  const tab = (n) => [...el.querySelectorAll('[role="tab"]')].find((t) => t.textContent.startsWith(n))
  const angka = (t) => Number(t.textContent.replace(/\D+/g, ''))
  const kartu = el.querySelector('[role="tablist"]').closest('section')
  const baris = () => [...kartu.querySelectorAll('ul > li')]

  const hasil = { jumlah: {} }
  for (const nama of ['Semua', 'Final', 'Sementara']) hasil.jumlah[nama] = angka(tab(nama))

  await klik(tab('Semua'))
  hasil.barisSemua = baris().length

  await klik(tab('Final'))
  hasil.barisFinal = baris().length
  hasil.finalSelaluDisetujui = baris().every((li) => /disetujui oleh/.test(li.textContent))

  await klik(tab('Sementara'))
  hasil.barisSementara = baris().length
  hasil.sementaraTidakDisetujui = baris().every(
    (li) => /belum dikunci/.test(li.textContent) && !/disetujui oleh/.test(li.textContent),
  )

  const lonceng = el.querySelector('button[aria-label$="komponen belum dinilai"]')
  hasil.lonceng = lonceng ? Number(lonceng.getAttribute('aria-label').match(/\d+/)[0]) : 0
  const m = el.textContent.match(/(\d+) komponen sudah dinilai dan (\d+) masih ditunggu/)
  hasil.kalimat = m ? { dinilai: Number(m[1]), ditunggu: Number(m[2]) } : null
  hasil.adaKoreksi = /Pengajuan koreksi saya/.test(el.textContent)

  lepas()
  return hasil
}

/* Beberapa mahasiswa nyata untuk menguji identitas sesi. */
export function daftarUji() {
  const pilih = (f) => STUDENTS.find(f)
  return [
    pilih((m) => m.id === 'DEMO-2'),
    pilih((m) => m.program === 'Perhotelan'),
    pilih((m) => m.program === 'Jurnalistik'),
  ].filter(Boolean)
}

/* Satu mahasiswa dari tiap angkatan — untuk cabang tampilan yang bergantung
   pada posisi semester (baru mulai, di tengah, di akhir, sudah tamat). */
export function perAngkatan() {
  const hasil = []
  for (const m of STUDENTS) {
    if (!hasil.some((x) => x.angkatanId === m.angkatanId)) hasil.push(m)
  }
  return hasil
}
