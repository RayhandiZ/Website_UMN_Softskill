import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TautanNav } from '../lib/nav'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import Laci from './Laci'
import MenuAkun from './MenuAkun'
import { IconLogo, IconMenu, IconMoon, IconSun } from './Icons'

/* Bilah atas panel Kemahasiswaan. Panel mahasiswa memakai kerangka sendiri
   (sidebar + bilah terang) — lihat StudentLayout.

   Setiap kendali di sini harus menuju ke suatu tempat. Tombol pesan dibuang
   karena fitur pesan memang belum ada. Lonceng tidak lagi dibangun di sini,
   melainkan dikirim lewat prop `aksi` — isinya pekerjaan khas panel ini, dan
   kerangkanya tidak perlu tahu apa-apa tentang itu.

   Di bawah 768px tautan navigasi pindah ke laci: berjejer mendatar, tiga tautan
   sudah cukup untuk memotong judulnya di tengah kata pada layar 390px, dan
   menggulirkannya ke samping menyembunyikan tautan terakhir tanpa petunjuk apa
   pun bahwa ia ada.

   Fotonya DITERIMA dari layout, bukan dicari sendiri: yang tahu persis siapa
   pemilik sesi adalah layout, dan dua tempat yang menyusun kunci akun sendiri-
   sendiri bisa berbeda untuk orang yang sama. */
export default function Navbar({ links = [], aksi = null, foto = null }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const router = useRouter()
  const [laci, setLaci] = useState(false)

  const profilKe = user?.role === 'admin' ? '/admin/profil' : '/mahasiswa/profil'

  return (
    <header className="sticky top-0 z-40 bg-brand text-white">
      {/* Bilah ini sengaja TIDAK ikut max-w-shell seperti isi halaman: sebagai
          bilah tempel yang membentang penuh, kedua ujungnya memang menempel ke
          tepi. Sisa px-4/px-6 hanya jarak aman agar tidak menyentuh bingkai. */}
      <div className="flex h-[64px] w-full items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setLaci(true)}
          aria-label="Buka menu navigasi"
          aria-expanded={laci}
          className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white transition hover:bg-white/10 md:hidden"
        >
          <IconMenu size={23} />
        </button>

        <Link href="/" className="flex items-center gap-2.5 text-white">
          <IconLogo size={40} />
          <span className="hidden text-[15px] font-extrabold tracking-tight sm:block">
            UMN <span className="text-[var(--accent)]">SOFTSKILL</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:ml-6 md:flex">
          {links.map((l) => (
            <TautanNav
              key={l.to}
              href={l.to}
              end={l.end}
              className={({ isActive }) =>
                'whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-bold transition ' +
                (isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')
              }
            >
              {l.label}
            </TautanNav>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {aksi}

          <span className="mx-1.5 hidden h-6 w-px bg-white/20 sm:block" />

          <MenuAkun foto={foto} tone="onbrand" />

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="ml-1 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
        </div>
      </div>

      <Laci buka={laci} onTutup={() => setLaci(false)}>
        <nav className="py-2">
          {links.map((l) => (
            <TautanNav
              key={l.to}
              href={l.to}
              end={l.end}
              onClick={() => setLaci(false)}
              className={({ isActive }) =>
                'block px-5 py-3.5 text-[16px] font-bold transition ' +
                (isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-surface-2')
              }
            >
              {l.label}
            </TautanNav>
          ))}

          <span className="my-2 block h-px bg-line" />

          <Link
            href={profilKe}
            onClick={() => setLaci(false)}
            className="block px-5 py-3.5 text-[16px] font-bold text-ink transition hover:bg-surface-2"
          >
            Profil
          </Link>
          <button
            type="button"
            onClick={() => {
              setLaci(false)
              logout()
              router.replace('/masuk')
            }}
            className="block w-full px-5 py-3.5 text-left text-[16px] font-bold text-[var(--critical)] transition hover:bg-surface-2"
          >
            Keluar
          </button>
        </nav>
      </Laci>
    </header>
  )
}
