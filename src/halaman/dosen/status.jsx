import { Badge } from '../../components/Ui'
import { IconAlert, IconCheck, IconClock, IconInbox } from '../../components/Icons'
import { useTeks } from '../../lib/bahasa'

/* --------------------------------------------------------------------------
   Rupa keempat status pengumpulan — ditulis sekali, dipakai tiga halaman.

   Warnanya status, bukan kategori: hijau/kuning/merah di sini berarti keadaan,
   dan karena itu SELALU datang bersama ikon dan tulisannya. Pembaca yang tidak
   bisa membedakan merah dari hijau tetap membaca kata "Ditolak", dan halaman
   yang dicetak hitam-putih tetap terbaca.
   -------------------------------------------------------------------------- */

export const RUPA_STATUS = {
  masuk: {
    label: 'Belum dinilai',
    tone: 'neutral',
    icon: IconInbox,
    rinci: 'Berkasnya sudah masuk, menunggu Anda menilai.',
  },
  menunggu: {
    label: 'Menunggu persetujuan',
    tone: 'warning',
    icon: IconClock,
    rinci: 'Sudah Anda usulkan; Kemahasiswaan belum memutuskan.',
  },
  dinilai: {
    label: 'Tercatat',
    tone: 'good',
    icon: IconCheck,
    rinci: 'Disetujui dan sudah masuk transkrip mahasiswa.',
  },
  ditolak: {
    label: 'Ditolak',
    tone: 'critical',
    icon: IconAlert,
    rinci: 'Usulan terakhirnya ditolak. Perlu diusulkan ulang.',
  },
}

export function LencanaStatus({ id }) {
  const t = useTeks()
  const r = RUPA_STATUS[id] ?? RUPA_STATUS.masuk
  return (
    <Badge tone={r.tone} icon={r.icon}>
      {t(r.label)}
    </Badge>
  )
}

export const URUTAN_STATUS = ['masuk', 'menunggu', 'ditolak', 'dinilai']
