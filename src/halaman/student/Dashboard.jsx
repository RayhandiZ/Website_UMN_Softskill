import { useState } from 'react'
import Link from 'next/link'
import { Badge, HurufBadge, ScoreBar, Terkunci } from '../../components/Ui'
import {
  IconCertificate,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconGauge,
  IconLock,
  IconTable,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER, getArea } from '../../lib/curriculum'
import { kelayakanSertifikat } from '../../lib/rules'
import { PERIODE_AKTIF, labelPeriode, transkripOf } from '../../lib/mockData'
import { useStudent } from './StudentLayout'
import { useStore } from '../../lib/store'

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

const NADA_IKON = {
  brand: 'bg-brand-soft text-brand-ink',
  good: 'bg-[color-mix(in_srgb,var(--good)_14%,transparent)] text-[var(--good)]',
  warning:
    'bg-[color-mix(in_srgb,var(--warning)_22%,transparent)] text-[color-mix(in_srgb,var(--warning)_70%,var(--text-primary))]',
}

/* --------------------------------- ubin ----------------------------------- */

function Ubin({ ikon: Ikon, nada = 'brand', judul, ke, children }) {
  const isi = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink-2">{judul}</p>
        <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-2xl ' + NADA_IKON[nada]}>
          <Ikon size={20} />
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </>
  )
  const kelas = 'kartu block px-5 py-5'
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
  if (a.status === 'final') {
    return (
      <Badge tone="good" icon={IconCheck}>
        Final
      </Badge>
    )
  }
  if (a.status === 'terkunci') {
    return (
      <Badge tone="neutral" icon={IconLock}>
        Semester {a.aspek.semester}
      </Badge>
    )
  }
  if (a.status === 'menunggu') {
    return (
      <Badge tone="neutral" icon={IconClock}>
        Belum dinilai
      </Badge>
    )
  }
  return (
    <Badge tone="warning" icon={IconClock}>
      Sementara
    </Badge>
  )
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
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[13px] font-extrabold text-ink">
          {a.aspek.kode}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-ink">{a.aspek.nama}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: area?.warna }} />
            <span className="truncate">
              {area?.nama} · Semester {a.aspek.semester}
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
            <span className="text-[19px] font-extrabold text-ink">{a.nilai ?? '—'}</span>
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
                      {k.terisi ? k.nilai : <span className="font-semibold text-ink-3">belum masuk</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {a.alasanSementara ? (
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{a.alasanSementara}.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  )
}

function AspekSaya({ t }) {
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
          <h2 className="text-[17px] font-extrabold text-ink">Aspek penilaian</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-2">Ketuk salah satu untuk melihat komponen nilainya</p>
        </div>
      </div>

      {/* overflow-y-hidden wajib: begitu satu sumbu diberi overflow-x-auto,
          sumbu lainnya ikut menjadi auto, dan -mb-px pada tab memunculkan
          batang gulir vertikal setinggi 1 px di ujung kanan baris ini. */}
      <div
        role="tablist"
        aria-label="Saring aspek"
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
              {x.label}
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
        <p className="px-6 py-10 text-center text-[14px] text-ink-2">Belum ada aspek di kelompok ini.</p>
      )}

      <Link
        href="/mahasiswa/transkrip"
        className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-3.5 text-[14px] font-bold text-brand-ink transition hover:bg-surface-2"
      >
        {sisa > 0 ? 'Lihat Selengkapnya' : 'Lihat transkrip lengkap'}
        <IconChevronRight size={16} />
      </Link>
    </section>
  )
}

/* ------------------------------ capaian area ------------------------------ */

function CapaianArea({ t }) {
  return (
    <section className="kartu px-5 py-5 sm:px-6">
      <h2 className="text-[17px] font-extrabold text-ink">Capaian per area</h2>
      <p className="mt-0.5 text-[13.5px] text-ink-2">Rata-rata aspek yang sudah dinilai di tiap area</p>

      <ul className="mt-5 space-y-5">
        {Object.values(t.area).map((x) => {
          const terkunci = x.nilai == null
          return (
            <li key={x.area.id}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[14.5px] font-bold text-ink">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.area.warna }} />
                  <span className="truncate">
                    Area {x.area.id} · {x.area.nama}
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
                    {x.dinilai} dari {x.total} aspek dinilai
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
  const daftar = Object.values(t.semester)
  return (
    <section className="kartu px-5 py-5 sm:px-6">
      <h2 className="text-[17px] font-extrabold text-ink">Perjalanan semester</h2>

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
                  <span className="text-[15px] font-bold text-ink">Semester {s.semester}</span>
                  {keadaan !== 'terkunci' ? (
                    <span className="text-[15px] font-extrabold text-ink">{s.nilai ?? '—'}</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-2">
                  {keadaan === 'selesai'
                    ? 'Selesai · ' + s.total + ' aspek'
                    : keadaan === 'berjalan'
                      ? 'Sedang berjalan · ' + s.dinilai + ' dari ' + s.total + ' aspek dinilai'
                      : 'Belum dibuka · ' + s.total + ' aspek'}
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
        Buka Road Map
        <IconChevronRight size={16} />
      </Link>
    </section>
  )
}

/* --------------------------------- halaman -------------------------------- */

export default function Dashboard() {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
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
            {sapaan()}, {student.name.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            Semester {student.semesterAktif} dari {CONFIG.TOTAL_SEMESTER_PROGRAM} · Periode{' '}
            {labelPeriode(PERIODE_AKTIF)}
          </p>
        </div>
        <Link href="/mahasiswa/transkrip" className="btn-primary rounded-2xl px-5 py-3">
          <IconTable size={18} />
          Open Transcript
        </Link>
      </header>

      {/* --------------------------------- ubin -------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Ubin ikon={IconGauge} judul="Nilai akhir">
          {/* Satu-satunya angka besar di halaman ini. */}
          <p className="text-[48px] font-extrabold leading-none tracking-tight text-ink">
            {akhir.nilai ?? '—'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {akhir.nilai != null ? <HurufBadge nilai={akhir.nilai} /> : null}
            <Badge tone={akhir.status === 'final' ? 'good' : 'warning'} icon={akhir.status === 'final' ? IconCheck : IconClock}>
              {akhir.status === 'final' ? 'Final' : 'Sementara'}
            </Badge>
          </div>
          <p className="mt-2 text-[13px] text-ink-2">{akhir.basis}</p>

          {/* Hanya di ponsel. Nilai akhir tetap terlihat sebagai kepala; tiga
              ubin lainnya dilipat di bawahnya, dan ringkasannya tetap tertulis
              di tombol ini supaya tidak ada yang benar-benar tersembunyi. */}
          <button
            type="button"
            onClick={() => setRinciBuka((v) => !v)}
            aria-expanded={rinciBuka}
            aria-controls="ubin-rinci"
            className="mt-4 flex w-full items-center gap-2 border-t border-line pt-3.5 text-left sm:hidden"
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
              {akhir.aspekDinilai}/{akhir.aspekTotal} dinilai · {akhir.aspekFinal} final · sertifikat{' '}
              {sertifikat.layak ? 'siap' : 'belum'}
            </span>
            <span className="shrink-0 text-[13.5px] font-bold text-brand-ink">
              {rinciBuka ? 'Tutup' : 'Rincian'}
            </span>
            <IconChevronDown
              size={17}
              className={'shrink-0 text-brand-ink transition-transform ' + (rinciBuka ? 'rotate-180' : '')}
            />
          </button>
        </Ubin>

        {/* sm:contents melebur pembungkus ini di layar lebar, sehingga ketiga
            ubin kembali menjadi anggota grid induknya seperti biasa. Di ponsel
            ia tersembunyi sampai tombol Rincian ditekan. */}
        <div id="ubin-rinci" className={(rinciBuka ? 'grid' : 'hidden') + ' gap-4 sm:contents'}>
          <Ubin ikon={IconTable} judul="Aspek dinilai">
            <p className="text-[32px] font-extrabold leading-none tracking-tight text-ink">
              {akhir.aspekDinilai}
              <span className="text-[18px] font-bold text-ink-3"> / {akhir.aspekTotal}</span>
            </p>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--grid)]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={akhir.aspekTotal}
              aria-valuenow={akhir.aspekDinilai}
              aria-label="Aspek yang sudah dinilai"
            >
              <div className="h-full rounded-full bg-brand-ink" style={{ width: persenDinilai + '%' }} />
            </div>
            <p className="mt-2 text-[13px] text-ink-2">
              {terkunci ? terkunci + ' aspek belum dibuka' : 'Semua aspek sudah dibuka'}
            </p>
          </Ubin>

          <Ubin ikon={IconCheck} nada="good" judul="Aspek final">
            <p className="text-[32px] font-extrabold leading-none tracking-tight text-ink">
              {akhir.aspekFinal}
              <span className="text-[18px] font-bold text-ink-3"> / {akhir.aspekTotal}</span>
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              {akhir.aspekFinal ? 'Sudah dikunci dan tidak akan berubah lagi' : 'Belum ada aspek yang dikunci'}
            </p>
          </Ubin>

          <Ubin
            ikon={IconCertificate}
            nada={sertifikat.layak ? 'good' : 'warning'}
            judul="Sertifikat"
            ke="/mahasiswa/sertifikat"
          >
            <p className="text-[22px] font-extrabold leading-tight text-ink">
              {sertifikat.layak ? 'Siap diunduh' : 'Belum tersedia'}
            </p>
            <p className="mt-3 flex items-center gap-1 text-[13px] text-ink-2">
              {sertifikat.layak ? 'Buka untuk mengunduh' : sertifikat.gagal.length + ' syarat belum terpenuhi'}
              <IconChevronRight size={15} className="shrink-0" />
            </p>
          </Ubin>
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
