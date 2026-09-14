import { useMemo, useState } from 'react'
import FilterBar, { DEFAULT_FILTER } from '../../components/FilterBar'
import { Card, CatatanKaki, EmptyState, HurufBadge, ScoreBar, StatTile, Tabs } from '../../components/Ui'
import { IconBuilding, IconDownload, IconGauge, IconUsers } from '../../components/Icons'
import { FACULTIES, byAngkatan, byProgram, filterStudents, ringkas } from '../../lib/mockData'
import { susunCSV, unduhBerkas } from '../../lib/csv'
import { useStore } from '../../lib/store'

export default function Programs() {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [tampilan, setTampilan] = useState('prodi')

  const rows = useMemo(() => filterStudents(filter), [filter])
  const r = useMemo(() => ringkas(rows), [rows])
  const programs = useMemo(() => byProgram(rows), [rows])
  const angkatan = useMemo(() => byAngkatan(rows), [rows])

  const fakultas = useMemo(
    () =>
      FACULTIES.map((f) => {
        const list = rows.filter((s) => s.faculty === f.name)
        return { nama: f.name, prodi: f.programs.length, total: list.length, ...ringkas(list) }
      }).sort((a, b) => (b.rata ?? 0) - (a.rata ?? 0)),
    [rows],
  )

  const daftar =
    tampilan === 'prodi'
      ? programs.map((p) => ({ kunci: p.program, judul: p.program, sub: p.faculty, ...p }))
      : tampilan === 'fakultas'
        ? fakultas.map((f) => ({
            kunci: f.nama,
            judul: 'Fakultas ' + f.nama,
            sub: f.prodi + ' program studi',
            ...f,
          }))
        : angkatan.map((a) => ({
            kunci: a.angkatan.id,
            judul: 'Angkatan ' + a.angkatan.label,
            sub: 'Semester ' + a.angkatan.semesterAktif + ' · ' + a.angkatan.status,
            ...a,
          }))

  /* Sebelumnya tombol ini tidak berbuat apa-apa. Isinya tabel perbandingan
     yang sedang tampil, mengikuti tab dan filter yang aktif. */
  function unduhRekap() {
    unduhBerkas(
      'rekap-' + tampilan + '-' + new Date().toISOString().slice(0, 10) + '.csv',
      susunCSV(
        ['Unit', 'Keterangan', 'Mahasiswa', 'Transkrip final', 'Rata-rata'],
        daftar.map((d) => [d.judul, d.sub, d.total, d.final, d.rata ?? '']),
      ),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Capaian per unit</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            Bandingkan capaian CPMK antar program studi, fakultas, dan angkatan.
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={unduhRekap} disabled={!daftar.length}>
          <IconDownload size={17} />
          Unduh rekap
        </button>
      </div>

      <FilterBar value={filter} onChange={setFilter} withSearch={false} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Unit terpantau"
          value={programs.length}
          icon={IconBuilding}
          hint="Program studi pada filter aktif"
        />
        <StatTile label="Rata-rata gabungan" value={r.rata ?? '—'} unit="/ 100" icon={IconGauge} />
        <StatTile label="Transkrip final" value={r.final} icon={IconUsers} hint={r.total + ' mahasiswa'} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[15px] font-bold leading-tight text-ink">Tabel perbandingan</h2>
            <p className="mt-1 text-[13px] text-ink-2">Pilih satuan analisis lewat tab di sebelah kanan</p>
          </div>
          <Tabs
            value={tampilan}
            onChange={setTampilan}
            items={[
              { value: 'prodi', label: 'Program studi', count: programs.length },
              { value: 'fakultas', label: 'Fakultas', count: fakultas.length },
              { value: 'angkatan', label: 'Angkatan', count: angkatan.length },
            ]}
          />
        </div>

        {daftar.length ? (
          <ul className="divide-y divide-line">
            {daftar.map((d) => (
              <li key={d.kunci} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-[220px] flex-1">
                  <p className="text-[14.5px] font-bold text-ink">{d.judul}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {d.sub} · {d.total} mahasiswa · {d.final} transkrip final
                  </p>
                </div>
                <span className="w-40">
                  {d.rata == null ? (
                    <span className="block h-[10px] rounded-full border border-dashed border-line" />
                  ) : (
                    <ScoreBar value={d.rata} color="var(--c1)" />
                  )}
                </span>
                <HurufBadge nilai={d.rata} />
                <span className="w-9 text-right text-[16px] font-extrabold tabular-nums text-ink">
                  {d.rata ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Tidak ada data pada filter ini">
            Ubah pilihan fakultas, angkatan, atau semester.
          </EmptyState>
        )}

        <div className="px-5 pb-4 sm:px-6">
          <CatatanKaki>
            Angka ini bukan peringkat. Komposisi mata kuliah, jadwal asesmen, dan program kemahasiswaan tiap unit
            berbeda, dan angkatan yang berbeda berada pada semester yang berbeda pula — sehingga jumlah aspek yang
            sudah dinilai tidak sama.
          </CatatanKaki>
        </div>
      </Card>
    </div>
  )
}
