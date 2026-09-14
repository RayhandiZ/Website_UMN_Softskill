import { useMemo } from 'react'
import Link from 'next/link'
import { Card } from '../../components/Ui'
import MutuDonut from '../../components/charts/MutuDonut'
import {
  IconBuilding,
  IconCertificate,
  IconChevronRight,
  IconDocument,
  IconList,
  IconUpload,
  IconUsers,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import {
  COHORTS,
  PENGAJUAN_KOREKSI,
  PERIODE_AKTIF,
  STUDENTS,
  kelengkapanMatriks,
  labelPeriode,
  ringkas,
  transkripOf,
} from '../../lib/mockData'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'

/* --------------------------------------------------------------------------
   Halaman pertama yang dilihat dosen dan staf kemahasiswaan.

   Sengaja dibuat tenang: sedikit angka, huruf besar, kalimat biasa, dan tautan
   yang menyebut tujuannya. Grafiknya SATU saja — sebaran huruf mutu — karena
   itulah pertanyaan yang paling sering ditanyakan sekilas. Filter bertingkat,
   tabel padat, dan grafik lainnya tinggal di halaman rincian masing-masing.
   Halaman ini hanya menjawab dua hal: bagaimana keadaannya, dan apa yang perlu
   saya kerjakan.
   -------------------------------------------------------------------------- */

/* Satu angka besar, satu kalimat penjelas, dan — bila bermakna — satu
   persentase dengan bilah tipis. Persentasenya selalu ditulis angkanya, bilah
   hanya membantu membandingkan sekilas. */
function Angka({ nilai, satuan, judul, keterangan, persen, persenLabel }) {
  return (
    <Card className="px-6 py-7">
      <p className="text-[15px] font-semibold text-ink-2">{judul}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[46px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
          {nilai}
        </span>
        {satuan ? <span className="text-[18px] font-semibold text-ink-2">{satuan}</span> : null}
      </p>

      {typeof persen === 'number' ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] text-ink-2">{persenLabel}</span>
            <span className="text-[18px] font-extrabold tabular-nums text-ink">{persen}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--grid)]">
            <div
              className="h-full rounded-full bg-brand-ink"
              style={{ width: Math.max(2, Math.min(100, persen)) + '%' }}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{keterangan}</p>
    </Card>
  )
}

/* Baris tugas: kalimat lengkap, lalu tautan yang menyebut ke mana perginya. */
function Tugas({ jumlah, kalimat, tautan, ke }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-6 py-5 last:border-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-[17px] font-extrabold text-brand-ink tabular-nums">
        {jumlah}
      </span>
      <span className="min-w-[240px] flex-1 text-[15.5px] leading-relaxed text-ink">{kalimat}</span>
      <Link
        href={ke}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] font-bold text-brand-ink underline underline-offset-4 hover:bg-surface-2"
      >
        {tautan}
        <IconChevronRight size={17} />
      </Link>
    </li>
  )
}

/* Tautan ke halaman lain — judul besar, satu kalimat, dan "Lihat selengkapnya". */
function Pintu({ ke, judul, keterangan, icon: Icon }) {
  return (
    <li>
      <Link
        href={ke}
        className="flex h-full flex-col rounded-2xl border border-line bg-surface px-6 py-6 transition hover:border-brand-ink hover:bg-surface-2"
      >
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Icon size={24} />
        </span>
        <span className="mt-4 text-[17px] font-bold text-ink">{judul}</span>
        <span className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{keterangan}</span>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-ink underline underline-offset-4">
          Lihat selengkapnya
          <IconChevronRight size={17} />
        </span>
      </Link>
    </li>
  )
}

export default function Overview() {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const { admin } = useAuth()

  const rows = STUDENTS

  const angka = useMemo(() => ringkas(rows), [rows])

  const belumMasuk = useMemo(() => {
    let sisa = 0
    for (const b of kelengkapanMatriks(rows)) {
      for (const s of Object.values(b.sumber)) sisa += s.total - s.terisi
    }
    return sisa
  }, [rows])

  const koreksi = PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu').length

  const bagi = (n) => (angka.total ? Math.round((n / angka.total) * 100) : 0)
  const persenLengkap = useMemo(() => {
    let terisi = 0
    let total = 0
    for (const b of kelengkapanMatriks(rows)) {
      for (const x of Object.values(b.sumber)) {
        terisi += x.terisi
        total += x.total
      }
    }
    return total ? Math.round((terisi / total) * 100) : 0
  }, [rows])

  const perluPerhatian = useMemo(
    () =>
      rows.filter((s) => {
        if (s.semesterAktif < CONFIG.TOTAL_SEMESTER_PROGRAM) return false
        const n = transkripOf(s).akhir.nilai
        return n != null && n < CONFIG.AMBANG_SERTIFIKAT
      }).length,
    [rows],
  )

  const siapDikunci = useMemo(
    () =>
      COHORTS.filter(
        (c) =>
          c.status === 'aktif' &&
          c.semesterAktif >= CONFIG.TOTAL_SEMESTER_PROGRAM &&
          rows.some((s) => s.angkatanId === c.id),
      ).length,
    [rows],
  )

  const tugas = [
    belumMasuk > 0 && {
      jumlah: belumMasuk.toLocaleString('id-ID'),
      kalimat: 'nilai komponen asesmen belum dimasukkan oleh dosen atau unit penilai.',
      tautan: 'Masukkan nilai',
      ke: '/admin/nilai',
    },
    koreksi > 0 && {
      jumlah: koreksi,
      kalimat: 'pengajuan koreksi nilai dari mahasiswa menunggu keputusan Anda.',
      tautan: 'Tinjau pengajuan',
      ke: '/admin/nilai',
    },
    perluPerhatian > 0 && {
      jumlah: perluPerhatian.toLocaleString('id-ID'),
      kalimat:
        'mahasiswa sudah sampai Semester ' +
        CONFIG.TOTAL_SEMESTER_PROGRAM +
        ' tetapi nilainya masih di bawah ' +
        CONFIG.AMBANG_SERTIFIKAT +
        ', sehingga belum berhak atas sertifikat.',
      tautan: 'Lihat daftarnya',
      ke: '/admin/mahasiswa',
    },
    siapDikunci > 0 && {
      jumlah: siapDikunci,
      kalimat: 'angkatan sudah menuntaskan tiga semester dan bisa dikunci untuk penerbitan sertifikat.',
      tautan: 'Buka angkatan',
      ke: '/admin/angkatan',
    },
  ].filter(Boolean)

  return (
    <div className="space-y-8">
      {/* --------------------------------- kepala -------------------------------- */}
      <header>
        <h1 className="text-[25px] font-extrabold leading-tight tracking-tight text-ink">Overview</h1>
      </header>

      {/* --------------------------------- angka --------------------------------- */}
      <section className="grid gap-5 md:grid-cols-3">
        <Angka
          judul="Mahasiswa terpantau"
          nilai={angka.total.toLocaleString('id-ID')}
          persen={persenLengkap}
          persenLabel="Nilai yang sudah masuk"
          // keterangan="Tersebar di empat fakultas, angkatan 2024 sampai 2026."
        />
        <Angka
          judul="Rata-rata nilai softskill"
          nilai={angka.rata ?? '—'}
          satuan="dari 100"
          persen={bagi(angka.diAtasAmbang)}
          persenLabel={'Di atas batas ' + CONFIG.AMBANG_SERTIFIKAT}
          // keterangan={'Batas kelulusan pembinaan adalah ' + CONFIG.AMBANG_SERTIFIKAT + '.'}
        />
        <Angka
          judul="Nilai sudah final"
          nilai={angka.final.toLocaleString('id-ID')}
          satuan={'dari ' + angka.total.toLocaleString('id-ID')}
          persen={bagi(angka.final)}
          persenLabel="Sudah dikunci"
          // keterangan="Mahasiswa yang seluruh sepuluh aspeknya sudah dinilai dan dikunci."
        />
      </section>

      {/* -------------------------------- sebaran -------------------------------- */}
      <section>
        <MutuDonut huruf={angka.huruf} totalMahasiswa={angka.total} />
      </section>

      {/* ---------------------------- perlu dikerjakan --------------------------- */}
      <section>
        <h2 className="mb-3 text-[25px] font-extrabold tracking-tight text-ink">Requires Review</h2>
        <Card className="overflow-hidden">
          {tugas.length ? (
            <ul>
              {tugas.map((t) => (
                <Tugas key={t.tautan + t.kalimat} {...t} />
              ))}
            </ul>
          ) : (
            <p className="px-6 py-8 text-[15.5px] leading-relaxed text-ink-2">
              Tidak ada pekerjaan yang tertunda. Seluruh nilai sudah masuk dan tidak ada pengajuan koreksi.
            </p>
          )}
        </Card>
      </section>

      {/* ------------------------------ halaman lain ----------------------------- */}
      <section>
        <h2 className="mb-3 text-[25px] font-extrabold tracking-tight text-ink">More Pages</h2>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Pintu
            ke="/admin/nilai"
            icon={IconUpload}
            judul="Input &amp; Import Nilai"
            keterangan="Masukkan nilai satu per satu, atau unggah rekap dari Excel."
          />
          <Pintu
            ke="/admin/mahasiswa"
            icon={IconUsers}
            judul="Data Mahasiswa"
            keterangan="Cari mahasiswa, lihat nilainya, dan buka transkrip lengkapnya."
          />
          <Pintu
            ke="/admin/program-studi"
            icon={IconBuilding}
            judul="Program Studi"
            keterangan="Bandingkan capaian antar program studi, fakultas, dan angkatan."
          />
          <Pintu
            ke="/admin/angkatan"
            icon={IconCertificate}
            judul="Angkatan &amp; Sertifikat"
            keterangan="Kunci angkatan yang sudah selesai, lalu terbitkan sertifikatnya."
          />
          <Pintu
            ke="/admin/kurikulum"
            icon={IconDocument}
            judul="Kurikulum CPMK"
            keterangan="Sepuluh aspek penilaian, komponen asesmen, dan bobotnya."
          />
          <Pintu
            ke="/admin/log"
            icon={IconList}
            judul="Log Aktivitas"
            keterangan="Catatan setiap perubahan nilai beserta siapa yang mengubahnya."
          />
        </ul>
      </section>
    </div>
  )
}
