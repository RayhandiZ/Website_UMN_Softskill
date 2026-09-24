/* --------------------------------------------------------------------------
   Kurva monoton kubik (Fritsch-Carlson).

   KENAPA BUKAN SPLINE BIASA. Kurva mulus yang umum dipakai -- Catmull-Rom dan
   sejenisnya -- MELAMPAUI titik datanya di sekitar tikungan. Pada grafik nilai,
   lampauan itu bukan sekadar soal rupa: mahasiswa bernilai 86, 85, 86 akan
   melihat kurvanya turun menyentuh 84 di antara dua semester, padahal nilai 84
   tidak pernah ada. Grafik tidak boleh menggambar angka yang tidak terjadi.

   Fritsch-Carlson menjamin itu tidak terjadi: kemiringan di tiap titik dibatasi
   sehingga kurvanya tidak pernah keluar dari rentang dua titik yang diapitnya,
   dan di titik balik kemiringannya dipaksa nol. Hasilnya sama mulusnya, tapi
   setiap koordinat yang digambar benar-benar ada di datanya.

   Ditaruh di lib, bukan di dalam halaman, supaya bisa diuji langsung dengan
   deret yang naik-turun -- justru deret itulah yang membedakannya dari spline
   biasa, dan kebetulan tidak ada satu pun persona demo yang berbentuk begitu.
   -------------------------------------------------------------------------- */

/** Titik masuk berupa {x, y}; hasilnya atribut d untuk sebuah <path>. */
export function jalurMulus(titik) {
  const n = titik.length
  if (n < 2) return ''
  const xy = (k) => k.x.toFixed(2) + ',' + k.y.toFixed(2)
  /* Dua titik tidak punya tikungan untuk dilengkungkan. */
  if (n === 2) return 'M' + xy(titik[0]) + ' L' + xy(titik[1])

  const sekan = []
  for (let i = 0; i < n - 1; i++) {
    sekan.push((titik[i + 1].y - titik[i].y) / (titik[i + 1].x - titik[i].x))
  }

  const m = [sekan[0]]
  for (let i = 1; i < n - 1; i++) {
    /* Tanda berlawanan berarti titik ini puncak atau lembah. Kemiringan nol
       di sana yang membuat kurvanya mendatar, bukan menyeberang. */
    m.push(sekan[i - 1] * sekan[i] <= 0 ? 0 : (sekan[i - 1] + sekan[i]) / 2)
  }
  m.push(sekan[n - 2])

  /* Pembatas Fritsch-Carlson: kemiringan yang terlalu curam ditarik kembali
     ke dalam lingkaran berjari-jari 3, dan di situlah jaminannya berasal. */
  for (let i = 0; i < n - 1; i++) {
    if (sekan[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / sekan[i]
    const b = m[i + 1] / sekan[i]
    const kuadrat = a * a + b * b
    if (kuadrat > 9) {
      const skala = 3 / Math.sqrt(kuadrat)
      m[i] = skala * a * sekan[i]
      m[i + 1] = skala * b * sekan[i]
    }
  }

  let d = 'M' + xy(titik[0])
  for (let i = 0; i < n - 1; i++) {
    const h = titik[i + 1].x - titik[i].x
    const k1 = { x: titik[i].x + h / 3, y: titik[i].y + (m[i] * h) / 3 }
    const k2 = { x: titik[i + 1].x - h / 3, y: titik[i + 1].y - (m[i + 1] * h) / 3 }
    d += ' C' + xy(k1) + ' ' + xy(k2) + ' ' + xy(titik[i + 1])
  }
  return d
}
