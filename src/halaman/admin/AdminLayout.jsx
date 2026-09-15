import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useAuth } from '../../lib/auth'
import { IconBuilding, IconCertificate, IconUpload, IconUsers } from '../../components/Icons'
import { PERIODE_AKTIF, labelPeriode } from '../../lib/mockData'
import { useStore } from '../../lib/store'
import { kunciSesi, useProfil } from '../../lib/profil'
import LoncengKemahasiswaan from './LoncengKemahasiswaan'

/* Pintasan footer menunjuk ke halaman yang memang ada, bukan tautan hiasan. */
const PINTASAN = [
  { ke: '/admin/mahasiswa', label: 'Data Mahasiswa', icon: IconUsers },
  { ke: '/admin/nilai', label: 'Input Nilai', icon: IconUpload },
  { ke: '/admin/program-studi', label: 'Program Studi', icon: IconBuilding },
  { ke: '/admin/angkatan', label: 'Sertifikat', icon: IconCertificate },
]

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/mahasiswa', label: 'Mahasiswa' },
  { to: '/admin/nilai', label: 'Nilai' },
  { to: '/admin/angkatan', label: 'Angkatan' },
]

export default function AdminLayout({ children }) {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const { admin, user } = useAuth()
  const { foto } = useProfil(kunciSesi(user))

  /* Tanpa kolom kiri sama sekali.

     Kartu identitas unit dan menu sampingnya sudah dibuang: menunya cuma
     mengulang bilah atas dan kartu "Halaman lain", sedangkan kartu identitas
     memakan 280 piksel hanya untuk tiga baris teks yang tidak pernah berubah.
     Isi halaman kini memakai seluruh lebar.

     Satu hal dari kartu itu tetap dipertahankan sebagai baris kecil di bawah:
     PERIODE. Angka seperti "290 mahasiswa" atau "rata-rata 80" tidak punya
     makna kalau pembacanya tidak tahu itu periode yang mana — apalagi setelah
     halaman ini dicetak. Nama pejabat yang menandatangani tidak diulang di
     sini karena sudah ada di menu avatar bilah atas. */

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar links={NAV} aksi={<LoncengKemahasiswaan />} foto={foto} />

      <main className="mx-auto w-full max-w-shell flex-1 px-4 py-7 sm:px-6">
        <p className="mb-5 text-[13.5px] text-ink-2">
          {admin.name} · Periode {labelPeriode(PERIODE_AKTIF)}
        </p>

        <div className="min-w-0">{children}</div>
      </main>

      <Footer pintasan={PINTASAN} />
    </div>
  )
}
