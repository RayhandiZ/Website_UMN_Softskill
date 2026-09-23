import { SegeraHadir } from '../../components/Ui'
import { useTeks } from '../../lib/bahasa'

export default function Sertifikat() {
  const t = useTeks()
  return (
    <SegeraHadir judul={t('Sertifikat')} fase={5}>
      {t(
        'Daftar periksa lima syarat kelayakan beserta alasannya, pratinjau sertifikat yang masih dikaburkan selama belum layak, dan unduhan A4 lanskap begitu seluruh syarat terpenuhi.',
      )}
    </SegeraHadir>
  )
}
