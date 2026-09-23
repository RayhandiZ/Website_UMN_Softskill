const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const w = dom.window
w.matchMedia = (q) => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} })
w.scrollTo = () => {}
for (const k of ['document','navigator','localStorage','HTMLElement','Element','Node','MutationObserver','requestAnimationFrame','cancelAnimationFrame','SVGElement','ResizeObserver','HTMLInputElement','HTMLSelectElement','Image','FileReader','File','Blob','Event','MouseEvent','KeyboardEvent']) global[k] = w[k]
global.window = w
global.IS_REACT_ACT_ENVIRONMENT = true
w.IS_REACT_ACT_ENVIRONMENT = true
global.ResizeObserver = w.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} }
w.ResizeObserver = global.ResizeObserver

const SESI = { student: JSON.stringify({ role:'student', email:'a@student.umn.ac.id', name:'X', initials:'RZ' }),
               admin:   JSON.stringify({ role:'admin',   email:'a@umn.ac.id', name:'Y', initials:'KH' }),
               dosen:   JSON.stringify({ role:'dosen',   email:'suryasari@lecturer.umn.ac.id', name:'Suryasari, S.Kom., M.MSI.',
                                         initials:'SU', nip:'0312078801', sumber:'MK', semester:1, prodi:'Sistem Informasi' }) }

const ISI = {
  '/mahasiswa': [
    [/Nilai akhir/, 'ubin nilai akhir ada'],
    [/(Sementara|Final)[\s\S]{0,40}berdasarkan \d+ dari \d+ aspek/, 'nilai akhir disertai status dan dasar hitungnya (R3)'],
    [/Aspek dinilai[\s\S]{0,80}\/ \d+/, 'ubin jumlah aspek dinilai'],
    [/Semua \d+[\s\S]{0,60}Final \d+[\s\S]{0,60}Berjalan \d+[\s\S]{0,60}Terkunci \d+/, 'tab aspek lengkap dengan jumlahnya'],
    [/Perjalanan semester/, 'perjalanan semester ada'],
    /* Komponen yang belum dinilai pindah ke lonceng bilah atas — kartunya
       tidak boleh tertinggal di badan halaman. */
    [/<h2[^>]*>Belum dinilai<\/h2>/, 'kartu Belum dinilai tidak lagi di badan halaman', false, true],
    [/aria-label="\d+ komponen belum dinilai"/, 'lonceng Belum dinilai ada di bilah atas', true, true],
    [/Sertifikat[\s\S]{0,60}(Siap diunduh|Belum tersedia)/, 'status sertifikat tetap terlihat'],
    /* Ditambatkan ke elemen <footer>, bukan ke judul bagiannya: judulnya teks
       yang bebas diganti ("Pintasan" pernah menjadi "Short Cuts"), sedangkan
       keberadaan pintasannya sendiri yang ingin dijaga. */
    [/<footer[\s\S]*?Peta Perjalanan[\s\S]{0,900}Riwayat/, 'footer punya pintasan berikon', true, true],
    [/Helpdesk[\s\S]{0,300}softskill@umn\.ac\.id/, 'helpdesk dan kontak tercantum'],
    [/Akses Cepat/, 'tidak ada lagi blok tombol mati', false],
    /* Aksesoris rujukan yang sengaja tidak dibawa. */
    [/<input[^>]*type="search"/, 'tidak ada kotak pencarian hiasan', false, true],
    [/Upgrade|Kalender/, 'tidak ada kartu promosi atau kalender kosong', false],
  ],
  '/admin': [
    /* Kartu "Requires Review" dilebur ke lonceng — isinya mengulang angka yang
       sama dengan daftar "Belum dinilai" di sana. */
    [/Requires Review/, 'kartu Requires Review sudah tidak ada di Ringkasan', false],
    [/(Lihat selengkapnya[\s\S]*){6}/, 'enam tautan Lihat selengkapnya ke halaman lain'],
    [/Mahasiswa terpantau[\s\S]{0,400}Rata-rata nilai softskill[\s\S]{0,400}Nilai sudah final/, 'hanya tiga angka utama'],
    /* Catatan "bobot sementara" DIHAPUS dari halaman oleh pemilik proyek, jadi
       pemeriksaannya ikut dilepas — bukan karena tidak penting. Kalimat itu yang
       dulu memberi tahu bahwa rata-rata masih memakai bobot MENUNGGU_KONFIRMASI
       dan bisa berubah. Bila nanti dipasang lagi, kembalikan baris ini. */
    [/Grafik Sebaran Aspek/, 'ada satu grafik sebaran'],
    [/Nilai yang sudah masuk[\s\S]{0,40}%/, 'persentase nilai yang sudah masuk'],
    [/Di atas batas 70[\s\S]{0,40}%/, 'persentase di atas batas kelulusan'],
    [/Sudah dikunci[\s\S]{0,40}%/, 'persentase nilai yang sudah final'],
    [/Huruf A[\s\S]{0,200}Huruf B[\s\S]{0,200}Huruf C/, 'tiap irisan diberi label huruf, bukan warna saja'],
    [/sudah dinilai/, 'pusat donat menyebut dasar penghitungannya'],
    [/Kelengkapan nilai/, 'tidak ada lagi tabel kelengkapan padat', false],
    [/Rata-rata per aspek CPMK/, 'tidak ada lagi bar sepuluh aspek', false],
    [/Fakultas[\s\S]{0,60}Program studi[\s\S]{0,60}Angkatan[\s\S]{0,60}Semester/, 'tidak ada filter bertingkat', false],
  ],
  '/mahasiswa/riwayat': [
    [/FASE 4|Segera hadir/i, 'bukan lagi halaman segera hadir', false],
    [/Riwayat penilaian/, 'ada daftar riwayat penilaian'],
    [/disetujui oleh/, 'komponen final menyebut siapa yang menyetujui'],
    [/dari (PDP|MK Humaniora|Kemahasiswaan)/, 'tiap catatan menyebut jalur penilaiannya'],
    [/Final berarti aspeknya sudah dikunci/, 'arti Final dijelaskan'],
    /* Yang belum dinilai tempatnya di lonceng, bukan di riwayat. */
    [/belum masuk/, 'komponen yang belum dinilai tidak ikut masuk riwayat', false],
  ],
  '/mahasiswa/peta': [
    [/FASE 4|Segera hadir/i, 'bukan lagi halaman segera hadir', false],
    [/Anda sedang menjalani Semester 2 dari 3/, 'posisi mahasiswa disebut di kepala halaman'],
    [/Anda di sini/, 'penanda posisi ada'],
    [/Anda di sini[\s\S]*Anda di sini/, 'penanda posisi hanya satu', false],
    [/Pancasila[\s\S]{0,4000}Teamwork/, 'semester berjalan terbuka lebih dulu'],
    [/Religiositas|Civics/, 'semester lain tertutup saat halaman dibuka', false],
  ],
  '/mahasiswa/profil': [
    [/Nomor induk mahasiswa/, 'NIM tercantum di profil mahasiswa'],
    [/Umum/, 'bagian Umum ada'],
    [/Foto profil/, 'bagian Foto profil ada'],
    [/Akademik/, 'bagian Akademik ada'],
    [/Opsional/, 'bagian Opsional ada'],
    [/Seret berkas ke sini/, 'area seret-dan-lepas foto tersedia'],
    [/Perbarui profil/, 'ada tombol simpan yang benar-benar menyimpan'],
    /* Inti pembedaan kolom: data milik institusi tidak boleh pernah dirender
       sebagai kendali yang bisa diketik. Kalau email atau NIM sampai muncul di
       dalam <input>, seseorang bisa menampilkan identitas orang lain. */
    [/<input[^>]*type="tel"/, 'kolom telepon memang sebuah input', true, true],
    [/<input[^>]*student\.umn\.ac\.id/, 'email tidak pernah menjadi kolom isian', false, true],
    [/<input[^>]*value="\d{9,}"/, 'NIM tidak pernah menjadi kolom isian', false, true],
  ],
  '/admin/profil': [
    [/Unit pengelola/, 'identitas unit tercantum'],
    [/Penanggung jawab/, 'penanggung jawab tercantum'],
    [/Periode kerja/, 'bagian Periode kerja ada'],
    [/Perbarui profil/, 'ada tombol simpan yang benar-benar menyimpan'],
    [/<input[^>]*type="tel"/, 'kolom telepon memang sebuah input', true, true],
    [/<input[^>]*kemahasiswaan@umn\.ac\.id/, 'email unit tidak pernah menjadi kolom isian', false, true],
  ],
  '/admin/nilai': [
    [/Pilih semester terlebih dahulu/, 'gerbang semester menutup area kerja'],
    [/Semester wajib dipilih sebelum data bisa dimasukkan/, 'dropdown semester ditandai wajib'],
    [/Semester 1 .*3 aspek/, 'tiap pilihan semester menyebut jumlah aspeknya'],
  ],

  '/dosen': [
    [/Pengumpulan masuk/, 'judul halaman pengumpulan'],
    [/Menunggu dinilai/, 'angka utama: yang belum dinilai'],
    [/Nilai tidak pernah datang dari mahasiswa/, 'R8 dinyatakan di halaman dosen'],
    [/MK Humaniora Semester 1, Sistem Informasi/, 'kelas yang dipegang disebut di kerangka'],
    [/Tugas yang dikumpulkan/, 'kolom tugas ada di tabel'],
    [/Belum dinilai/, 'status pengumpulan berlabel, bukan warna saja'],
    [/tidak langsung masuk transkrip/, 'dijelaskan bahwa nilainya perlu disetujui'],
    [/aria-label="Nilai untuk /, 'tidak ada kolom nilai di daftar pengumpulan', false, true],
  ],

  '/dosen/nilai': [
    [/Pilih tugas yang dinilai/, 'langkah pertama: memilih tugas'],
    [/Isi nilainya/, 'langkah kedua: mengisi nilai'],
    [/Manual/, 'ada cara manual'],
    [/Otomatis/, 'ada cara otomatis'],
    [/Kirim untuk disetujui/, 'tombolnya berbunyi kirim, bukan simpan'],
    [/Simpan nilai/, 'tidak ada tombol simpan langsung', false],
    [/belum terlihat oleh mahasiswa/, 'akibat pengiriman dijelaskan'],
    [/aria-label="Nilai untuk /, 'tiap kotak nilai punya label untuk pembaca layar', true, true],
  ],

  '/dosen/usulan': [
    [/Status usulan/, 'judul halaman status'],
    [/Menunggu keputusan/, 'angka utama: yang menunggu diputuskan'],
  ],

  '/admin/usulan': [
    [/Persetujuan nilai dosen/, 'judul halaman persetujuan'],
    [/Usulan menunggu keputusan/, 'angka utama: usulan yang tertahan'],
    [/Rahmat Nugroho/, 'usulan dosen pertama tampil'],
    [/Maria Ulfah/, 'usulan dosen kedua tampil'],
    [/Tidak satu pun sudah masuk transkrip/, 'ditegaskan nilainya masih tertahan'],
    [/Sudah diputuskan/, 'ada tab riwayat keputusan'],
  ],
}

const RUTE = [
  ['student', '/mahasiswa', 'Ringkasan mahasiswa'],
  ['student', '/mahasiswa/transkrip', 'Transkrip'],
  ['student', '/mahasiswa/peta', 'Peta Perjalanan'],
  ['student', '/mahasiswa/riwayat', 'History'],
  ['student', '/mahasiswa/sertifikat', 'Sertifikat'],
  ['student', '/mahasiswa/profil', 'Profil mahasiswa'],
  ['admin', '/admin', 'Ringkasan admin'],
  ['admin', '/admin/mahasiswa', 'Data mahasiswa'],
  ['admin', '/admin/mahasiswa/DEMO-3', 'Detail mahasiswa'],
  ['admin', '/admin/program-studi', 'Program studi'],
  ['admin', '/admin/nilai', 'Input nilai'],
  ['admin', '/admin/profil', 'Profil admin'],
  ['admin', '/admin/usulan', 'Persetujuan nilai dosen'],
  ['dosen', '/dosen', 'Pengumpulan masuk'],
  ['dosen', '/dosen/nilai', 'Input nilai dosen'],
  ['dosen', '/dosen/usulan', 'Status usulan dosen'],
  ['dosen', '/dosen/profil', 'Profil dosen'],
]

;(async () => {
  const bundle = require('./bundle.cjs')
  const mod = require(bundle('smoke.jsx', '.smoke.cjs', { platform: 'browser', format: 'cjs', loader: { '.jsx': 'jsx' }, jsx: 'automatic' }))
  const { render, daftarUji, ujiMenuHp, ujiAspek, ujiRingkasHp, ujiPeta, ujiRiwayat, ujiLoncengAdmin, ujiSasaranInput, ujiKeputusanKoreksi, ujiSasaranDanTanda, ujiPenyuntingFoto, ujiSegarkanData, ujiLaciAdmin, ujiStatusData, ujiLipatOverview, ujiAlurDosen, ujiBahasa, ujiSeretBahasa, ujiLayanan, ujiPanelLain, perAngkatan, BATAS_BARIS_ASPEK } = mod
  let gagal = 0
  for (const [peran, rute, nama] of RUTE) {
    w.localStorage.setItem('sk5c.session', SESI[peran])
    try {
      const html = await render(rute)
      const err = html.includes('Aplikasi gagal dimuat')
      if (err) { gagal++; console.log('GAGAL  ' + rute + '  ' + html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,180)) }
      else {
        console.log('OK     ' + rute.padEnd(30) + String(html.length).padStart(7) + ' char   ' + nama)
        const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
        /* Slot keempat: uji terhadap MARKUP MENTAH, bukan teks. Tanpa ini pola
           berbentuk tag seperti /<input[^>]*email/ tidak akan pernah cocok
           karena seluruh tag sudah dibuang di baris atas — dan pemeriksaan
           negatifnya akan selalu "lulus" tanpa benar-benar memeriksa apa pun. */
        for (const [pola, keterangan, harusAda = true, mentah = false] of (ISI[rute] || [])) {
          const ada = pola.test(mentah ? html : teks)
          const ok = harusAda ? ada : !ada
          if (!ok) gagal++
          console.log('       ' + (ok ? 'v ' : 'x ') + keterangan)
        }
      }
    } catch (e) { gagal++; console.log('CRASH  ' + rute + '  ' + e.message) }
  }
  /* Identitas panel mahasiswa harus mengikuti sesi, bukan persona bawaan. */
  console.log('')
  for (const m of daftarUji()) {
    w.localStorage.setItem(
      'sk5c.session',
      JSON.stringify({ role: 'student', studentId: m.id, nim: m.nim, email: m.email, name: m.name, initials: 'XX' }),
    )
    const html = await render('/mahasiswa')
    const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const namaTampil = teks.includes(m.name)
    const nimTampil = teks.includes(m.nim)
    /* Kebocoran identitas diperiksa lewat NIM, bukan nama. Nama pengembang
       kebetulan sama dengan nama persona demo dan tercantum di baris hak cipta
       footer, sehingga pemeriksaan berbasis nama akan salah menuduh. NIM unik
       dan tidak pernah muncul di luar area identitas. */
    const nimPersona = daftarUji()[0].nim
    const bukanPersona = m.nim === nimPersona || !teks.includes(nimPersona)
    const ok = namaTampil && nimTampil && bukanPersona
    if (!ok) gagal++
    console.log(
      (ok ? 'OK     ' : 'GAGAL  ') + 'sesi ' + m.email.padEnd(36) +
        'menampilkan ' + m.name + ' (' + m.nim + ')' + (bukanPersona ? '' : ' TAPI IDENTITAS PERSONA BOCOR'),
    )
  }

  /* --------------------------- sinkronisasi foto --------------------------- */
  /* Foto yang disimpan di halaman profil harus muncul di SETIAP avatar pemilik
     sesi, bukan hanya di halaman profilnya. Pernah lolos sebaliknya: fotonya
     tersimpan rapi, tetapi avatar pojok kanan tetap menampilkan inisial karena
     Avatar tidak pernah membaca simpanan itu. */
  console.log('')
  const mFoto = daftarUji()[0]
  const TANDA = 'data:image/webp;base64,UJIFOTO'
  w.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', studentId: mFoto.id, nim: mFoto.nim, email: mFoto.email, name: mFoto.name, initials: 'XX' }),
  )
  mod.simpanProfil(mod.kunciSesi({ role: 'student', nim: mFoto.nim }), { foto: TANDA })

  for (const [rute, minimal] of [['/mahasiswa', 1], ['/mahasiswa/profil', 2]]) {
    const html = await render(rute)
    const jumlah = (html.match(/<img[^>]*UJIFOTO/g) || []).length
    /* Avatar pojok kanan dikenali dari tombol "Menu akun" yang membungkusnya,
       bukan dari ukurannya — ukuran berubah mengikuti desain, perannya tidak. */
    const diNavbar = /aria-label="Menu akun"[^>]*>\s*<img[^>]*UJIFOTO/.test(html)
    const ok = jumlah >= minimal && diNavbar
    if (!ok) gagal++
    console.log(
      (ok ? 'OK     ' : 'GAGAL  ') +
        'foto pada ' + rute.padEnd(24) +
        jumlah + ' avatar memakai foto' +
        (diNavbar ? ' (termasuk pojok kanan)' : ' — AVATAR POJOK KANAN MASIH INISIAL'),
    )
  }

  /* ------------------------------ menu di ponsel --------------------------- */
  console.log('')
  for (const [peran, rute, harapTautan] of [['student', '/mahasiswa', 6], ['admin', '/admin', 9], ['dosen', '/dosen', 4]]) {
    w.localStorage.setItem('sk5c.session', SESI[peran])
    const h = await ujiMenuHp(rute)

    const wajib = [
      ['tombol garis tiga ada', h.adaHamburger],
      ['laci tertutup sebelum disentuh', h.laciTertutupAwal],
      ['laci terbuka setelah ditekan', h.laciTerbuka],
      ['laci memuat ' + harapTautan + ' tautan', h.tautanDiLaci === harapTautan, h.tautanDiLaci],
      ['gulir halaman dikunci selama terbuka', h.gulirTerkunci],
      ['laci menutup setelah memilih tautan', h.laciTertutupSetelahPilih],
      ['gulir pulih setelah ditutup', h.gulirPulih],
    ]
    const rusak = wajib.filter(([, ok]) => !ok)
    if (rusak.length) gagal += rusak.length
    console.log((rusak.length ? 'GAGAL  ' : 'OK     ') + 'menu ponsel ' + rute)
    for (const [ket, ok, rinci] of wajib) {
      console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
    }
  }

  /* ------------------------- aspek di dashboard mahasiswa ------------------ */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const ha = await ujiAspek('/mahasiswa')
  const cekAspek = [
    /* Tab menulis jumlah SEBENARNYA; yang tampil dibatasi BATAS_BARIS_ASPEK.
       Bila ada yang terpotong, tautan bawah wajib menyebut berapa sisanya —
       kalau tidak, lima baris itu terbaca seolah seluruh aspeknya. */
    ...Object.entries(ha.tabSesuai).map(([nama, x]) => {
      const harap = Math.min(x.tertulis, BATAS_BARIS_ASPEK)
      const sisa = x.tertulis - harap
      /* Label tautannya ditentukan pemilik proyek: "Lihat Selengkapnya" saat
         masih ada sisa, "Lihat transkrip lengkap" saat semua sudah tampil. */
      const tautanBenar = sisa > 0
        ? x.tautan.some((t) => t.includes('Lihat Selengkapnya'))
        : x.tautan.some((t) => t.includes('Lihat transkrip lengkap'))
      return [
        'tab ' + nama + ': ' + x.tampil + ' dari ' + x.tertulis + ' tampil' + (sisa ? ', tautan menyebut ' + sisa + ' sisanya' : ''),
        x.terpilih && x.tampil === harap && tautanBenar,
        'tertulis ' + x.tertulis + ', tampil ' + x.tampil + ', tautan: ' + x.tautan.join(' | '),
      ]
    }),
    ['rincian tertutup sebelum diketuk', ha.rinciTertutupAwal],
    ['rincian terbuka setelah diketuk', ha.rinciTerbuka],
    ['rincian menutup saat diketuk lagi', ha.rinciTertutupLagi],
  ]
  const rusakAspek = cekAspek.filter(([, ok]) => !ok)
  gagal += rusakAspek.length
  console.log((rusakAspek.length ? 'GAGAL  ' : 'OK     ') + 'aspek di dashboard mahasiswa')
  for (const [ket, ok, rinci] of cekAspek) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok ? '' : '  → ' + rinci))
  }

  /* ------------------------ penghemat gulir di ponsel --------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const hr = await ujiRingkasHp('/mahasiswa')
  const cekRingkas = [
    ['ubin ringkasan terlipat saat dibuka', hr.ubinTerlipatAwal],
    ['ubin membentang setelah Rincian ditekan', hr.ubinTerbuka],
    ['nilai akhir tetap di luar lipatan (R3)', hr.nilaiAkhirTetapDiLuar],
    ['di layar lebar keempat ubin tetap utuh', hr.tetapUtuhDiLayarLebar],
    ['lonceng Belum dinilai ada', hr.adaLonceng],
    ['panel lonceng tertutup sebelum ditekan', hr.panelTertutupAwal],
    ['panel lonceng terbuka setelah ditekan', hr.panelTerbuka],
    ['angka di lonceng sama dengan isi panel', hr.itemDiPanel === hr.angkaLonceng && hr.angkaLonceng > 0,
      'lonceng ' + hr.angkaLonceng + ', panel ' + hr.itemDiPanel],
    ['panel menutup dengan Escape', hr.panelTutupDenganEscape],
  ]
  const rusakRingkas = cekRingkas.filter(([, ok]) => !ok)
  gagal += rusakRingkas.length
  console.log((rusakRingkas.length ? 'GAGAL  ' : 'OK     ') + 'penghemat gulir di ponsel')
  for (const [ket, ok, rinci] of cekRingkas) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* -------------------------------- road map ------------------------------ */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const hp = await ujiPeta('/mahasiswa/peta')
  const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const cekPeta = [
    ['semester berjalan (2) terbuka lebih dulu', sama(hp.awal, [2]), JSON.stringify(hp.awal)],
    ['membuka Semester 1 menutup Semester 2', sama(hp.setelahSem1, [1]), JSON.stringify(hp.setelahSem1)],
    ['Semester 1 memuat kegiatan yang sudah dijalani', /Kegiatan yang sudah dijalani/.test(hp.sem1) && /Religiositas/.test(hp.sem1)],
    ['Semester 3 (terkunci) tetap bisa dibuka', sama(hp.setelahSem3, [3]), JSON.stringify(hp.setelahSem3)],
    ['Semester 3 memperlihatkan kegiatan yang akan datang', /Kegiatan yang akan dijalani/.test(hp.sem3) && /Civics/.test(hp.sem3)],
    /* R2: aspek yang belum dibuka tidak pernah punya angka, dan kegiatannya
       tidak boleh ditulis "belum masuk" seolah terlambat. */
    ['Semester 3 tanpa angka: tiap aspek bertanda gembok', (hp.sem3.match(/Dibuka pada Semester 3/g) || []).length === 3],
    ['Semester 3 tidak menulis "belum masuk"', !/belum masuk/.test(hp.sem3)],
    ['semester bisa ditutup kembali', sama(hp.setelahTutup, []), JSON.stringify(hp.setelahTutup)],
  ]
  const rusakPeta = cekPeta.filter(([, ok]) => !ok)
  gagal += rusakPeta.length
  console.log((rusakPeta.length ? 'GAGAL  ' : 'OK     ') + 'road map')
  for (const [ket, ok, rinci] of cekPeta) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* Road Map untuk tiap posisi semester, bukan hanya persona Semester 2. */
  for (const m of perAngkatan()) {
    w.localStorage.setItem(
      'sk5c.session',
      JSON.stringify({ role: 'student', studentId: m.id, nim: m.nim, email: m.email, name: m.name, initials: 'XX' }),
    )
    const html = await render('/mahasiswa/peta')
    const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const galat = html.includes('Aplikasi gagal dimuat')
    const tamat = m.statusAngkatan === 'terkunci'
    const kalimat = tamat
      ? /Seluruh 3 semester program sudah Anda selesaikan/.test(teks)
      : new RegExp('Anda sedang menjalani Semester ' + m.semesterAktif + ' dari 3').test(teks)
    const penanda = (teks.match(/Anda di sini/g) || []).length === (tamat ? 0 : 1)
    const ok = !galat && kalimat && penanda
    if (!ok) gagal++
    console.log(
      (ok ? 'OK     ' : 'GAGAL  ') + 'road map angkatan ' + m.angkatanLabel.padEnd(11) +
        (tamat ? 'tamat' : 'semester ' + m.semesterAktif) +
        (galat ? ' — GALAT RENDER' : '') + (kalimat ? '' : ' — kalimat posisi salah') + (penanda ? '' : ' — penanda posisi salah'),
    )
  }

  /* --------------------------------- history ------------------------------ */
  console.log('')
  const mR = daftarUji()[0]
  w.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', studentId: mR.id, nim: mR.nim, email: mR.email, name: mR.name, initials: 'XX' }),
  )
  const hh = await ujiRiwayat('/mahasiswa/riwayat')
  const cekRiwayat = [
    ['Final + Sementara = Semua', hh.jumlah.Final + hh.jumlah.Sementara === hh.jumlah.Semua,
      hh.jumlah.Final + ' + ' + hh.jumlah.Sementara + ' vs ' + hh.jumlah.Semua],
    ['tab Semua menampilkan semua catatan', hh.barisSemua === hh.jumlah.Semua, hh.barisSemua + ' baris'],
    ['tab Final menyaring dengan benar', hh.barisFinal === hh.jumlah.Final, hh.barisFinal + ' baris'],
    ['tab Sementara menyaring dengan benar', hh.barisSementara === hh.jumlah.Sementara, hh.barisSementara + ' baris'],
    /* Kata "disetujui" hanya boleh dipakai untuk nilai yang sudah dikunci —
       nilai sementara masih bisa berubah. */
    ['tiap catatan final menyebut siapa yang menyetujui', hh.finalSelaluDisetujui],
    ['catatan sementara tidak pernah disebut disetujui', hh.sementaraTidakDisetujui],
    ['jumlah yang ditunggu sama dengan angka di lonceng', hh.kalimat && hh.kalimat.ditunggu === hh.lonceng,
      hh.kalimat ? hh.kalimat.ditunggu + ' vs lonceng ' + hh.lonceng : 'kalimat tidak ditemukan'],
    ['jumlah yang sudah dinilai sama dengan tab Semua', hh.kalimat && hh.kalimat.dinilai === hh.jumlah.Semua],
    ['pengajuan koreksi mahasiswa ikut tercatat', hh.adaKoreksi],
  ]
  const rusakRiwayat = cekRiwayat.filter(([, ok]) => !ok)
  gagal += rusakRiwayat.length
  console.log((rusakRiwayat.length ? 'GAGAL  ' : 'OK     ') + 'history')
  for (const [ket, ok, rinci] of cekRiwayat) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* ------------------- lonceng Kemahasiswaan → input nilai ----------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hl = await ujiLoncengAdmin()
  const cekLonceng = [
    ['lonceng ada di bilah atas', hl.adaLonceng],
    ['panel tertutup sebelum ditekan', hl.panelTertutupAwal],
    ['panel terbuka setelah ditekan', hl.panelTerbuka],
    ['angka lonceng sama dengan jumlah baris', hl.angka === hl.jumlahBaris, hl.angka + ' vs ' + hl.jumlahBaris],
    ['panel memuat pengajuan koreksi', hl.adaKoreksi],
    ['panel memuat pekerjaan yang belum dinilai', hl.adaBelumDinilai],
    ['panel memuat bagian Perlu ditinjau', hl.adaPerluDitinjau],
    ['mahasiswa di bawah ambang ikut tercatat', hl.adaAmbang],
    ['angkatan siap dikunci ikut tercatat', hl.adaSiapDikunci],
    ['setiap baris menuju halaman yang menanganinya', hl.semuaPunyaTujuan],
  ]

  /* Janji fiturnya: sekali diketuk, sasaran di halaman input sudah terisi. */
  if (hl.tautanKelompok) {
    const h = await ujiSasaranInput(hl.tautanKelompok)
    const semDiminta = 'Semester ' + new URL('http://x' + hl.tautanKelompok).searchParams.get('semester')
    cekLonceng.push(
      ['tautan kelompok membuka area kerja, bukan gerbang semester', !h.gerbangMasihTertutup],
      ['semester ikut terpilih sendiri', h.semesterTerpilih === semDiminta, h.semesterTerpilih + ' vs ' + semDiminta],
    )
  }
  if (hl.tautanTunggal) {
    const q = new URL('http://x' + hl.tautanTunggal).searchParams
    const h = await ujiSasaranInput(hl.tautanTunggal)
    cekLonceng.push(
      ['kelompok satu mahasiswa: NIM terisi di kotak pencarian', h.kotakCari === q.get('cari'),
        h.kotakCari + ' vs ' + q.get('cari')],
      ['kelompok satu mahasiswa: barisnya tampil', h.teks.includes(q.get('cari'))],
    )
  } else {
    cekLonceng.push(['ada kelompok yang tinggal satu mahasiswa untuk diuji', false, 'tidak ditemukan'])
  }

  /* Pengajuan koreksi punya perlakuan sendiri: ia membuka tab koreksi, bukan
     tabel input, jadi yang diperiksa keberadaan barisnya di sana. */
  if (hl.tautanKoreksi) {
    const q = new URL('http://x' + hl.tautanKoreksi).searchParams
    const h = await ujiSasaranInput(hl.tautanKoreksi)
    cekLonceng.push(
      ['koreksi: tab Pengajuan koreksi yang terbuka', /diajukan \d{4}-\d{2}-\d{2}/.test(h.teks)],
      ['koreksi: NIM pengajunya tampil', h.teks.includes(q.get('cari'))],
    )
  }

  const rusakLonceng = cekLonceng.filter(([, ok]) => !ok)
  gagal += rusakLonceng.length
  console.log((rusakLonceng.length ? 'GAGAL  ' : 'OK     ') + 'lonceng Kemahasiswaan')
  for (const [ket, ok, rinci] of cekLonceng) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* Dijalankan PALING AKHIR: menyetujui koreksi mengubah keadaan bersama,
     dan uji lain menghitung berapa pengajuan yang masih menunggu. */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  /* Alamatnya diambil dari lonceng, bukan dikarang — sekaligus membuktikan
     tautan yang dihasilkan lonceng memang membuka tombol keputusannya. */
  const hk = await ujiKeputusanKoreksi(hl.tautanKoreksi ?? '/admin/nilai?tab=koreksi&semester=1&sumber=MK')
  const cekKoreksi = [
    ['tombol Setujui ada di tab koreksi', hk.adaTombol],
    ['menekan Setujui tidak melempar galat', !hk.galat, hk.galat],
    ['pengajuannya berubah menjadi Disetujui', hk.adaLencanaDisetujui],
    ['tombol keputusannya hilang setelah diputuskan', hk.tombolnyaHilang],
  ]
  const rusakKoreksi = cekKoreksi.filter(([, ok]) => !ok)
  gagal += rusakKoreksi.length
  console.log((rusakKoreksi.length ? 'GAGAL  ' : 'OK     ') + 'keputusan pengajuan koreksi')
  for (const [ket, ok, rinci] of cekKoreksi) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci == null ? '' : '  → ' + rinci))
  }

  /* ---------------- sasaran input: prodi, fakultas, dan tanda -------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const ht = await ujiSasaranDanTanda(
    '/admin/nilai?semester=1&sumber=MK&angkatan=2026',
    'Sistem Informasi',
    'Teknik & Informatika',
  )
  const cekTanda = [
    ['kotak Fakultas dan Program studi ada', ht.adaKeduaKotak],
    ['memilih prodi menarik fakultasnya', ht.fakultasIkut, ht.fakultasAwal + ' → ' + ht.fakultasSesudah],
    ['baris mahasiswa menyebut program studinya', ht.barisMenyebutProdi],
    ['tidak ada lagi pilihan status global', ht.tanpaPilihanGlobal],
    ['tombol pensil ada di tiap baris', ht.adaKolomTanda],
    ['pensil mati selama barisnya belum diisi', ht.tandaMatiSebelumDiisi],
    ['pensil hidup setelah barisnya diisi', ht.tandaHidupSetelahDiisi],
    ['baris lain yang belum diisi tetap mati', ht.tandaLainTetapMati],
    ['menu tertutup sebelum pensil ditekan', ht.menuTertutupAwal],
    ['menunya tepat dua pilihan', ht.jumlahPilihan === 2, 'ada ' + ht.jumlahPilihan],
    ['tidak ada lagi "Ikuti pilihan di atas"', ht.tanpaIkutiPilihan],
    ['menunya melayang, bukan di dalam sel', ht.menuMelayang],
    ['menunya memakai lapisan kaca', ht.menuBerkaca],
    ['menunya punya animasi masuk', ht.menuBeranimasi],
    ['tombol tanda rata tengah sebaris kotak nilai', ht.selRataTengah],
    ['memilih Final menandai barisnya', ht.terpilihFinal],
    ['menu menutup sendiri setelah memilih', ht.menuTertutupSesudah],
  ]
  const rusakTanda = cekTanda.filter(([, ok]) => !ok)
  gagal += rusakTanda.length
  console.log((rusakTanda.length ? 'GAGAL  ' : 'OK     ') + 'sasaran input & tanda per baris')
  for (const [ket, ok, rinci] of cekTanda) {
    console.log('       ' + (ok ? 'v ' : 'x ') + ket + (ok || rinci === undefined ? '' : '  → ' + rinci))
  }

  /* ---------------------------- penyunting foto --------------------------- */
  console.log('')
  const mFoto2 = daftarUji()[0]
  w.localStorage.setItem(
    'sk5c.session',
    JSON.stringify({ role: 'student', studentId: mFoto2.id, nim: mFoto2.nim, email: mFoto2.email, name: mFoto2.name, initials: 'XX' }),
  )
  mod.simpanProfil(mod.kunciSesi({ role: 'student', nim: mFoto2.nim }), {
    foto: 'data:image/webp;base64,UJIFOTO',
    fotoSumber: 'data:image/webp;base64,UJISUMBER',
  })
  const hf = await ujiPenyuntingFoto('/mahasiswa/profil')
  const cekFoto = [
    ['ada tombol edit pada foto tersimpan', hf.adaTombolAtur],
    ['penyunting tertutup sebelum ditekan', hf.tertutupAwal],
    ['penyunting terbuka setelah ditekan', hf.terbuka],
    ['ada area geser untuk mengatur posisi', hf.adaAreaGeser],
    ['ada penggeser perbesaran', hf.adaPenggeser],
    ['perbesaran mulai dari 100%', hf.persenAwal],
    ['menggeser mengubah perbesaran jadi 200%', hf.persenBerubah],
    ['penyunting menutup setelah dipakai', hf.tertutupSesudah],
    ['hasilnya masuk sebagai foto siap disimpan', hf.adaPratinjau],
  ]
  const rusakFoto = cekFoto.filter(([, ok]) => !ok)
  gagal += rusakFoto.length
  console.log((rusakFoto.length ? 'GAGAL  ' : 'OK     ') + 'penyunting foto profil')
  for (const [ket, ok] of cekFoto) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------------- segarkan data mahasiswa ---------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hs = await ujiSegarkanData()
  const cekSegar = [
    ['tombol Segarkan data ada', hs.adaTombol],
    ['belum ada penanda waktu sebelum ditekan', hs.tanpaPenandaAwal],
    ['penanda waktu muncul setelah ditekan', hs.adaPenandaSesudah],
    ['daftar mahasiswa tetap utuh setelah disegarkan', hs.daftarTetapAda],
  ]
  const rusakSegar = cekSegar.filter(([, ok]) => !ok)
  gagal += rusakSegar.length
  console.log((rusakSegar.length ? 'GAGAL  ' : 'OK     ') + 'segarkan data mahasiswa')
  for (const [ket, ok] of cekSegar) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* --------------------------- laci panel admin --------------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hla = await ujiLaciAdmin()
  const cekLaci = [
    ['tombol garis tiga ada', hla.adaTombol],
    ['garis tiga tidak disembunyikan di layar lebar', hla.tampilDiLayarLebar],
    ['laci terbuka saat ditekan', hla.terbuka],
    ['panelnya bernada gelap', hla.panelGelap],
    ['ada judul kelompok Workspace dan Rujukan', hla.adaJudulKelompok],
    ['halaman di luar bilah atas ikut tercantum', hla.adaHalamanTersembunyi],
    ['halaman yang sedang dibuka ditandai', hla.adaPenandaAktif],
  ]
  const rusakLaci = cekLaci.filter(([, ok]) => !ok)
  gagal += rusakLaci.length
  console.log((rusakLaci.length ? 'GAGAL  ' : 'OK     ') + 'laci panel Kemahasiswaan')
  for (const [ket, ok] of cekLaci) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* -------------------- penanda kesegaran data panel admin ---------------- */
  /* Paling akhir: uji ini memutuskan satu pengajuan koreksi untuk membuktikan
     penandanya bergeser, dan itu mengubah keadaan bersama. */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hsd = await ujiStatusData()
  const cekStatus = [
    ['penanda "Terakhir diperbarui" tampil', hsd.adaPenanda],
    ['zona waktunya ditulis tegas (WIB)', hsd.adaZona],
    ['ada keterangan relatif yang berdetak', hsd.adaRelatif],
    ['ada tombol segarkan di sebelahnya', hsd.adaTombolSegarkan],
    ['penandanya bergeser saat data berubah', hsd.bergeserSaatDataBerubah],
  ]
  const rusakStatus = cekStatus.filter(([, ok]) => !ok)
  gagal += rusakStatus.length
  console.log((rusakStatus.length ? 'GAGAL  ' : 'OK     ') + 'kesegaran data panel admin')
  for (const [ket, ok] of cekStatus) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------ Ringkasan admin: hemat gulir di ponsel --------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const hlo = await ujiLipatOverview()
  const cekLipat = [
    ['angka: kartu pertama tetap terlihat', hlo.angka.kartuPertamaTetapTampil],
    ['angka: ada kaki lipat di dalam kartu', hlo.angka.adaKaki],
    ['angka: ringkasannya tertulis di kaki itu', hlo.angka.ringkasTertulis],
    ['angka: dua kartu lain terlipat saat dibuka', hlo.angka.terlipatAwal],
    ['angka: membentang setelah ditekan', hlo.angka.terbukaSetelahDitekan],
    ['angka: tetap utuh di layar lebar', hlo.angka.tetapUtuhDiLayarLebar],
    ['angka: kakinya hanya ada di ponsel', hlo.angka.kakiKhususPonsel],
    ['halaman: ada tombol berbentuk kartu', hlo.halaman.adaTombol],
    ['halaman: tombolnya hanya ada di ponsel', hlo.halaman.tombolKhususPonsel],
    ['halaman: enam kartu terlipat saat dibuka', hlo.halaman.terlipatAwal],
    ['halaman: semuanya tampil setelah ditekan', hlo.halaman.tidakAdaYangTersembunyiSesudah],
    ['halaman: tetap utuh di layar lebar', hlo.halaman.tetapUtuhDiLayarLebar],
  ]
  const rusakLipat = cekLipat.filter(([, ok]) => !ok)
  gagal += rusakLipat.length
  console.log((rusakLipat.length ? 'GAGAL  ' : 'OK     ') + 'Ringkasan admin di ponsel')
  for (const [ket, ok] of cekLipat) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------------- Pemilih bahasa ID / EN ------------------------ */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const bh = await ujiBahasa()
  const cekBahasa = [
    ['pemilih ID / EN ada di bilah atas', bh.adaPemilih],
    ['render pertama selalu Indonesia', bh.mulaiIndonesia],
    ['isinya memang Indonesia', bh.isiIndonesia],
    ['menekan EN mengaktifkan Inggris', bh.inggrisAktif],
    ['isi halaman ikut berganti', bh.isiInggris],
    ['judul kartu ikut berganti', bh.judulIkutBerganti],
    ['menu navigasi ikut berganti', bh.menuIkutBerganti],
    ['pilihannya tersimpan', bh.tersimpan],
    ['atribut lang ikut diperbarui', bh.langDiperbarui],
    ['penanda {n} terisi, tidak tampil mentah', bh.penandaTerisi],
    ['bisa kembali ke Indonesia', bh.kembaliIndonesia],
  ]
  const rusakBahasa = cekBahasa.filter(([, ok]) => !ok)
  gagal += rusakBahasa.length
  console.log((rusakBahasa.length ? 'GAGAL  ' : 'OK     ') + 'Pemilih bahasa')
  for (const [ket, ok] of cekBahasa) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------- Bahasa & bantuan di panel admin dan dosen ---------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.admin)
  const pa = await ujiPanelLain('/admin')
  w.localStorage.setItem('sk5c.session', SESI.dosen)
  const pd = await ujiPanelLain('/dosen')
  const cekPanel = [
    ['pemilih bahasa ada di panel Kemahasiswaan', pa.adaPemilihBahasa],
    ['isi panel Kemahasiswaan ikut berganti', pa.isiIkutBerganti],
    ['pemilih bahasa ada di panel dosen', pd.adaPemilihBahasa],
    ['isi panel dosen ikut berganti', pd.isiIkutBerganti],
    ['tombol bantuan ADA di panel dosen', pd.adaTombolBantuan],
    ['tombol bantuan TIDAK ada di panel Kemahasiswaan', !pa.adaTombolBantuan],
  ]
  const rusakPanel = cekPanel.filter(([, ok]) => !ok)
  gagal += rusakPanel.length
  console.log((rusakPanel.length ? 'GAGAL  ' : 'OK     ') + 'Bahasa & bantuan lintas panel')
  for (const [ket, ok] of cekPanel) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ---------------------- Layanan tambahan mengambang ---------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const ly = await ujiLayanan()
  const lyLain = await ujiLayanan('/mahasiswa/transkrip')
  const cekLayanan = [
    ['tombol bantuan ada di panel mahasiswa', ly.adaTombol],
    ['ada juga di halaman lain, bukan cuma dashboard', lyLain.adaTombol],
    ['benar-benar mengambang, bukan ikut tergulir', ly.mengambang],
    ['tidak ikut tercetak bersama transkrip', ly.takIkutTercetak],
    ['lapisannya di bawah laci navigasi', ly.diBawahLaci],
    ['panel tertutup sebelum ditekan', ly.tertutupAwal],
    ['tombolnya menyebut keadaannya', ly.menyebutKeadaan],
    ['panel terbuka setelah ditekan', ly.terbuka],
    ['keadaan tombol ikut berubah', ly.keadaanIkutBerubah],
    ['berisi tiga saluran', ly.tigaSaluran],
    ['ada tautan WhatsApp', ly.adaWhatsapp],
    ['ada tautan telepon', ly.adaTelepon],
    ['ada tautan surel', ly.adaSurel],
    ['nomor tel: tanpa spasi', ly.telSah],
    ['tautan keluar memakai rel noopener', ly.tautanKeluarAman],
    ['jam layanan dicantumkan', ly.adaJamLayanan],
    ['panelnya memakai bahan kaca', ly.berkaca],
    ['barisnya muncul berurutan', ly.berurutanMasuk],
    ['Escape menutup panelnya', ly.escMenutup],
  ]
  const rusakLayanan = cekLayanan.filter(([, ok]) => !ok)
  gagal += rusakLayanan.length
  console.log((rusakLayanan.length ? 'GAGAL  ' : 'OK     ') + 'Layanan tambahan mengambang')
  for (const [ket, ok] of cekLayanan) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ------------------------ Seret pil pemilih bahasa ----------------------- */
  console.log('')
  w.localStorage.setItem('sk5c.session', SESI.student)
  const sb = await ujiSeretBahasa()
  const cekSeret = [
    ['ada pil penanda yang bergerak', sb.adaPil],
    ['pilnya memakai bahan kaca', sb.pilBerkaca],
    ['mulai menempel di segmen kiri', sb.mulaiDiKiri],
    ['KLIK BIASA mengganti bahasa', sb.klikBiasaMengganti],
    ['klik susulan tidak menghitungnya dua kali', sb.klikSusulanDiabaikan],
    ['klik biasa bisa kembali ke segmen kiri', sb.klikBiasaBisaKembali],
    ['pil mengikuti jari saat diseret', sb.pilIkutJari],
    ['transisi dimatikan selama diseret', sb.transisiMatiSaatDiseret],
    ['seret lalu dilepas di kanan: bahasa berganti', sb.seretMengganti],
    ['transisi pulih setelah dilepas', sb.transisiPulih],
    ['klik susulan sesudah seret tidak membalikkannya', sb.seretTakDibalikSentuhan],
    ['seret pendek kembali ke tempat semula', sb.seretPendekKembali],
    ['papan ketik tetap dilayani', sb.papanKetikJalan],
  ]
  const rusakSeret = cekSeret.filter(([, ok]) => !ok)
  gagal += rusakSeret.length
  console.log((rusakSeret.length ? 'GAGAL  ' : 'OK     ') + 'Pemilih bahasa: klik, seret, papan ketik')
  for (const [ket, ok] of cekSeret) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  /* ---------------- Alur dosen: usul, setujui, tolak, tahan ---------------- */
  console.log('')
  const ad = await ujiAlurDosen()
  const cekDosen = [
    ['ada pengumpulan yang bisa dinilai', ad.adaAntrean],
    ['usulan tercatat sebagai menunggu', ad.usulanTercatat],
    ['nilainya BELUM masuk transkrip', ad.belumMasukTranskrip],
    ['status pengumpulan jadi menunggu', ad.statusJadiMenunggu],
    ['masuk antrean persetujuan admin', ad.masukAntreanAdmin],
    ['admin bisa menyetujui', ad.disetujui],
    ['barulah nilainya masuk transkrip', ad.masukTranskrip],
    ['status pengumpulan jadi tercatat', ad.statusJadiDinilai],
    ['tercatat sebagai batch yang bisa dibatalkan', ad.punyaBatch],
    ['tidak bisa diputuskan dua kali', ad.tidakBisaDiputusDuaKali],
    ['penolakan tidak menulis nilai apa pun', ad.tolakTidakMenulis],
    ['status pengumpulan jadi ditolak', ad.statusJadiDitolak],
    ['sistem menahan usulan yang melanggar', ad.sistemMenahan],
    ['usulan yang ditahan tetap menunggu', ad.tetapMenunggu],
  ]
  const rusakDosen = cekDosen.filter(([, ok]) => !ok)
  gagal += rusakDosen.length
  console.log((rusakDosen.length ? 'GAGAL  ' : 'OK     ') + 'Alur nilai dosen -> persetujuan')
  for (const [ket, ok] of cekDosen) console.log('       ' + (ok ? 'v ' : 'x ') + ket)

  console.log(gagal ? '\n' + gagal + ' rute bermasalah' : '\nSeluruh rute merender tanpa galat')
  process.exit(0)
})()
