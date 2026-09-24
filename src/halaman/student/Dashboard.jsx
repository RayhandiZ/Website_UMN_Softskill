import { useState } from 'react'
import Link from 'next/link'
import { HurufBadge, ScoreBar, StatusTeks, Terkunci } from '../../components/Ui'
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDocument,
  IconLock,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER, getArea } from '../../lib/curriculum'
import { kelayakanSertifikat } from '../../lib/rules'
import { PERIODE_AKTIF, labelPeriode, transkripOf } from '../../lib/mockData'
import { useStudent } from './StudentLayout'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { jalurMulus } from '../../lib/kurva'

/* --------------------------------------------------------------------------
   Dashboard mahasiswa.

   Urutannya mengikuti pertanyaan yang biasanya muncul berurutan di kepala
   mahasiswa: berapa nilai saya → sudah sejauh mana → aspek mana saja dan
   statusnya → apa yang masih ditunggu.

   Aturan yang dijaga di halaman ini:
   - SATU angka besar saja (nilai akhir). Angka lain lebih kecil supaya mata
     tahu harus mulai dari mana.
   - Nilai akhir selalu disertai status dan dasar hitungnya (R3).
   - Aspek terkunci tampil dengan gembok dan semester pembukaannya, tidak
     pernah sebagai 0 (R2).
   - Warna hijau/kuning hanya untuk status, dan selalu berikut ikon + label.
   -------------------------------------------------------------------------- */

const sapaan = () => {
  const jam = new Date().getHours()
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}

/* --------------------------------- ubin ----------------------------------- */

/* --------------------------------------------------------------------------
   Sebaran nilai aspek — grafik mini di dalam kartu nilai akhir.

   KENAPA TITIK PADA JALUR, BUKAN BATANG. Nilai sepuluh aspek seorang mahasiswa
   biasanya berdekatan: contohnya 84 sampai 87. Sebagai batang setinggi 40 px
   dengan dasar nol, selisih 3 angka itu menjadi selisih SATU PIKSEL — grafik
   yang tidak menunjukkan apa pun, dan lebih buruk daripada tidak ada grafik
   karena ia mengaku menunjukkan sesuatu.

   Posisi pada jalur mendatar punya resolusi jauh lebih besar: pada jalur
   selebar 400 px, satu angka bernilai 4 px, sehingga 84 dan 87 terpisah 12 px
   dan terbaca. Dan yang terpenting, skalanya TETAP 0 sampai 100 — tidak ada
   dasar yang dipotong demi membesar-besarkan selisih.

   Yang ditampilkan di sini sengaja belum ada di tempat lain pada halaman ini.
   Rata-rata per area sudah punya kartunya sendiri di bawah, begitu pula nilai
   per semester di kolom kanan; mengulangnya di sini hanya akan memenuhi ruang
   tanpa menambah keterangan.
   -------------------------------------------------------------------------- */
function SebaranAspek({ t }) {
  const teks = useTeks()
  const dinilai = t.aspek.filter((a) => a.nilai != null)
  if (dinilai.length < 2) return null

  const angka = dinilai.map((a) => a.nilai)
  const rendah = Math.min(...angka)
  const tinggi = Math.max(...angka)
  const terkunci = t.aspek.filter((a) => a.terkunci).length

  return (
    <div>
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-2">{teks('Sebaran nilai aspek')}</span>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-ink">
          {rendah === tinggi ? rendah : rendah + '–' + tinggi}
        </span>
      </p>

      <div
        role="img"
        aria-label={teks('Sebaran nilai {n} aspek pada skala 0 sampai 100, terendah {rendah}, tertinggi {tinggi}', {
          n: dinilai.length,
          rendah,
          tinggi,
        })}
        className="relative mt-3 h-10 rounded-xl bg-[var(--grid)]"
      >
        {/* Ambang kelulusan. Tanpa penanda ini, sebaran nilai tidak punya
            acuan apa pun: 84 itu bagus atau pas-pasan tidak bisa dijawab. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-1 w-px bg-ink-2"
          style={{ left: CONFIG.AMBANG_SERTIFIKAT + '%' }}
        />

        {dinilai.map((a) => (
          <span
            key={a.aspekId}
            title={a.aspek.kode + ' ' + a.aspek.nama + ' — ' + a.nilai}
            /* SATU WARNA, BUKAN PER AREA. Titik selebar 10 px tidak bisa
               dipakai membaca identitas: tidak ada seorang pun yang bisa
               menunjuk titik mana milik aspek mana, jadi mewarnainya per area
               hanya menambah tiga warna tanpa menambah satu keterangan pun.
               Yang membawa arti di sini adalah POSISI titiknya.

               Warna area juga gagal diukur: di atas jalur terang, oranye area
               kedua hanya 2,76:1 dan hijau area ketiga 2,43:1 — keduanya di
               bawah ambang 3:1 untuk unsur grafis. Warna tunggal ini 8,56:1.

               Cincin sewarna latar memisahkan titik-titik yang bertumpuk; dua
               aspek bernilai sama akan mendarat di titik yang persis sama
               tanpa itu. */
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-ink ring-2 ring-[var(--surface)]"
            style={{ left: a.nilai + '%' }}
          />
        ))}
      </div>

      <p className="mt-2 flex items-baseline justify-between gap-3 text-[11.5px] text-ink-3">
        <span className="tabular-nums">0</span>
        <span className="min-w-0 truncate text-center">
          {teks('{n} aspek dinilai', { n: dinilai.length })}
          {terkunci ? ' · ' + teks('{n} belum dibuka', { n: terkunci }) : ''}
          {' · '}
          {teks('ambang {n}', { n: CONFIG.AMBANG_SERTIFIKAT })}
        </span>
        <span className="tabular-nums">100</span>
      </p>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Tren nilai per semester.

   Ini pertanyaan yang lebih berguna daripada sebaran aspek: bukan "nilai saya
   tersebar di mana", tapi "saya membaik atau tidak". Sumbu waktu adalah satu-
   satunya sumbu yang punya urutan alami di data ini, jadi garis adalah bentuk
   yang tepat untuknya.

   SUMBU Y DIPOTONG, DAN ITU SENGAJA -- TAPI DILABELI. Nilai satu mahasiswa
   antar semester biasanya bergerak 1 sampai 3 angka. Pada sumbu 0-100 gerakan
   itu jadi garis lurus sempurna, dan grafik yang selalu lurus tidak berguna.
   Maka jendelanya dipersempit. Bahayanya jelas: mempersempit tanpa batas
   membuat selisih 1 angka tampak seperti tebing. Penjaganya ada dua, dan
   keduanya wajib:

     1. LEBAR JENDELA MINIMUM 20 ANGKA. Kenaikan 2 angka menempati sepersepuluh
        tinggi grafik, bukan seluruhnya. Mahasiswa yang nilainya tetap akan
        melihat garis yang benar-benar datar, karena memang begitulah adanya.
     2. UJUNG SUMBU SELALU DITULIS. Angka di kiri atas dan kiri bawah membuat
        pembaca tahu grafik ini tidak dimulai dari nol. Sumbu terpotong tanpa
        label itulah yang menipu, bukan sumbu terpotongnya sendiri.

   Semester yang belum dibuka tidak digambar sebagai nol dan garisnya tidak
   diteruskan ke sana (R2) -- hanya nama semesternya yang tampil, diredupkan.
   -------------------------------------------------------------------------- */

/* Lebar jendela sumbu Y paling sempit yang diizinkan, dalam satuan nilai. */
const JENDELA_MIN = 20

/* Tinggi bidang gambar dalam piksel. Dipakai dua kali: oleh bidangnya sendiri
   dan oleh lajur label sumbu Y di sebelahnya, yang harus setinggi itu persis
   supaya tiap label duduk tepat pada garis bantunya. */
const TINGGI_BAGAN = 116

/* Jarak antar garis bantu. Dipilih dari kelipatan yang enak dibaca, bukan dari
   rentang datanya langsung: sumbu yang berlabel 70, 75, 80 jauh lebih cepat
   dibaca daripada 71, 78,3, 85,6 meskipun keduanya sama benarnya. Yang dicari
   adalah kelipatan terkecil yang menghasilkan paling banyak lima petak. */
function pilihLangkah(bawahKasar, atasKasar) {
  for (const langkah of [1, 2, 5, 10, 20, 25, 50]) {
    const b = Math.floor(bawahKasar / langkah) * langkah
    const a = Math.ceil(atasKasar / langkah) * langkah
    if ((a - b) / langkah <= 5) return langkah
  }
  return 50
}

function TrenSemester({ t }) {
  const teks = useTeks()
  const daftar = Object.values(t.semester)
  const dinilai = daftar.filter((s) => s.nilai != null)

  const angka = dinilai.map((s) => s.nilai)
  const rendah = Math.min(...angka)
  const tinggi = Math.max(...angka)

  let bawahKasar = rendah - 4
  let atasKasar = tinggi + 4
  if (atasKasar - bawahKasar < JENDELA_MIN) {
    const tengah = (rendah + tinggi) / 2
    bawahKasar = tengah - JENDELA_MIN / 2
    atasKasar = tengah + JENDELA_MIN / 2
  }
  /* Digeser, bukan dipotong, supaya lebar jendelanya tidak menyusut di dekat
     ujung skala: nilai 96 tetap dibaca pada jendela selebar 20 angka. */
  if (bawahKasar < 0) {
    atasKasar -= bawahKasar
    bawahKasar = 0
  }
  if (atasKasar > 100) {
    bawahKasar -= atasKasar - 100
    atasKasar = 100
  }

  const langkah = pilihLangkah(bawahKasar, atasKasar)
  const bawah = Math.max(0, Math.floor(bawahKasar / langkah) * langkah)
  const atas = Math.min(100, Math.ceil(atasKasar / langkah) * langkah)

  const garisBantu = []
  for (let v = bawah; v <= atas; v += langkah) garisBantu.push(v)

  /* Koordinat dalam persen; SVG-nya memakai viewBox 0 0 100 100 dengan
     preserveAspectRatio="none" supaya ikut melebar mengikuti kartu.

     Sumbu Y TIDAK diberi sisa tepi: garis bantu teratas dan terbawah memang
     harus menempel di tepi bidang, seperti sumbu pada umumnya. Titik datanya
     tetap aman karena jendelanya sudah dibulatkan keluar lebih dulu, jadi
     tidak ada nilai yang persis jatuh di tepi. */
  const n = daftar.length
  const px = (sem) => (n === 1 ? 50 : 4 + ((sem - 1) / (n - 1)) * 92)
  const py = (nilai) => ((atas - nilai) / (atas - bawah)) * 100

  const titik = dinilai.map((sem) => ({ sem, x: px(sem.semester), y: py(sem.nilai) }))

  /* Kurva hanya ditarik melintasi semester yang BERURUTAN. Kalau ada semester
     tanpa nilai di tengah, kurvanya diputus jadi dua, bukan dilompati --
     melompatinya berarti mengarang perubahan yang datanya tidak menyatakan. */
  const runtun = []
  for (const k of titik) {
    const terakhir = runtun[runtun.length - 1]
    if (terakhir && k.sem.semester === terakhir[terakhir.length - 1].sem.semester + 1) terakhir.push(k)
    else runtun.push([k])
  }

  const mulai = dinilai[0]
  const kini = dinilai[dinilai.length - 1]
  const selisih = kini.nilai - mulai.nilai
  const ringkas =
    selisih === 0
      ? teks('Tetap sejak Semester {n}', { n: mulai.semester })
      : selisih > 0
        ? teks('Naik {d} sejak Semester {n}', { d: selisih, n: mulai.semester })
        : teks('Turun {d} sejak Semester {n}', { d: -selisih, n: mulai.semester })

  const ambang = CONFIG.AMBANG_SERTIFIKAT
  const ambangTampil = ambang > bawah && ambang < atas

  return (
    <div>
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-2">{teks('Nilai per semester')}</span>
        <span className="shrink-0 text-[12.5px] font-bold text-ink-2">{ringkas}</span>
      </p>

      <div className="mt-3 flex gap-2">
        {/* Label sumbu Y, satu di tiap garis bantu. Selain memberi acuan baca,
            angka-angka inilah yang menyatakan bahwa sumbunya TIDAK mulai dari
            nol. Sumbu terpotong yang tidak dilabeli itulah yang menyesatkan. */}
        <div className="relative w-[26px] shrink-0" style={{ height: TINGGI_BAGAN }}>
          {garisBantu.map((v) => (
            <span
              key={v}
              className="absolute right-0 -translate-y-1/2 text-[10.5px] font-semibold tabular-nums text-ink-3"
              style={{ top: py(v) + '%' }}
            >
              {v}
            </span>
          ))}
        </div>

        <div
          role="img"
          aria-label={teks(
            'Grafik nilai per semester, Semester {a} sebesar {na} sampai Semester {b} sebesar {nb}. {ringkas}',
            { a: mulai.semester, na: mulai.nilai, b: kini.semester, nb: kini.nilai, ringkas },
          )}
          className="relative min-w-0 flex-1"
          style={{ height: TINGGI_BAGAN }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {garisBantu.map((v) => (
              <line
                key={v}
                x1="0"
                x2="100"
                y1={py(v)}
                y2={py(v)}
                stroke={v === bawah ? 'var(--border-strong)' : 'var(--border)'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {ambangTampil ? (
              <line
                x1="0"
                x2="100"
                y1={py(ambang)}
                y2={py(ambang)}
                stroke="var(--text-secondary)"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {runtun.map((deret) =>
              deret.length < 2 ? null : (
                <path
                  key={deret[0].sem.semester}
                  d={jalurMulus(deret)}
                  fill="none"
                  stroke="var(--brand-ink)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  /* Tanpa ini, preserveAspectRatio="none" ikut meregangkan
                     tebal garisnya: tipis saat melintang, tebal saat menanjak. */
                  vectorEffect="non-scaling-stroke"
                />
              ),
            )}
          </svg>

          {/* Titiknya HTML, bukan SVG: lingkaran di dalam viewBox yang
              diregangkan akan jadi lonjong. */}
          {titik.map((k) => (
            <span
              key={k.sem.semester}
              title={teks('Semester {n}', { n: k.sem.semester }) + ': ' + k.sem.nilai}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-ink ring-2 ring-[var(--surface)]"
              style={{ left: k.x + '%', top: k.y + '%' }}
            />
          ))}
        </div>
      </div>

      {/* Nama semester, ditulis lengkap dan ditempatkan di bawah titiknya
          masing-masing. Semester yang belum dibuka tetap tertulis -- tanpa itu
          mahasiswa semester dua akan mengira programnya hanya sampai situ.

          Label pertama dan terakhir dirapatkan ke tepinya, bukan dipusatkan
          pada titiknya. "Semester 1" yang dipusatkan di 4% akan separuhnya
          keluar dari bidang; ini cara baku menambatkan label ujung, dan
          pergeserannya tidak sampai membuat orang salah pasang label. */}
      <div className="relative mt-1.5 ml-[34px] mr-1 h-4">
        {daftar.map((sem, i) => (
          <span
            key={sem.semester}
            className={
              'absolute whitespace-nowrap text-[11px] text-ink-3' +
              (i === 0 ? '' : i === daftar.length - 1 ? ' -translate-x-full' : ' -translate-x-1/2') +
              (sem.nilai == null ? ' opacity-55' : '')
            }
            style={{ left: px(sem.semester) + '%' }}
          >
            {teks('Semester {n}', { n: sem.semester })}
          </span>
        ))}
      </div>
    </div>
  )
}

/* Grafik mana yang muncul di kartu nilai akhir bergantung pada data yang
   sudah ada, bukan pada selera.

   Tren antar semester baru punya arti kalau ada minimal dua semester bernilai;
   dengan satu titik ia hanya bingkai kosong berisi satu noktah. Mahasiswa
   semester satu justru yang paling banyak, jadi untuk mereka ditampilkan
   sebaran aspek -- data yang pasti sudah ada, dan menjawab pertanyaan yang
   memang relevan di tahap itu. */
function GrafikRingkas({ t }) {
  const semesterDinilai = Object.values(t.semester).filter((s) => s.nilai != null).length
  const aspekDinilai = t.aspek.filter((a) => a.nilai != null).length

  /* Mahasiswa yang benar-benar baru belum punya bahan untuk salah satu pun.
     Pemisah kolomnya ikut dibawa ke sini supaya dalam keadaan itu tidak
     tertinggal garis vertikal yang membatasi ruang kosong. */
  if (semesterDinilai < 2 && aspekDinilai < 2) return null

  return (
    <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-6">
      {semesterDinilai >= 2 ? <TrenSemester t={t} /> : <SebaranAspek t={t} />}
    </div>
  )
}

/* Ubin ringkas untuk kolom kanan.

   Judul dan angkanya duduk pada satu baris, bukan bertumpuk seperti di ubin
   utama. Sebabnya ruang: ketiganya kini berbagi satu kolom sempit di samping
   kartu nilai akhir, dan judul yang bertumpuk di atas angka membuat tiap ubin
   setinggi empat baris — kolom kanan akan jadi lebih padat daripada kiri, dan
   susunan yang dimaksudkan menonjolkan nilai akhir justru berbalik. */
function UbinRingkas({ judul, nilai, satuan, ke, children }) {
  const t = useTeks()
  const isi = (
    <>
      <p className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink-2">{t(judul)}</span>
        <span className="shrink-0 text-[26px] font-extrabold leading-none tracking-tight text-ink">
          {nilai}
          {satuan ? <span className="text-[15px] font-bold text-ink-3">{satuan}</span> : null}
        </span>
      </p>
      {children}
    </>
  )
  const kelas = 'kartu block px-5 py-4'
  return ke ? (
    <Link href={ke} className={kelas + ' transition hover:border-brand-ink'}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  )
}


/* ------------------------------ status aspek ------------------------------ */

function StatusAspek({ a }) {
  const t = useTeks()
  if (a.status === 'final') return <StatusTeks kuat>{t('Final')}</StatusTeks>
  if (a.status === 'terkunci') {
    return <StatusTeks>{t('Dibuka Semester {n}', { n: a.aspek.semester })}</StatusTeks>
  }
  return <StatusTeks>{t(a.status === 'menunggu' ? 'Belum dinilai' : 'Sementara')}</StatusTeks>
}

/* Dashboard hanya menampilkan sebagian; daftar lengkap tempatnya di
   transkrip. Angka di tab tetap jumlah SEBENARNYA, supaya mahasiswa tahu ada
   berapa aspek yang tidak ikut tampil di sini. */
export const BATAS_BARIS_ASPEK = 5

const TAB = [
  { id: 'semua', label: 'Semua', cocok: () => true },
  { id: 'final', label: 'Final', cocok: (a) => a.status === 'final' },
  { id: 'berjalan', label: 'Berjalan', cocok: (a) => a.status === 'berjalan' || a.status === 'menunggu' },
  { id: 'terkunci', label: 'Terkunci', cocok: (a) => a.status === 'terkunci' },
]

/* Satu baris aspek. Diketuk untuk membuka rincian komponennya — sumber nilai
   dan komponen mana yang belum masuk — tanpa harus pindah ke transkrip. */
function BarisAspek({ a, terbuka, onToggle }) {
  const t = useTeks()
  const area = getArea(a.aspek.area)
  const idRinci = 'rinci-' + a.aspekId

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        aria-controls={idRinci}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[13px] font-bold text-ink">
          {a.aspek.kode}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-ink">{a.aspek.nama}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: area?.warna }} />
            <span className="truncate">
              {area?.nama} · {t('Semester {n}', { n: a.aspek.semester })}
            </span>
          </span>
        </span>

        <span className="hidden shrink-0 sm:block">
          <StatusAspek a={a} />
        </span>

        <span className="w-10 shrink-0 text-right">
          {a.terkunci ? (
            <IconLock size={17} className="ml-auto text-ink-3" />
          ) : (
            <span className="text-[19px] font-extrabold text-ink">{a.nilai ?? '-'}</span>
          )}
        </span>

        <IconChevronDown
          size={18}
          className={'shrink-0 text-ink-3 transition-transform ' + (terbuka ? 'rotate-180' : '')}
        />
      </button>

      {terbuka ? (
        <div id={idRinci} className="px-5 pb-5 sm:px-6 sm:pl-[88px]">
          <div className="mb-3 sm:hidden">
            <StatusAspek a={a} />
          </div>

          {a.terkunci ? (
            <Terkunci semester={a.aspek.semester} />
          ) : (
            <>
              <ul className="space-y-2">
                {a.komponen.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 text-[14px]">
                    <span className="min-w-0 flex-1 text-ink">
                      {k.label}
                      <span className="text-ink-3"> · {SUMBER[k.sumber]?.label ?? k.sumber}</span>
                    </span>
                    <span className="shrink-0 font-bold text-ink">
                      {k.terisi ? k.nilai : <span className="font-semibold text-ink-3">{t('belum masuk')}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {a.alasanSementara ? (
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{t(a.alasanSementara)}.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  )
}

function AspekSaya({ t }) {
  const teks = useTeks()
  const [tab, setTab] = useState('semua')
  const [bukaId, setBukaId] = useState(null)

  const aktif = TAB.find((x) => x.id === tab)
  const semua = t.aspek.filter(aktif.cocok)
  const daftar = semua.slice(0, BATAS_BARIS_ASPEK)
  const sisa = semua.length - daftar.length

  return (
    <section className="kartu overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div>
          <h2 className="text-[17px] font-extrabold text-ink">{teks('Aspek penilaian')}</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-2">
            {teks('Ketuk salah satu untuk melihat komponen nilainya')}
          </p>
        </div>
      </div>

      {/* overflow-y-hidden wajib: begitu satu sumbu diberi overflow-x-auto,
          sumbu lainnya ikut menjadi auto, dan -mb-px pada tab memunculkan
          batang gulir vertikal setinggi 1 px di ujung kanan baris ini. */}
      <div
        role="tablist"
        aria-label={teks('Saring aspek')}
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-4 sm:px-5"
      >
        {TAB.map((x) => {
          const jumlah = t.aspek.filter(x.cocok).length
          const pilih = x.id === tab
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={pilih}
              onClick={() => {
                setTab(x.id)
                setBukaId(null)
              }}
              className={
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-bold transition ' +
                (pilih ? 'border-brand-ink text-brand-ink' : 'border-transparent text-ink-2 hover:text-ink')
              }
            >
              {teks(x.label)}
              <span className="ml-1.5 font-semibold text-ink-3">{jumlah}</span>
            </button>
          )
        })}
      </div>

      {daftar.length ? (
        <ul>
          {daftar.map((a) => (
            <BarisAspek
              key={a.aspekId}
              a={a}
              terbuka={bukaId === a.aspekId}
              onToggle={() => setBukaId((id) => (id === a.aspekId ? null : a.aspekId))}
            />
          ))}
        </ul>
      ) : (
        <p className="px-6 py-10 text-center text-[14px] text-ink-2">
          {teks('Belum ada aspek di kelompok ini.')}
        </p>
      )}

      <Link
        href="/mahasiswa/transkrip"
        className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-3.5 text-[14px] font-bold text-brand-ink transition hover:bg-surface-2"
      >
        {teks(sisa > 0 ? 'Lihat Selengkapnya' : 'Lihat transkrip lengkap')}
        <IconChevronRight size={16} />
      </Link>
    </section>
  )
}

/* ------------------------------ capaian area ------------------------------ */

function CapaianArea({ t }) {
  const teks = useTeks()
  return (
    <section className="kartu px-5 py-5 sm:px-6">
      <h2 className="text-[17px] font-extrabold text-ink">{teks('Capaian per area')}</h2>
      <p className="mt-0.5 text-[13.5px] text-ink-2">
        {teks('Rata-rata aspek yang sudah dinilai di tiap area')}
      </p>

      <ul className="mt-5 space-y-5">
        {Object.values(t.area).map((x) => {
          const terkunci = x.nilai == null
          return (
            <li key={x.area.id}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[14.5px] font-bold text-ink">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.area.warna }} />
                  <span className="truncate">
                    {teks('Area {kode}', { kode: x.area.id })} · {x.area.nama}
                  </span>
                </span>
                {terkunci ? (
                  <IconLock size={16} className="shrink-0 text-ink-3" />
                ) : (
                  <span className="shrink-0 text-[17px] font-extrabold text-ink">{x.nilai}</span>
                )}
              </div>
              {terkunci ? (
                <Terkunci semester={Math.min(...x.aspek.map((a) => a.aspek.semester))} />
              ) : (
                <>
                  <ScoreBar value={x.nilai} color={x.area.warna} />
                  <p className="mt-1.5 text-[12.5px] text-ink-3">
                    {teks('{n} dari {total} aspek dinilai', { n: x.dinilai, total: x.total })}
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* --------------------------- perjalanan semester -------------------------- */

function PerjalananSemester({ t }) {
  const teks = useTeks()
  const daftar = Object.values(t.semester)
  return (
    <section className="kartu px-5 py-5 sm:px-6">
      <h2 className="text-[17px] font-extrabold text-ink">{teks('Perjalanan semester')}</h2>

      <ol className="mt-4">
        {daftar.map((s, i) => {
          const keadaan = s.terkunci ? 'terkunci' : s.ditutup ? 'selesai' : 'berjalan'
          const terakhir = i === daftar.length - 1
          return (
            <li key={s.semester} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!terakhir ? (
                <span
                  aria-hidden="true"
                  className={
                    'absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5 rounded-full ' +
                    (keadaan === 'selesai' ? 'bg-brand-ink' : 'bg-line')
                  }
                />
              ) : null}

              <span
                className={
                  'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ' +
                  (keadaan === 'selesai'
                    ? 'bg-brand-ink text-white'
                    : keadaan === 'berjalan'
                      ? 'border-2 border-brand-ink bg-surface text-brand-ink'
                      : 'bg-surface-2 text-ink-3')
                }
              >
                {keadaan === 'selesai' ? (
                  <IconCheck size={16} />
                ) : keadaan === 'terkunci' ? (
                  <IconLock size={14} />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-ink" />
                )}
              </span>

              <span className="min-w-0 flex-1 pt-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold text-ink">
                    {teks('Semester {n}', { n: s.semester })}
                  </span>
                  {keadaan !== 'terkunci' ? (
                    <span className="text-[15px] font-bold text-ink">{s.nilai ?? '-'}</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-2">
                  {keadaan === 'selesai'
                    ? teks('Selesai · {total} aspek', { total: s.total })
                    : keadaan === 'berjalan'
                      ? teks('Sedang berjalan · {n} dari {total} aspek dinilai', {
                          n: s.dinilai,
                          total: s.total,
                        })
                      : teks('Belum dibuka · {total} aspek', { total: s.total })}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      <Link
        href="/mahasiswa/peta"
        className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-ink hover:underline"
      >
        {teks('Buka Peta Perjalanan')}
        <IconChevronRight size={16} />
      </Link>
    </section>
  )
}

/* --------------------------------- halaman -------------------------------- */

export default function Dashboard() {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const teks = useTeks()
  const student = useStudent()
  const t = transkripOf(student)
  const sertifikat = kelayakanSertifikat(student)
  const { akhir } = t

  const terkunci = t.aspek.filter((a) => a.terkunci).length
  const [rinciBuka, setRinciBuka] = useState(false)
  const persenDinilai = akhir.aspekTotal ? Math.round((akhir.aspekDinilai / akhir.aspekTotal) * 100) : 0

  return (
    <div className="space-y-6">
      {/* -------------------------------- sapaan ------------------------------- */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
            {teks(sapaan())}, {student.name.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {teks('Semester {n} dari {total}', {
              n: student.semesterAktif,
              total: CONFIG.TOTAL_SEMESTER_PROGRAM,
            })}{' '}
            · {teks('Periode {periode}', { periode: labelPeriode(PERIODE_AKTIF) })}
          </p>
        </div>
        <Link href="/mahasiswa/transkrip" className="btn-primary rounded-2xl px-5 py-3">
          <IconDocument size={18} />
          {teks('Buka Transkrip')}
        </Link>
      </header>

      {/* --------------------------------- ubin -------------------------------- */}
      {/* --------------------------------------------------------------------
          Satu kartu besar di kiri, tiga ubin ringkas menumpuk di kanan.

          Sebelumnya keempatnya berukuran sama, dan itu berarti "85" bersaing
          dengan "7/10", "3/10", dan "Belum tersedia" — padahal hanya satu dari
          keempatnya yang menjawab pertanyaan pertama seorang mahasiswa. Ukuran
          adalah cara paling murah menjawab "mana yang harus saya baca dulu",
          dan ukuran yang sama berarti pertanyaan itu tidak dijawab sama
          sekali.
          -------------------------------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="kartu flex flex-col px-6 py-6 sm:px-7 sm:py-7">
          <p className="text-[14px] font-semibold text-ink-2">{teks('Nilai akhir')}</p>

          {/* Angka di kiri, grafik di kanan. Menumpuk keduanya membuat kartu
              ini jadi empat baris tulisan di atas satu grafik, dengan rongga
              lebar di kanan angkanya -- dan rongga itu terbaca sebagai ada
              yang belum selesai dipasang. Di ponsel keduanya tetap bertumpuk,
              karena di sana lebar adalah barang langka. */}
          <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:shrink-0 sm:flex-col sm:items-start sm:gap-y-1">
              <p className="text-[56px] font-extrabold leading-[0.9] tracking-tight text-ink sm:text-[64px]">
                {akhir.nilai ?? '-'}
              </p>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {akhir.nilai != null ? <HurufBadge nilai={akhir.nilai} /> : null}
                  <StatusTeks kuat={akhir.status === 'final'}>
                    {teks(akhir.status === 'final' ? 'Final' : 'Sementara')}
                  </StatusTeks>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-2">
                  {teks('berdasarkan {n} dari {total} aspek', {
                    n: akhir.aspekDinilai,
                    total: akhir.aspekTotal,
                  })}
                </p>
              </div>
            </div>

            <GrafikRingkas t={t} />
          </div>

          {/* Hanya di ponsel. Nilai akhir tetap terlihat sebagai kepala; tiga
              ubin lainnya dilipat di bawahnya, dan ringkasannya tetap tertulis
              di tombol ini supaya tidak ada yang benar-benar tersembunyi. */}
          <button
            type="button"
            onClick={() => setRinciBuka((v) => !v)}
            aria-expanded={rinciBuka}
            aria-controls="ubin-rinci"
            className="mt-auto flex w-full items-center gap-2 border-t border-line pt-3.5 text-left sm:hidden"
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
              {teks('{n}/{total} dinilai, {final} final · sertifikat {keadaan}', {
                n: akhir.aspekDinilai,
                total: akhir.aspekTotal,
                final: akhir.aspekFinal,
                keadaan: teks(sertifikat.layak ? 'siap' : 'belum'),
              })}
            </span>
            <span className="shrink-0 text-[13.5px] font-bold text-brand-ink">
              {teks(rinciBuka ? 'Tutup' : 'Rincian')}
            </span>
            <IconChevronDown
              size={17}
              className={'shrink-0 text-brand-ink transition-transform ' + (rinciBuka ? 'rotate-180' : '')}
            />
          </button>
        </div>

        {/* Di ponsel ketiganya tersembunyi sampai tombol Rincian ditekan; sejak
            640px ke atas selalu tampil, menumpuk di kolom kanan. */}
        <div id="ubin-rinci" className={(rinciBuka ? 'grid' : 'hidden') + ' gap-4 sm:grid'}>
          <UbinRingkas
            judul="Aspek dinilai"
            nilai={akhir.aspekDinilai}
            satuan={' / ' + akhir.aspekTotal}
          >
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--grid)]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={akhir.aspekTotal}
              aria-valuenow={akhir.aspekDinilai}
              aria-label={teks('Aspek yang sudah dinilai')}
            >
              <div className="h-full rounded-full bg-brand-ink" style={{ width: persenDinilai + '%' }} />
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
              {terkunci
                ? teks('{n} aspek belum dibuka', { n: terkunci })
                : teks('Semua aspek sudah dibuka')}
            </p>
          </UbinRingkas>

          <UbinRingkas
            judul="Aspek final"
            nilai={akhir.aspekFinal}
            satuan={' / ' + akhir.aspekTotal}
          >
            <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
              {teks(
                akhir.aspekFinal
                  ? 'Sudah dikunci dan tidak akan berubah lagi'
                  : 'Belum ada aspek yang dikunci',
              )}
            </p>
          </UbinRingkas>

          <UbinRingkas
            judul="Sertifikat"
            ke="/mahasiswa/sertifikat"
            nilai={
              <span className="text-[16px] font-extrabold leading-tight text-ink">
                {teks(sertifikat.layak ? 'Siap diunduh' : 'Belum tersedia')}
              </span>
            }
          >
            <p className="mt-2 flex items-center gap-1 text-[12.5px] leading-snug text-ink-2">
              {sertifikat.layak
                ? teks('Buka untuk mengunduh')
                : teks('{n} syarat belum terpenuhi', { n: sertifikat.gagal.length })}
              <IconChevronRight size={14} className="shrink-0" />
            </p>
          </UbinRingkas>
        </div>
      </section>

      {/* ------------------------------- dua kolom ----------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <AspekSaya t={t} />
        </div>
        {/* Komponen yang belum dinilai pindah ke lonceng di bilah atas. */}
        <div className="space-y-6">
          <PerjalananSemester t={t} />
          <CapaianArea t={t} />
        </div>
      </div>
    </div>
  )
}
