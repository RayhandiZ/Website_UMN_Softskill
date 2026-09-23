import { IconChat, IconMail, IconPhone } from '../components/Icons'

/* --------------------------------------------------------------------------
   Kontak resmi dan daftar layanan bantuan.

   Dikumpulkan di satu berkas karena nomor yang sama muncul di dua tempat —
   kaki halaman dan tombol layanan mengambang. Dua salinan nomor telepon adalah
   cara paling pasti untuk suatu hari punya dua nomor yang berbeda, dan yang
   salah justru yang dihubungi orang.

   PERHATIAN SEBELUM DIPAKAI SUNGGUHAN: NOMOR_WHATSAPP di bawah masih memakai
   nomor sentral UMN, yang merupakan telepon kabel dan BUKAN nomor WhatsApp.
   Ganti dengan nomor WhatsApp resmi Biro Kemahasiswaan sebelum aplikasi ini
   dipakai mahasiswa sungguhan. Sengaja tidak diisi nomor karangan: satu digit
   asal-asalan bisa jatuh ke nomor milik orang lain, dan yang menerima keluhan
   mahasiswa adalah orang yang tidak ada hubungannya dengan kampus.
   -------------------------------------------------------------------------- */

/** Format E.164 tanpa tanda plus, sesuai yang diminta tautan wa.me. */
const NOMOR_WHATSAPP = '622154220808'

export const KONTAK_UMN = {
  telepon: {
    tampil: '(021) 5422 0808 ext. 3902',
    /* Tautan tel: tidak boleh memuat spasi. */
    tautan: 'tel:+622154220808',
  },
  surel: {
    tampil: 'softskill@umn.ac.id',
    tautan: 'mailto:softskill@umn.ac.id',
  },
  whatsapp: {
    tampil: '+62 21 5422 0808',
    tautan:
      'https://wa.me/' +
      NOMOR_WHATSAPP +
      '?text=' +
      encodeURIComponent('Halo, saya mahasiswa UMN dan ingin bertanya soal nilai softskill 5C.'),
  },
  helpdesk: 'Gedung B Lantai 3, Ruang B315',
  jam: 'Senin sampai Jumat, 08.00 hingga 17.00 WIB',
}

/* --------------------------------------------------------------------------
   Tiga saluran, diurutkan dari yang paling cepat dibalas.

   Sengaja hanya tiga. Daftar bantuan yang panjang memindahkan pekerjaan
   memilih ke orang yang sedang bingung — dan orang yang membuka menu bantuan
   memang sedang bingung.

   Label dan keterangannya ditulis dalam bahasa Indonesia dan diterjemahkan
   lewat t() di komponennya, mengikuti pola kamus di lib/bahasa.jsx.
   -------------------------------------------------------------------------- */
export const LAYANAN = [
  {
    id: 'whatsapp',
    ikon: IconChat,
    label: 'WhatsApp UMN',
    rinci: 'Kirim pesan, dibalas pada jam kerja',
    tautan: KONTAK_UMN.whatsapp.tautan,
    keluar: true,
  },
  {
    id: 'telepon',
    ikon: IconPhone,
    label: 'Customer Service',
    rinci: 'Hubungi lewat telepon pada jam kerja',
    nilai: KONTAK_UMN.telepon.tampil,
    tautan: KONTAK_UMN.telepon.tautan,
  },
  {
    id: 'surel',
    ikon: IconMail,
    label: 'Surel Softskill 5C',
    rinci: 'Untuk pertanyaan yang butuh lampiran',
    nilai: KONTAK_UMN.surel.tampil,
    tautan: KONTAK_UMN.surel.tautan,
  },
]
