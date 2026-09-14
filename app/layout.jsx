import '../src/index.css'
import { SKRIP_TEMA } from '../src/lib/theme'
import Penyedia from './penyedia'

export const metadata = {
  title: 'Dashboard Monitoring Softskill 5C — UMN',
  description:
    'Pemantauan capaian softskill mahasiswa Universitas Multimedia Nusantara berbasis CPMK terintegrasi.',
}

export const viewport = {
  themeColor: '#12508f',
}

export default function RootLayout({ children }) {
  return (
    /* suppressHydrationWarning wajib di <html>: skrip tema di bawah mengubah
       kelasnya sebelum React menghidrasi, dan tanpa ini React akan melaporkan
       perbedaan yang justru memang disengaja. */
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body>
        <Penyedia>{children}</Penyedia>
      </body>
    </html>
  )
}
