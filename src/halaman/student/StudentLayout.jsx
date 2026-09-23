import { createContext, useContext, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TautanNav } from '../../lib/nav'
import Footer from '../../components/Footer'
import Laci from '../../components/Laci'
import MenuAkun from '../../components/MenuAkun'
import TombolBahasa from '../../components/TombolBahasa'
import LayananTambahan from '../../components/LayananTambahan'
import {
  IconCertificate,
  IconDocument,
  IconGauge,
  IconList,
  IconLogo,
  IconMenu,
  IconMoon,
  IconRoute,
  IconSun,
} from '../../components/Icons'
import { getStudent, personaAktif, transkripOf } from '../../lib/mockData'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { useTeks } from '../../lib/bahasa'
import { kunciSesi, useProfil } from '../../lib/profil'
import LoncengBelumDinilai from './LoncengBelumDinilai'

/* --------------------------------------------------------------------------
   Kerangka panel mahasiswa.

   Sengaja BERBEDA dari panel Kemahasiswaan dan dari E-Learning: bukan bilah
   biru pekat di atas dengan kartu profil di kiri, melainkan sidebar terang yang
   mengambang di kiri, bilah atas yang menyatu dengan latar, dan kartu-kartu
   bersudut lebar dengan bayangan pudar.

   Yang diambil dari rujukan hanya suasananya — lapang, lembut, satu fokus per
   baris. Aksesorisnya tidak: tidak ada kotak pencarian (tidak ada yang perlu
   dicari di sepuluh aspek), tidak ada kalender (program ini tidak punya tenggat
   yang diketahui aplikasi), tidak ada ikon tiga dimensi, tidak ada kartu
   promosi. Setiap unsur di layar harus menjawab pertanyaan mahasiswa tentang
   nilainya sendiri.

   Kartu profil di kolom kiri versi lama dibuang: nama dan NIM pindah ke tombol
   akun di kanan atas, nilai akhir pindah ke ubin pertama dashboard. Menu
   samping yang dulu menumpuk di atas isi pada layar kecil kini tinggal di laci
   garis tiga, jadi tidak lagi mendorong nilai ke bawah lipatan.
   -------------------------------------------------------------------------- */

/* Pintasan footer menunjuk ke halaman yang memang ada, bukan tautan hiasan. */
const PINTASAN = [
  { ke: '/mahasiswa/transkrip', label: 'Transkrip', icon: IconDocument },
  { ke: '/mahasiswa/peta', label: 'Peta Perjalanan', icon: IconRoute },
  { ke: '/mahasiswa/riwayat', label: 'Riwayat', icon: IconList },
  { ke: '/mahasiswa/sertifikat', label: 'Sertifikat', icon: IconCertificate },
]

const MENU = [
  { to: '/mahasiswa', label: 'Dashboard', icon: IconGauge, end: true },
  { to: '/mahasiswa/transkrip', label: 'Transkrip', icon: IconDocument },
  { to: '/mahasiswa/peta', label: 'Peta Perjalanan', icon: IconRoute },
  { to: '/mahasiswa/riwayat', label: 'Riwayat', icon: IconList },
  { to: '/mahasiswa/sertifikat', label: 'Sertifikat', icon: IconCertificate },
]

/* Konteks mahasiswa aktif.

   react-router mengalirkan data ke halaman anak lewat context milik Outlet; di
   Next layout dan halaman adalah dua modul terpisah, jadi jalurnya dibuat
   eksplisit dengan React context. Halaman anak tetap memanggil useStudent()
   seperti sebelumnya. */
const KonteksMahasiswa = createContext(null)

export const useStudent = () => useContext(KonteksMahasiswa)

/* Daftar menu — dipakai sidebar dan laci, supaya keduanya tidak pernah berbeda
   isi. Penanda aktif berupa latar biru muda dengan teks biru tua (rasio kontras
   di atas 9:1), lebih lembut daripada isian pekat panel Kemahasiswaan tetapi
   tetap terbaca sekali lihat. */
function DaftarMenu({ onPilih, besar = false }) {
  const t = useTeks()
  return (
    <ul className="space-y-1">
      {MENU.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <TautanNav
            href={to}
            end={end}
            onClick={onPilih}
            className={({ isActive }) =>
              'flex items-center gap-3 rounded-2xl px-3.5 font-bold transition ' +
              (besar ? 'py-3.5 text-[16px] ' : 'py-3 text-[14.5px] ') +
              (isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')
            }
          >
            <Icon size={20} className="shrink-0" />
            <span className="truncate">{t(label)}</span>
          </TautanNav>
        </li>
      ))}
    </ul>
  )
}

function TombolTema() {
  const { theme, toggle } = useTheme()
  const t = useTeks()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t(theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap')}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition hover:text-ink"
    >
      {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  )
}

export default function StudentLayout({ children }) {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const { user, logout } = useAuth()
  const teks = useTeks()
  const router = useRouter()
  const [laci, setLaci] = useState(false)

  /* Yang tampil adalah mahasiswa yang sedang masuk. personaAktif() hanya
     jaring pengaman bila sesi lama belum menyimpan studentId. */
  const student = getStudent(user?.studentId) ?? personaAktif()
  const { foto } = useProfil(kunciSesi(user, student.nim))
  const t = transkripOf(student)

  return (
    <div className="min-h-screen bg-bg lg:pl-[264px] print:pl-0">
      {/* print:pl-0 wajib: sidebar disembunyikan saat mencetak, dan tanpa ini
          transkrip cetakan tetap bergeser 264 px ke kanan lalu terpotong. */}
      {/* -------------------------------- sidebar ------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] p-4 pr-0 lg:block print:hidden">
        <div className="kartu flex h-full flex-col px-3 py-5">
          <Link href="/mahasiswa" className="mb-7 flex items-center gap-2.5 px-2.5">
            <IconLogo size={36} />
            <span className="text-[15px] font-extrabold tracking-tight text-ink">
              UMN <span className="text-[var(--accent)]">SOFTSKILL</span>
            </span>
          </Link>

          <nav aria-label={teks('Menu mahasiswa')}>
            <DaftarMenu />
          </nav>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* ------------------------------ bilah atas ----------------------------- */}
        {/* Bilah atas sengaja tembus pandang tipis dengan kabur yang ringan: isi
            halaman terlihat samar lewat di bawahnya, tapi tidak sampai
            mengganggu. 74% masih menyisakan kontras 7,37:1 pada kasus terburuk
            — bilah gelap yang dilewati kartu putih — jauh di atas ambang 4,5:1. */}
        <header className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] backdrop-blur-sm print:hidden">
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setLaci(true)}
              aria-label={teks('Buka menu navigasi')}
              aria-expanded={laci}
              className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-ink transition hover:bg-surface lg:hidden"
            >
              <IconMenu size={23} />
            </button>

            <Link href="/mahasiswa" className="flex items-center gap-2 lg:hidden">
              <IconLogo size={32} />
              <span className="hidden text-[14px] font-extrabold tracking-tight text-ink sm:block">
                UMN <span className="text-[var(--accent)]">SOFTSKILL</span>
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <LoncengBelumDinilai t={t} />
              <TombolBahasa nada="terang" />
              <TombolTema />
              <MenuAkun
                foto={foto}
                tone="terang"
                rinci={{ judul: student.name, sub: student.nim + ' · ' + student.program }}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <KonteksMahasiswa.Provider value={student}>{children}</KonteksMahasiswa.Provider>
        </main>

        <Footer pintasan={PINTASAN} />
      </div>

      {/* Tombol bantuan mengambang. Diletakkan di kerangka, bukan di tiap
          halaman, supaya ia ada di mana pun mahasiswa berada. */}
      <LayananTambahan />

      {/* --------------------------- laci layar kecil -------------------------- */}
      <Laci buka={laci} onTutup={() => setLaci(false)}>
        <nav aria-label={teks('Menu mahasiswa')} className="p-3">
          <DaftarMenu besar onPilih={() => setLaci(false)} />

          <span className="my-3 block h-px bg-line" />

          <Link
            href="/mahasiswa/profil"
            onClick={() => setLaci(false)}
            className="block rounded-2xl px-3.5 py-3.5 text-[16px] font-bold text-ink transition hover:bg-surface-2"
          >
            {teks('Profil')}
          </Link>
          <button
            type="button"
            onClick={() => {
              setLaci(false)
              logout()
              router.replace('/masuk')
            }}
            className="block w-full rounded-2xl px-3.5 py-3.5 text-left text-[16px] font-bold text-[var(--critical)] transition hover:bg-surface-2"
          >
            {teks('Keluar')}
          </button>
        </nav>
      </Laci>
    </div>
  )
}
