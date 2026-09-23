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
import UsulanAdmin from '../src/halaman/admin/Usulan'
import DosenLayout from '../src/halaman/dosen/DosenLayout'
import Masuk from '../src/halaman/dosen/Masuk'
import NilaiDosen from '../src/halaman/dosen/Nilai'
import UsulanDosen from '../src/halaman/dosen/Usulan'

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

const dosen = (isi) => (
  <RequireRole role="dosen">
    <DosenLayout>{isi}</DosenLayout>
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
  '/admin/usulan': { pohon: () => admin(<UsulanAdmin />) },
  '/dosen': { pohon: () => dosen(<Masuk />) },
  '/dosen/nilai': { pohon: () => dosen(<NilaiDosen />) },
  '/dosen/usulan': { pohon: () => dosen(<UsulanDosen />) },
  '/dosen/profil': { pohon: () => dosen(<Profil />) },
}

/* Memasang satu rute lengkap dengan penyedia konteks yang sama persis dengan
   app/layout.jsx — supaya uji tidak pernah memakai susunan provider sendiri
   yang diam-diam berbeda dari aplikasinya. */
async function pasang(rute) {
  /* Query string dilepas saat mencari pohonnya: '/admin/nilai?semester=3&...'
     tetap halaman yang sama, hanya sasarannya berbeda. */
  const entri = RUTE[String(rute).split('?')[0]]
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

/* Peristiwa penunjuk. jsdom belum punya PointerEvent, jadi dipakai MouseEvent
   yang ditempeli pointerId — React membaca peristiwa aslinya dari nama dan
   propertinya, bukan dari kelas pembungkusnya. */
const tunjuk = async (node, jenis, clientX) => {
  await act(async () => {
    const ev = new window.MouseEvent(jenis, {
      bubbles: true,
      cancelable: true,
      clientX,
      button: 0,
    })
    ev.pointerId = 1
    node?.dispatchEvent(ev)
  })
}

/* detail 0 meniru klik dari papan ketik atau .click() dari kode; 1 atau lebih
   meniru klik dari tetikus. Pemilih bahasa membedakan keduanya. */
const klik = async (node, detail = 0) => {
  await act(async () => {
    node?.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, detail }),
    )
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

/**
 * Lonceng panel Kemahasiswaan, dari ujung ke ujung.
 *
 * Bukan sekadar "panelnya terbuka": tautan salah satu barisnya diambil, lalu
 * halaman Input Nilai dibuka dengan alamat itu — dan diperiksa apakah
 * sasarannya benar-benar terisi sendiri. Itu janji fiturnya.
 */
export async function ujiLoncengAdmin() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  const lonceng = el.querySelector('button[aria-label$="hal menunggu ditangani"]')
  hasil.adaLonceng = !!lonceng
  hasil.angka = lonceng ? Number(lonceng.getAttribute('aria-label').match(/^\d+/)[0]) : 0
  const panel = () => el.querySelector('[role="dialog"][aria-label="Pekerjaan yang menunggu"]')
  hasil.panelTertutupAwal = !panel()

  await klik(lonceng)
  hasil.panelTerbuka = !!panel()
  const tautan = panel() ? [...panel().querySelectorAll('a')] : []
  hasil.jumlahBaris = tautan.length
  /* Tidak lagi semuanya ke halaman input: baris "Perlu ditinjau" menuju Data
     Mahasiswa dan Angkatan. Yang dijaga: tiap baris menuju SUATU halaman panel
     ini, tidak ada yang menggantung. */
  hasil.semuaPunyaTujuan = tautan.every((a) => a.getAttribute('href').startsWith('/admin/'))
  hasil.adaKoreksi = /Pengajuan koreksi/.test(panel()?.textContent ?? '')
  hasil.adaBelumDinilai = /Belum dinilai/.test(panel()?.textContent ?? '')
  /* Dua baris yang dipindahkan dari kartu "Requires Review". */
  hasil.adaPerluDitinjau = /Perlu ditinjau/.test(panel()?.textContent ?? '')
  hasil.adaAmbang = /belum berhak atas sertifikat/.test(panel()?.textContent ?? '')
  hasil.adaSiapDikunci = /siap dikunci/.test(panel()?.textContent ?? '')

  /* Tiga jenis tautan yang berbeda perlakuan:
     - koreksi  → membuka tab Pengajuan koreksi
     - tunggal  → kelompok yang tinggal satu mahasiswa, NIM-nya ikut dibawa
     - kelompok → sasaran input biasa */
  const semua = tautan.map((a) => a.getAttribute('href'))
  const keInput = semua.filter((h) => h.startsWith('/admin/nilai?'))
  hasil.tautanKoreksi = keInput.find((h) => h.includes('tab=koreksi')) ?? null
  hasil.tautanTunggal = keInput.find((h) => h.includes('cari=') && !h.includes('tab=koreksi')) ?? null
  hasil.tautanKelompok = keInput.find((h) => h.includes('semester=') && !h.includes('cari=') && !h.includes('tab=koreksi')) ?? null

  lepas()
  return hasil
}

/** Membuka halaman Input Nilai pada satu alamat, lalu melaporkan isinya. */
export async function ujiSasaranInput(alamat) {
  const { el, lepas } = await pasang(alamat)
  const teks = el.textContent
  const pilihan = [...el.querySelectorAll('select')].map((x) => x.value)
  const hasil = {
    teks,
    pilihan,
    semesterTerpilih: pilihan.find((v) => /^Semester \d$/.test(v)) ?? null,
    kotakCari: [...el.querySelectorAll('input')].map((x) => x.value).find((v) => /^\d{6,}$/.test(v)) ?? null,
    gerbangMasihTertutup: /Pilih semester terlebih dahulu/.test(teks),
  }
  lepas()
  return hasil
}

/**
 * Menyetujui satu pengajuan koreksi dengan benar-benar menekan tombolnya.
 *
 * Tombol ini pernah rusak diam-diam: penyimpanan berjalan serentak dan
 * mengembalikan boolean, tetapi pemanggilnya masih memakai .catch() seperti
 * pada Promise, sehingga sekali ditekan halaman melempar TypeError. Tidak ada
 * uji yang menangkapnya karena tidak ada yang pernah menekan tombolnya.
 */
export async function ujiKeputusanKoreksi(alamat) {
  /* Alamat lengkap, bukan sekadar ?tab=koreksi: area kerja halaman ini memang
     tertutup sampai semester dipilih — persis seperti tautan yang disusun
     lonceng. */
  const { el, lepas } = await pasang(alamat)

  const tombol = [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Setujui')
  const hasil = { adaTombol: tombol.length > 0, galat: null }

  /* Galat saat menekan tidak boleh ditelan diam-diam — itu justru yang diuji. */
  const asalOnError = window.onerror
  window.onerror = (pesan) => {
    hasil.galat = String(pesan)
    return true
  }
  try {
    await klik(tombol[0])
  } catch (e) {
    hasil.galat = e.message
  }
  window.onerror = asalOnError

  hasil.adaLencanaDisetujui = /Disetujui/.test(el.textContent)
  hasil.tombolnyaHilang =
    [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Setujui').length <
    tombol.length

  lepas()
  return hasil
}

/** Mengubah nilai sebuah <select> lewat peristiwa yang sama dengan pengguna. */
const pilih = async (el, nilai) => {
  const asli = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
  await act(async () => {
    asli.call(el, nilai)
    el.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
}

/** Mengetik ke sebuah <input> lewat peristiwa yang sama dengan pengguna. */
const ketik = async (el, nilai) => {
  const asli = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    asli.call(el, nilai)
    el.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}

/**
 * Halaman Input Nilai: memilih program studi harus menarik fakultasnya, dan
 * kolom Tanda hanya boleh hidup untuk baris yang benar-benar diisi.
 */
export async function ujiSasaranDanTanda(alamat, prodi, fakultasHarapan) {
  const { el, lepas } = await pasang(alamat)
  const hasil = {}

  const label = (teks) =>
    [...el.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(teks))
  const selectDi = (teks) => label(teks)?.querySelector('select')

  const selProdi = selectDi('Program studi')
  const selFakultas = selectDi('Fakultas')
  hasil.adaKeduaKotak = !!selProdi && !!selFakultas
  hasil.fakultasAwal = selFakultas?.value

  await pilih(selProdi, prodi)
  hasil.fakultasSesudah = selectDi('Fakultas')?.value
  hasil.fakultasIkut = hasil.fakultasSesudah === fakultasHarapan

  /* Identitas mahasiswa: nama saja tidak cukup untuk tahu prodi dan fakultasnya. */
  hasil.barisMenyebutProdi = new RegExp(prodi).test(el.textContent)

  const tombolTanda = () =>
    [...el.querySelectorAll('button')].filter((x) =>
      (x.getAttribute('aria-label') ?? '').startsWith('Tandai status untuk'),
    )
  hasil.adaKolomTanda = tombolTanda().length > 0
  hasil.tandaMatiSebelumDiisi = tombolTanda().every((x) => x.disabled)

  /* Pilihan status global sudah dibuang — status hanya ditentukan per baris. */
  hasil.tanpaPilihanGlobal = !/Status untuk nilai yang Anda simpan nanti|Ikuti aturan sistem/.test(
    el.textContent,
  )

  /* Isi satu sel nilai, lalu tanda pada baris ITU saja yang boleh menyala. */
  const kotakNilai = [...el.querySelectorAll('input[type="number"]')]
  if (kotakNilai.length) {
    await ketik(kotakNilai[0], '88')
    const sesudah = tombolTanda()
    hasil.tandaHidupSetelahDiisi = sesudah[0] && !sesudah[0].disabled
    hasil.tandaLainTetapMati = sesudah.slice(1).every((x) => x.disabled)

    /* Menunya baru muncul setelah pensilnya ditekan, dan isinya tepat dua. */
    hasil.menuTertutupAwal = !/tahan walau sudah lengkap/.test(el.textContent)
    await klik(sesudah[0])
    const menu = sesudah[0].closest('td')
    const pilihan = [...menu.querySelectorAll('button')]
      .map((b) => b.textContent)
      .filter((t) => /Sementara|Final/.test(t))
    hasil.jumlahPilihan = pilihan.length
    hasil.tanpaIkutiPilihan = !/Ikuti pilihan di atas/.test(menu.textContent)

    /* Menu harus MELAYANG, bukan menumpuk di dalam sel: kalau ia kembali
       mengalir di dalam tabel, tinggi barisnya ikut bertambah dan tepi tabel
       yang bisa digulir akan memotongnya. */
    const lapisan = [...menu.querySelectorAll('div')].find((d) => d.style.position === 'fixed')
    hasil.menuMelayang = !!lapisan
    hasil.menuBerkaca = !!lapisan && lapisan.className.split(' ').includes('kaca')
    hasil.menuBeranimasi = !!lapisan && lapisan.className.split(' ').includes('animate-kaca')
    hasil.selRataTengah = menu.className.includes('align-middle')

    const tombolFinal = [...menu.querySelectorAll('button')].find((b) =>
      b.textContent.startsWith('Final'),
    )
    await klik(tombolFinal)
    hasil.terpilihFinal = /Final/.test(tombolTanda()[0].textContent)
    hasil.menuTertutupSesudah = !/kunci, nilai berhenti berubah/.test(el.textContent)
  }

  lepas()
  return hasil
}

/**
 * Penyunting foto profil: dibuka dari foto yang sudah tersimpan, perbesarannya
 * bisa diubah, lalu hasilnya dipakai.
 *
 * Di jsdom tidak ada canvas, jadi potongFoto mengembalikan gambar asalnya —
 * yang diuji di sini alur dan kendalinya, bukan hasil pemotongannya.
 */
export async function ujiPenyuntingFoto(rute) {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  /* Dicari lewat aria-label, bukan teks yang terlihat: labelnya boleh berubah
     ("Atur posisi" → "Edit") tanpa membuat uji ini palsu gagal. */
  const tombolAtur = el.querySelector('button[aria-label="Edit foto profil"]')
  hasil.adaTombolAtur = !!tombolAtur
  const penyunting = () => el.querySelector('[aria-label="Atur foto"]')
  hasil.tertutupAwal = !penyunting()

  await klik(tombolAtur)
  const buka = penyunting()
  hasil.terbuka = !!buka
  hasil.adaAreaGeser = !!buka?.querySelector('[role="application"]')
  hasil.adaPenggeser = !!buka?.querySelector('input[type="range"]')
  hasil.persenAwal = /100% dari ukuran pas/.test(buka?.textContent ?? '')

  const penggeser = buka?.querySelector('input[type="range"]')
  if (penggeser) {
    const asli = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      asli.call(penggeser, '2')
      penggeser.dispatchEvent(new window.Event('change', { bubbles: true }))
    })
    hasil.persenBerubah = /200% dari ukuran pas/.test(penyunting()?.textContent ?? '')
  }

  const pakai = [...(penyunting()?.querySelectorAll('button') ?? [])].find((b) =>
    b.textContent.includes('Pakai foto ini'),
  )
  await klik(pakai)
  hasil.tertutupSesudah = !penyunting()
  hasil.adaPratinjau = /Siap disimpan/.test(el.textContent)

  lepas()
  return hasil
}

/**
 * Tombol "Segarkan data" di Data Mahasiswa.
 *
 * Yang diuji bukan keberadaan tombolnya, melainkan akibatnya: penanda waktu
 * baru muncul SETELAH ditekan. Kalau penandanya sudah ada sejak awal, tombol
 * itu hanya hiasan yang mengaku melakukan sesuatu.
 */
export async function ujiSegarkanData() {
  const { el, lepas } = await pasang('/admin/mahasiswa')
  const hasil = {}

  const tombol = [...el.querySelectorAll('button')].find((b) =>
    b.textContent.includes('Segarkan data'),
  )
  hasil.adaTombol = !!tombol
  hasil.tanpaPenandaAwal = !/Terakhir disegarkan/.test(el.textContent)

  await klik(tombol)
  hasil.adaPenandaSesudah = /Terakhir disegarkan \d{2}[.:]\d{2}/.test(el.textContent)

  /* Daftar mahasiswanya harus tetap utuh sesudah disegarkan — memuat ulang
     tidak boleh mengosongkan tabel. */
  hasil.daftarTetapAda = /mahasiswa · rata-rata/.test(el.textContent)

  lepas()
  return hasil
}

/**
 * Laci panel Kemahasiswaan: peta lengkap yang tersembunyi di balik garis tiga.
 *
 * Yang dijaga: garis tiganya tidak disembunyikan pada layar lebar (dulu
 * md:hidden, hanya muncul di ponsel), panelnya bernada gelap, dan tiga halaman
 * yang tidak ada di bilah atas tetap bisa ditemukan dari sini.
 */
export async function ujiLaciAdmin() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  const tombol = el.querySelector('button[aria-label="Buka menu navigasi"]')
  hasil.adaTombol = !!tombol
  hasil.tampilDiLayarLebar = !!tombol && !tombol.className.split(' ').includes('md:hidden')

  await klik(tombol)
  const panel = el.querySelector('[role="dialog"][aria-label="Menu navigasi"]')
  hasil.terbuka = !!panel
  hasil.panelGelap = !!panel && /bg-brand-deep/.test(panel.className)

  const teks = panel?.textContent ?? ''
  hasil.adaJudulKelompok = /Workspace/.test(teks) && /Rujukan/.test(teks)

  const tujuan = panel ? [...panel.querySelectorAll('a')].map((a) => a.getAttribute('href')) : []
  hasil.adaHalamanTersembunyi = ['/admin/kurikulum', '/admin/program-studi', '/admin/log'].every((h) =>
    tujuan.includes(h),
  )
  hasil.adaPenandaAktif = !!panel?.querySelector('[aria-current="page"]')

  lepas()
  return hasil
}

/**
 * Penanda "Terakhir diperbarui" di panel Kemahasiswaan.
 *
 * Yang dijaga bukan sekadar teksnya muncul, melainkan bahwa ia MENGIKUTI data:
 * begitu ada perubahan, jam yang tertulis ikut bergeser. Penanda yang diam
 * saat datanya berubah justru berbahaya — ia meyakinkan pembacanya bahwa yang
 * di layar sudah mutakhir padahal belum.
 */
export async function ujiStatusData() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  const baris = () => {
    const t = el.textContent
    const m = t.match(/Terakhir diperbarui [^·]+/)
    return m ? m[0].trim() : null
  }

  hasil.adaPenanda = !!baris()
  hasil.adaZona = /WIB/.test(el.textContent)
  hasil.adaRelatif = /baru saja|menit lalu|jam lalu/.test(el.textContent)
  hasil.adaTombolSegarkan = !!el.querySelector('button[aria-label="Segarkan data sekarang"]')

  /* Ubah data lewat jalur yang sebenarnya — menyimpan satu nilai — lalu
     pastikan penandanya bergeser. Jangan bergantung pada adanya pengajuan
     koreksi yang menunggu: uji sebelumnya mungkin sudah memutuskan semuanya. */
  const { terakhirDiperbarui, simpanBatch } = await import('../src/lib/store')
  const { getAspekSemester, getKomponen } = await import('../src/lib/curriculum')
  const { STUDENTS } = await import('../src/lib/mockData')

  const sebelum = terakhirDiperbarui().getTime()
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5))
  })

  const mhs = STUDENTS.find((m) => m.semesterAktif >= 1)
  const aspek = getAspekSemester(1)[0]
  const komponen = getKomponen(aspek.id)[0]
  await act(async () => {
    simpanBatch({
      sumber: komponen.sumber,
      semester: 1,
      angkatanId: mhs.angkatanId,
      aktor: 'Uji',
      cara: 'manual',
      entri: [{ nim: mhs.nim, komponenId: komponen.id, nilai: 81 }],
    })
  })

  hasil.bergeserSaatDataBerubah = terakhirDiperbarui().getTime() > sebelum

  lepas()
  return hasil
}

/**
 * Dua bagian Ringkasan yang dilipat di ponsel.
 *
 * Yang dijaga: keduanya terlipat saat dibuka di layar kecil, membentang setelah
 * ditekan, DAN tetap membawa kelas sm: — tanpa itu, melipatnya akan ikut
 * terbawa ke layar lebar dan justru menambah satu ketukan di sana.
 */
export async function ujiLipatOverview() {
  const { el, lepas } = await pasang('/admin')
  const hasil = {}

  /* ---------------------------- angka utama ------------------------------ */
  /* Kartu pertama selalu terlihat; dua sisanya dilipat di baliknya, persis
     pola kartu "Nilai akhir" di panel mahasiswa. */
  const kakiAngka = el.querySelector('button[aria-controls="angka-lain"]')
  const wadahAngka = () => el.querySelector('#angka-lain')

  hasil.angka = {
    adaKaki: !!kakiAngka,
    kakiKhususPonsel: !!kakiAngka && kakiAngka.className.split(' ').includes('sm:hidden'),
    ringkasTertulis: !!kakiAngka && /rata-rata/.test(kakiAngka.textContent),
    kartuPertamaTetapTampil: /Mahasiswa terpantau/.test(el.textContent),
    terlipatAwal: !!wadahAngka() && wadahAngka().className.split(' ').includes('hidden'),
    tetapUtuhDiLayarLebar: !!wadahAngka() && wadahAngka().className.includes('sm:contents'),
  }
  await klik(kakiAngka)
  hasil.angka.terbukaSetelahDitekan = wadahAngka()?.className.split(' ').includes('grid') ?? false

  /* ----------------------------- more pages ------------------------------ */
  const tombolHalaman = el.querySelector('button[aria-controls="halaman-lain"]')
  const kartuTersembunyi = () =>
    [...el.querySelectorAll('#halaman-lain > li')].filter((li) =>
      li.className.split(' ').includes('hidden'),
    ).length

  hasil.halaman = {
    adaTombol: !!tombolHalaman,
    tombolKhususPonsel:
      !!tombolHalaman && tombolHalaman.closest('li').className.split(' ').includes('sm:hidden'),
    /* Jumlahnya dihitung dari daftar itu sendiri: satu kartu selalu terlihat,
       sisanya terlipat. Menuliskan angkanya sebagai tetapan membuat uji ini
       pecah setiap kali ada halaman baru ditambahkan — padahal yang ingin
       dijaga adalah perilakunya, bukan banyaknya kartu. */
    terlipatAwal: kartuTersembunyi() === el.querySelectorAll('#halaman-lain > li').length - 2,
    /* Dicocokkan per kata, bukan per potongan teks: 'sm:hidden' pada baris
       tombol mengandung kata 'hidden' tetapi bukan kelas yang dimaksud. */
    tetapUtuhDiLayarLebar: [...el.querySelectorAll('#halaman-lain > li')].every((li) => {
      const kelas = li.className.split(' ')
      return !kelas.includes('hidden') || kelas.includes('sm:block')
    }),
  }
  await klik(tombolHalaman)
  hasil.halaman.tidakAdaYangTersembunyiSesudah = kartuTersembunyi() === 0

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Pemilih bahasa dan layanan bantuan di ketiga panel.

   Dua keputusan yang dijaga di sini, dan keduanya mudah sekali hilang saat
   kerangka panel disentuh lagi nanti:

   - Pemilih bahasa ada di SEMUA panel. Kalau hanya dipasang di satu kerangka,
     dua panel lain akan terkunci di Indonesia tanpa ada yang menyadarinya.
   - Tombol bantuan ada di panel mahasiswa dan dosen, TIDAK di panel
     Kemahasiswaan. Merekalah yang menjawab pertanyaan itu, jadi tombol yang
     menautkan mereka ke diri sendiri tidak menuju ke mana pun.
   -------------------------------------------------------------------------- */
export async function ujiPanelLain(rute) {
  /* Pilihan bahasa bertahan di penyimpanan. Tanpa dibersihkan, panel kedua
     sudah berbahasa Inggris sejak dibuka dan menekan EN tidak mengubah apa
     pun — uji ini akan gagal karena keadaan sisa, bukan karena ada yang rusak. */
  try {
    localStorage.removeItem('sk5c.bahasa')
  } catch {
    /* diabaikan */
  }

  const { el, lepas } = await pasang(rute)
  const hasil = {
    adaPemilihBahasa: Boolean(el.querySelector('[role="group"][aria-label]')),
    adaTombolBantuan: Boolean(el.querySelector('button[aria-controls="panel-layanan"]')),
  }

  /* Menekan EN harus benar-benar mengganti isi halaman, bukan hanya bilahnya. */
  const en = [...el.querySelectorAll('[role="group"][aria-label] button')].find(
    (b) => b.textContent.trim() === 'EN',
  )
  const sebelum = el.textContent
  await klik(en, 0)
  hasil.isiIkutBerganti = el.textContent !== sebelum

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Layanan tambahan yang mengambang.

   Yang dijaga di sini bukan rupanya, melainkan janji-janji kecil yang mudah
   sekali hilang tanpa ketahuan: tombolnya benar-benar mengambang (bukan ikut
   tergulir), tidak ikut tercetak, tautannya menunjuk ke kontak yang benar, dan
   tautan keluar tidak membocorkan window.opener.
   -------------------------------------------------------------------------- */
export async function ujiLayanan(rute = '/mahasiswa') {
  const { el, lepas } = await pasang(rute)
  const hasil = {}

  const tombol = el.querySelector('button[aria-controls="panel-layanan"]')
  const panel = () => el.querySelector('#panel-layanan')
  const wadah = tombol?.parentElement

  hasil.adaTombol = Boolean(tombol)
  hasil.mengambang = Boolean(wadah && wadah.className.split(' ').includes('fixed'))
  hasil.takIkutTercetak = Boolean(wadah && wadah.className.includes('print:hidden'))
  /* Harus di bawah laci navigasi yang z-50, kalau tidak ia akan mengambang di
     atas lapisan gelapnya saat laci dibuka. */
  hasil.diBawahLaci = Boolean(wadah && wadah.className.split(' ').includes('z-40'))
  hasil.tertutupAwal = panel() === null
  hasil.menyebutKeadaan = tombol?.getAttribute('aria-expanded') === 'false'

  await klik(tombol)
  hasil.terbuka = panel() !== null
  hasil.keadaanIkutBerubah = tombol?.getAttribute('aria-expanded') === 'true'

  const tautan = [...(panel()?.querySelectorAll('a') ?? [])]
  hasil.tigaSaluran = tautan.length === 3
  const href = tautan.map((a) => a.getAttribute('href') ?? '')
  hasil.adaWhatsapp = href.some((h) => h.startsWith('https://wa.me/'))
  hasil.adaTelepon = href.some((h) => h.startsWith('tel:'))
  hasil.adaSurel = href.some((h) => h.startsWith('mailto:'))
  /* Nomor tel: tidak boleh memuat spasi, sebagian peramban menolaknya. */
  hasil.telSah = href.filter((h) => h.startsWith('tel:')).every((h) => !/\s/.test(h))

  const keluar = tautan.filter((a) => a.getAttribute('target') === '_blank')
  hasil.tautanKeluarAman =
    keluar.length > 0 && keluar.every((a) => (a.getAttribute('rel') ?? '').includes('noopener'))

  hasil.adaJamLayanan = /08\.00/.test(panel()?.textContent ?? '')
  hasil.berkaca = Boolean(panel() && panel().className.split(' ').includes('kaca'))
  hasil.berurutanMasuk = [...(panel()?.querySelectorAll('.layanan-item') ?? [])].some(
    (li) => li.style.animationDelay && li.style.animationDelay !== '0ms',
  )

  /* Escape menutup, dan fokus kembali ke tombolnya. */
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  hasil.escMenutup = panel() === null

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Menyeret pil pemilih bahasa.

   Yang diuji di sini perilakunya, bukan rupanya: pil boleh ditahan lalu
   diseret, seretan yang tidak sampai separuh jalan kembali ke tempat semula,
   dan seretan tidak boleh terhitung dua kali oleh klik yang menyusul.
   -------------------------------------------------------------------------- */
export async function ujiSeretBahasa() {
  try {
    localStorage.removeItem('sk5c.bahasa')
  } catch {
    /* diabaikan */
  }

  const { el, lepas } = await pasang('/mahasiswa')
  const hasil = {}

  const grup = el.querySelector('[role="group"][aria-label]')
  const pil = grup?.querySelector('[aria-hidden="true"]')
  const inggris = () => /Final score/.test(el.textContent)

  /* jsdom tidak menata letak, jadi getBoundingClientRect-nya selalu nol.
     Kendalinya dipalsukan berada di x = 100 selebar 74 px, supaya perhitungan
     "jari dilepas di segmen mana" benar-benar diuji, bukan dilewati. */
  grup.getBoundingClientRect = () => ({
    left: 100, right: 174, top: 0, bottom: 34, width: 74, height: 34, x: 100, y: 0,
  })
  const KIRI = 118 // di dalam segmen ID
  const KANAN = 155 // di dalam segmen EN

  hasil.adaPil = Boolean(pil)
  hasil.pilBerkaca = Boolean(pil && pil.className.split(' ').includes('pil-kaca'))
  hasil.mulaiDiKiri = Boolean(pil && pil.style.transform.includes('translateX(0px)'))

  /* Satu ketukan tetikus utuh: turun dan naik di titik yang sama. */
  const ketuk = async (x) => {
    await tunjuk(grup, 'pointerdown', x)
    await tunjuk(grup, 'pointerup', x)
  }

  /* ---- 1. KLIK BIASA, lalu klik susulan dari peramban. ---- */
  await ketuk(KANAN)
  hasil.klikBiasaMengganti = inggris()
  await klik(grup, 1)
  hasil.klikSusulanDiabaikan = inggris()

  /* ---- 2. Klik biasa kembali ke segmen kiri. ---- */
  await ketuk(KIRI)
  hasil.klikBiasaBisaKembali = !inggris()

  /* ---- 3. PAPAN KETIK. Klik ber-detail 0 datang dari Enter atau Spasi, dan
     harus tetap dilayani onClick tombolnya. Diuji di sini, setelah ketukan
     biasa — bukan setelah seretan, karena seretan memang sengaja menelan satu
     klik susulan dan itu perilaku yang benar. ---- */
  await klik(grup.querySelectorAll('button')[1], 0)
  hasil.papanKetikJalan = inggris()

  await ketuk(KIRI)

  /* ---- 4. SERET penuh ke kanan lalu lepas. ---- */
  await tunjuk(grup, 'pointerdown', KIRI)
  await tunjuk(grup, 'pointermove', KIRI + 40)
  hasil.pilIkutJari = Boolean(pil && !pil.style.transform.includes('translateX(0px)'))
  hasil.transisiMatiSaatDiseret = Boolean(pil && pil.style.transition.includes('.12s'))
  await tunjuk(grup, 'pointerup', KIRI + 40)
  hasil.seretMengganti = inggris()
  hasil.transisiPulih = Boolean(pil && pil.style.transition.includes('.42s'))

  /* ---- 5. Klik susulan sesudah SERETAN mendarat di tombol asal, dan harus
     diabaikan walau detail-nya 0 (perilaku peramban ponsel). ---- */
  await klik(grup.querySelector('button'), 0)
  hasil.seretTakDibalikSentuhan = inggris()

  /* ---- 6. Seret pendek dari EN: belum melewati separuh, tetap di EN. ---- */
  await tunjuk(grup, 'pointerdown', KANAN)
  await tunjuk(grup, 'pointermove', KANAN - 10)
  await tunjuk(grup, 'pointerup', KANAN - 10)
  hasil.seretPendekKembali = inggris()

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Pemilih bahasa.

   Yang diuji bukan isi kamusnya, melainkan MEKANISMENYA: bahwa halaman benar
   benar berganti bahasa saat tombolnya ditekan, bahwa pilihannya tersimpan,
   dan bahwa render pertama selalu Indonesia — sebab render pertama di peramban
   harus sama persis dengan HTML dari server, kalau tidak React menolak
   hidrasinya.
   -------------------------------------------------------------------------- */
export async function ujiBahasa() {
  try {
    localStorage.removeItem('sk5c.bahasa')
  } catch {
    /* diabaikan */
  }

  const { el, lepas } = await pasang('/mahasiswa')
  const hasil = {}

  const tombol = (kode) =>
    [...el.querySelectorAll('[role="group"][aria-label] button')].find(
      (b) => b.textContent.trim() === kode,
    )

  const teks = () => el.textContent

  hasil.adaPemilih = Boolean(tombol('ID') && tombol('EN'))
  hasil.mulaiIndonesia = tombol('ID')?.getAttribute('aria-pressed') === 'true'
  hasil.isiIndonesia = /Nilai akhir/.test(teks()) && !/Final score/.test(teks())

  await klik(tombol('EN'))
  hasil.inggrisAktif = tombol('EN')?.getAttribute('aria-pressed') === 'true'
  hasil.isiInggris = /Final score/.test(teks()) && /Aspects graded/.test(teks())
  hasil.judulIkutBerganti = /Assessment aspects/.test(teks())
  hasil.menuIkutBerganti = /Road Map/.test(teks())
  hasil.tersimpan = (() => {
    try {
      return localStorage.getItem('sk5c.bahasa') === 'en'
    } catch {
      return false
    }
  })()
  hasil.langDiperbarui = document.documentElement.lang === 'en'

  /* Penanda {dalamKurung} harus terisi, bukan tampil mentah. */
  hasil.penandaTerisi = !/\{(?:n|total|final|keadaan|periode)\}/.test(teks())

  await klik(tombol('ID'))
  hasil.kembaliIndonesia = /Nilai akhir/.test(teks()) && !/Final score/.test(teks())

  lepas()
  return hasil
}

/* --------------------------------------------------------------------------
   Alur lengkap dosen → Kemahasiswaan.

   Yang diuji bukan tampilannya, melainkan JANJI yang dibuat panel dosen:
   nilai yang dikirim TIDAK boleh menyentuh transkrip sebelum disetujui.
   Karena itu tiap langkah diperiksa terhadap data mahasiswa yang sebenarnya,
   bukan terhadap tulisan di layar.
   -------------------------------------------------------------------------- */
export async function ujiAlurDosen() {
  const { DOSEN, pengumpulanDosen, getStudentByNim } = await import('../src/lib/mockData')
  const { statusPengumpulan, usulkanNilai, putuskanUsulan, usulanMenunggu } = await import(
    '../src/lib/store'
  )

  const d = DOSEN[0]
  const nilaiTersimpan = (p) =>
    getStudentByNim(p.nim)?.nilai?.[p.aspekId]?.komponen?.[p.komponenId]?.nilai ?? null

  const antre = pengumpulanDosen(d.nip)
    .filter((p) => statusPengumpulan(p).id === 'masuk')
    .slice(0, 3)

  const hasil = { adaAntrean: antre.length === 3 }

  /* 1. Dosen mengusulkan. */
  const u = usulkanNilai({
    dosen: d,
    cara: 'manual',
    catatan: 'uji alur',
    entri: antre.map((p) => ({ nim: p.nim, komponenId: p.komponenId, nilai: 88 })),
  })
  hasil.usulanTercatat = u.status === 'menunggu' && u.entri.length === 3
  hasil.belumMasukTranskrip = antre.every((p) => nilaiTersimpan(p) === null)
  hasil.statusJadiMenunggu = antre.every((p) => statusPengumpulan(p).id === 'menunggu')
  hasil.masukAntreanAdmin = usulanMenunggu().some((x) => x.id === u.id)

  /* 2. Kemahasiswaan menyetujui. */
  hasil.disetujui = putuskanUsulan(u.id, 'disetujui', { aktor: 'Uji' }) === true
  hasil.masukTranskrip = antre.every((p) => nilaiTersimpan(p) === 88)
  hasil.statusJadiDinilai = antre.every((p) => statusPengumpulan(p).id === 'dinilai')
  hasil.punyaBatch = Boolean(u.batchId)
  hasil.tidakBisaDiputusDuaKali = putuskanUsulan(u.id, 'ditolak', { aktor: 'Uji' }) === false

  /* 3. Penolakan tidak mengubah apa pun. */
  const lagi = pengumpulanDosen(d.nip)
    .filter((p) => statusPengumpulan(p).id === 'masuk')
    .slice(0, 2)
  const u2 = usulkanNilai({
    dosen: d,
    entri: lagi.map((p) => ({ nim: p.nim, komponenId: p.komponenId, nilai: 70 })),
  })
  putuskanUsulan(u2.id, 'ditolak', { aktor: 'Uji', catatan: 'perlu diperbaiki' })
  hasil.tolakTidakMenulis = lagi.every((p) => nilaiTersimpan(p) === null)
  hasil.statusJadiDitolak = lagi.every((p) => statusPengumpulan(p).id === 'ditolak')

  /* 4. Sistem menahan baris yang melanggar aturan. */
  const u3 = usulkanNilai({
    dosen: d,
    entri: [{ nim: '999999999', komponenId: antre[0].komponenId, nilai: 90 }],
  })
  try {
    putuskanUsulan(u3.id, 'disetujui', { aktor: 'Uji' })
    hasil.sistemMenahan = false
  } catch {
    hasil.sistemMenahan = true
  }
  hasil.tetapMenunggu = u3.status === 'menunggu'

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
