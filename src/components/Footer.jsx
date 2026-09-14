import Link from 'next/link'
import { IconChat, IconLogo, IconMail, IconPhone } from './Icons'

/* --------------------------------------------------------------------------
   Footer mengikuti susunan E-Learning UMN: pintasan berikon di kiri, alamat
   helpdesk di tengah, kontak di sebelahnya, identitas unit di kanan, lalu satu
   baris hak cipta di bawah garis.

   Dua hal sengaja berbeda dari rujukannya:

   1. Pintasan menunjuk ke halaman yang BENAR-BENAR ada di aplikasi ini, dan
      berbeda antara panel mahasiswa dan panel Kemahasiswaan. Versi footer
      sebelumnya memuat empat tombol yang tidak menuju ke mana pun, dan kendali
      mati lebih membingungkan daripada tidak ada sama sekali.
   2. Alamat dan kontaknya milik Biro Kemahasiswaan & Humaniora, bukan menyalin
      helpdesk E-Learning — menyalinnya akan menyesatkan orang yang menghubungi.
   -------------------------------------------------------------------------- */

const KONTAK = [
  { icon: IconPhone, teks: '(021) 5422 0808 ext. 3902', href: 'tel:+62215422 0808' },
  { icon: IconMail, teks: 'softskill@umn.ac.id', href: 'mailto:softskill@umn.ac.id' },
  // { icon: IconChat, teks: '0811-1000-5C (pesan saja)', href: null },
]

function Pintasan({ ke, label, icon: Icon }) {
  return (
    <li>
      <Link
        href={ke}
        className="flex w-[84px] flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition hover:bg-white/10"
      >
        <Icon size={30} />
        <span className="text-[12.5px] font-semibold leading-tight">{label}</span>
      </Link>
    </li>
  )
}

export default function Footer({ pintasan = [] }) {
  return (
    <footer className="mt-12 bg-brand text-white print:hidden">
      <div className="mx-auto grid max-w-shell gap-x-10 gap-y-9 px-5 py-10 sm:px-6 lg:grid-cols-[auto_1fr_auto_auto]">
        {pintasan.length ? (
          <section>
            <h2 className="text-[13.5px] font-bold">Pintasan</h2>
            <ul className="mt-3 flex flex-wrap gap-1">
              {pintasan.map((p) => (
                <Pintasan key={p.ke} {...p} />
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-[13.5px] font-bold">Helpdesk</h2>
          <address className="mt-3 space-y-1 text-[13.5px] not-italic leading-relaxed text-white/80">
            <p>Gedung B, Lantai 3 Ruang B315</p>
            <p>Jl. Scientia Boulevard, Gading Serpong,</p>
            <p>kel. Curug Sangereng, Kec. Kelapa Dua,</p>
            <p>Kab. Tangerang, Prop. Banten 15811, Indonesia</p>
            <p className="pt-1">Senin–Jumat, 08.00–17.00 WIB</p>
          </address>
        </section>

        <section className="lg:pt-7">
          <ul className="space-y-3 text-[13.5px] text-white/85">
            {KONTAK.map(({ icon: Icon, teks, href }) => (
              <li key={teks} className="flex items-center gap-3">
                <Icon size={18} className="shrink-0 text-white/70" />
                {href ? (
                  <a href={href} className="underline-offset-4 hover:text-white hover:underline">
                    {teks}
                  </a>
                ) : (
                  <span>{teks}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:pt-4">
          <div className="flex items-center gap-2.5">
            <IconLogo size={40} />
            <span className="text-[16px] font-extrabold tracking-tight">
              UMN <span className="text-[var(--accent)]">SOFTSKILL</span>
            </span>
          </div>
          <p className="mt-3 max-w-[220px] text-[13px] leading-relaxed text-white/70">
            Biro Kemahasiswaan &amp; Humaniora
            <br />
            Universitas Multimedia Nusantara
          </p>
        </section>
      </div>

      <div className="border-t border-white/15 py-4 text-center text-[13px] text-white/70">
        © Copyright Universitas Multimedia Nusantara. Designed by Rayhandi Zulmi
      </div>
    </footer>
  )
}
