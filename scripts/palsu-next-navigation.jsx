/* --------------------------------------------------------------------------
   Tiruan `next/navigation` untuk uji jsdom.

   Uji di sini merender komponen halaman langsung, tanpa server Next. Modul
   aslinya menolak dipakai di luar router Next, jadi esbuild mengarahkannya ke
   berkas ini (lihat scripts/bundle.cjs).

   Yang ditiru hanya yang benar-benar dipakai aplikasi: jalur aktif, parameter
   rute, dan router yang perpindahannya DICATAT, bukan dijalankan — supaya uji
   bisa memeriksa "apakah penjaga peran melempar ke /masuk" tanpa benar-benar
   berpindah halaman.
   -------------------------------------------------------------------------- */

let jalur = '/'
let parameter = {}

export const rekamNavigasi = []

/** Menyetel rute yang sedang "dibuka" sebelum sebuah komponen dirender. */
export function aturJalur(p, params = {}) {
  jalur = p
  parameter = params
  rekamNavigasi.length = 0
}

export function usePathname() {
  return jalur
}

export function useParams() {
  return parameter
}

export function useSearchParams() {
  return new URLSearchParams()
}

export function useRouter() {
  return {
    push: (u) => rekamNavigasi.push({ cara: 'push', ke: u }),
    replace: (u) => rekamNavigasi.push({ cara: 'replace', ke: u }),
    back: () => rekamNavigasi.push({ cara: 'back' }),
    forward: () => rekamNavigasi.push({ cara: 'forward' }),
    refresh: () => {},
    prefetch: () => {},
  }
}

export function redirect(u) {
  rekamNavigasi.push({ cara: 'redirect', ke: u })
}

export function notFound() {
  rekamNavigasi.push({ cara: 'notFound' })
}
