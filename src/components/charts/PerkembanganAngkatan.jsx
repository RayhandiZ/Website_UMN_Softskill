import { useMemo } from 'react'
import ChartFrame from './ChartFrame'
import { CONFIG } from '../../lib/config'
import { COHORTS, transkripOf } from '../../lib/mockData'
import { useTeks } from '../../lib/bahasa'

// Tiap angkatan dipisah: gabungannya mencampur orang yang berbeda di tiap semester.
// Batang dari nol: sumbu terpotong membuat 75 dan 82 tampak berselisih dua kali lipat.

// Tinggi bidang batang, dan ruang di atasnya untuk angka pada batang bernilai 100.
const TINGGI = 120
const RUANG_ANGKA = 22

/** Rata-rata nilai tiap semester untuk satu angkatan. */
function jejakAngkatan(rows) {
  const titik = []
  for (let sem = 1; sem <= CONFIG.TOTAL_SEMESTER_PROGRAM; sem++) {
    const nilai = rows.map((s) => transkripOf(s).semester[sem]?.nilai).filter((n) => n != null)
    if (nilai.length) {
      titik.push({ sem, nilai: Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length), n: nilai.length })
    }
  }
  return titik
}

function ringkasSelisih(t, titik) {
  const awal = titik[0]
  const d = titik[titik.length - 1].nilai - awal.nilai
  if (d === 0) return t('Tetap sejak Semester {n}', { n: awal.sem })
  return d > 0
    ? t('Naik {d} sejak Semester {n}', { d, n: awal.sem })
    : t('Turun {d} sejak Semester {n}', { d: -d, n: awal.sem })
}

function Panel({ angkatan, titik }) {
  const t = useTeks()
  const ambang = CONFIG.AMBANG_SERTIFIKAT

  const slot = []
  for (let sem = 1; sem <= CONFIG.TOTAL_SEMESTER_PROGRAM; sem++) {
    slot.push(titik.find((k) => k.sem === sem) ?? { sem, nilai: null })
  }

  const keadaan =
    angkatan.status === 'terkunci'
      ? t('Sudah tamat')
      : t('Sedang di Semester {n}', { n: angkatan.semesterAktif })

  return (
    <div className="rounded-xl border border-line px-4 pb-3 pt-3.5">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[14px] font-bold text-ink">{angkatan.label}</span>
        {/* Tanpa pembanding, kalimatnya keterangan, bukan jawaban: tidak ditebalkan. */}
        {titik.length < 2 ? (
          <span className="text-[12.5px] text-ink-2">{t('Baru satu semester, belum ada pembanding')}</span>
        ) : (
          <span className="text-[12.5px] font-bold text-ink">{ringkasSelisih(t, titik)}</span>
        )}
      </p>
      <p className="mt-0.5 text-[11.5px] text-ink-2">{keadaan}</p>

      {/* Pembaca layar mendapat satu kalimat per panel; isi di dalamnya hanya gambar. */}
      <div
        role="img"
        aria-label={slot
          .map((s) => t('Semester {n}', { n: s.sem }) + ': ' + (s.nilai ?? t('Belum dibuka')))
          .join(', ')}
        className="relative mt-3"
        style={{ height: TINGGI + RUANG_ANGKA }}
      >
        {/* Putus-putus hanya untuk ambang, supaya tidak terbaca sebagai garis bantu. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-dashed border-ink-2"
          style={{ bottom: (ambang / 100) * TINGGI }}
        />
        {/* Label langsung di garisnya; di ponsel keterangan bawah ada empat panel jauhnya. */}
        <span
          aria-hidden="true"
          className="absolute left-0 translate-y-1/2 bg-surface pr-1 text-[10.5px] font-semibold leading-none text-ink-2"
          style={{ bottom: (ambang / 100) * TINGGI }}
        >
          {ambang}
        </span>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 border-t border-line-strong" />

        <div className="absolute inset-0 flex">
          {slot.map((s) => (
            <div key={s.sem} className="flex h-full flex-1 flex-col items-center justify-end">
              {s.nilai != null ? (
                <>
                  {/* Berlatar kartu supaya garis ambang tidak mencoret angka
                      pada batang yang berada di bawah ambang. */}
                  <span className="mb-1 bg-surface px-0.5 text-[12.5px] font-bold leading-none text-ink">
                    {s.nilai}
                  </span>
                  <span
                    title={
                      t('Semester {n}', { n: s.sem }) + ': ' + s.nilai + ' · ' + t('{n} mahasiswa', { n: s.n })
                    }
                    className="block w-6 rounded-t-[4px]"
                    style={{
                      height: (s.nilai / 100) * TINGGI,
                      // Ramp token hanya tiga langkah; semester keempat, kalau ada, jatuh ke warna merek.
                      background: 'var(--semester-' + s.sem + ', var(--brand-ink))',
                    }}
                  />
                </>
              ) : (
                // Semester yang belum dibuka tidak digambar sebagai batang nol (R2).
                <span className="mb-2 text-center text-[11px] leading-tight text-ink-2">
                  {t('Belum dibuka')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="mt-1.5 flex">
        {slot.map((s) => (
          <span key={s.sem} className="flex-1 whitespace-nowrap text-center text-[11.5px] text-ink-2">
            {t('Semester {n}', { n: s.sem })}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PerkembanganAngkatan({ rows }) {
  const t = useTeks()

  // Angkatan tertua dulu: yang jejaknya sudah lengkap menjawab pertanyaannya lebih dulu.
  const panel = useMemo(
    () =>
      [...COHORTS]
        .reverse()
        .map((angkatan) => {
          const anggota = rows.filter((s) => s.angkatanId === angkatan.id)
          return { angkatan, jumlah: anggota.length, titik: jejakAngkatan(anggota) }
        })
        .filter((p) => p.titik.length),
    [rows],
  )

  const tabel = {
    head: ['Angkatan', 'Mahasiswa', 'Semester 1', 'Semester 2', 'Semester 3', 'Selisih'],
    rows: panel.map((p) => {
      const per = (sem) => p.titik.find((k) => k.sem === sem)?.nilai ?? '-'
      const d = p.titik[p.titik.length - 1].nilai - p.titik[0].nilai
      const selisih = p.titik.length < 2 ? '-' : (d > 0 ? '+' : '') + d
      return [p.angkatan.label, p.jumlah, per(1), per(2), per(3), selisih]
    }),
  }

  return (
    <ChartFrame
      title="Perkembangan nilai tiap angkatan"
      subtitle="Rata-rata Semester 1 sampai 3. Tiap angkatan dipisah karena isinya mahasiswa yang berbeda, jadi menggabungkannya akan mencampur perkembangan dengan pergantian angkatan."
      table={panel.length ? tabel : null}
      height={200}
    >
      {panel.length ? (
        <>
          <div className="grid gap-4 px-3 sm:grid-cols-2">
            {panel.map((p) => (
              <Panel key={p.angkatan.id} angkatan={p.angkatan} titik={p.titik} />
            ))}
          </div>
          <p className="mt-3 px-3 text-[11.5px] leading-snug text-ink-2">
            {t('Skala 0 sampai 100, sama untuk semua panel. Garis putus-putus: ambang kelulusan {ambang}.', {
              ambang: CONFIG.AMBANG_SERTIFIKAT,
            })}
          </p>
        </>
      ) : (
        // Kosong berarti belum ada nilai yang masuk, bukan galat.
        <p className="px-3 py-6 text-[13px] leading-relaxed text-ink-2">
          {t('Belum ada nilai semester yang masuk, jadi perkembangan belum bisa dihitung. Masukkan nilai lewat halaman Input & Import Nilai, atau setujui usulan nilai dari dosen.')}
        </p>
      )}
    </ChartFrame>
  )
}
