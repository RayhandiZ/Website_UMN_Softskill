'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { EN } from './teks'

/* --------------------------------------------------------------------------
   Dwibahasa Indonesia dan Inggris.

   KEPUTUSAN PALING PENTING DI BERKAS INI: kalimat Indonesia dipakai sebagai
   KUNCI terjemahan, bukan kode seperti 'dashboard.nilaiAkhir'.

   Alasannya praktis. Dengan kunci berupa kode, setiap kalimat di layar hilang
   dari berkas halamannya dan berubah menjadi rujukan yang harus dilacak ke
   kamus; membaca satu halaman jadi mustahil tanpa membuka dua berkas. Dengan
   kalimat Indonesia sebagai kunci, halaman tetap terbaca apa adanya, dan
   kamus hanya berisi pasangan terjemahannya.

   Akibat lain yang menguntungkan: kalimat yang BELUM diterjemahkan jatuh
   kembali ke bahasa Indonesia, bukan menjadi kode mentah seperti
   'dashboard.nilaiAkhir' yang bocor ke layar pengguna.

   Nilai sisipan ditulis {dalamKurungKurawal}:
     t('Semester {n} dari {total}', { n: 2, total: 3 })
   -------------------------------------------------------------------------- */

const KUNCI = 'sk5c.bahasa'

export const BAHASA = [
  { id: 'id', kode: 'ID', nama: 'Bahasa Indonesia' },
  { id: 'en', kode: 'EN', nama: 'English' },
]

const BahasaContext = createContext(null)

/** Mengisi {penanda} dengan nilainya. */
function isi(teks, nilai) {
  if (!nilai) return teks
  return String(teks).replace(/\{(\w+)\}/g, (utuh, k) => (k in nilai ? String(nilai[k]) : utuh))
}

export function terjemah(bahasa, teks, nilai) {
  const dasar = bahasa === 'en' ? (EN[teks] ?? teks) : teks
  return isi(dasar, nilai)
}

export function BahasaProvider({ children }) {
  /* Selalu mulai dari Indonesia, sama seperti yang dirender di server.

     Berbeda dari tema — yang bisa dipasang lebih dulu lewat skrip kecil di
     <head> karena ia hanya sebuah kelas CSS — bahasa mengubah ISI teksnya.
     Kalau render pertama di peramban sudah memakai bahasa tersimpan sementara
     HTML dari server berbahasa Indonesia, React akan menolak hidrasinya. Jadi
     bahasa tersimpan baru dipasang setelah komponen menempel. */
  const [bahasa, setBahasa] = useState('id')
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    try {
      const tersimpan = localStorage.getItem(KUNCI)
      if (tersimpan === 'en' || tersimpan === 'id') setBahasa(tersimpan)
    } catch {
      /* penyimpanan diblokir — cukup di memori */
    }
    setSiap(true)
  }, [])

  /* Bahasa pada render sebelumnya. Dipakai membedakan PERGANTIAN oleh pengguna
     dari pembacaan awal dari penyimpanan — hanya yang pertama yang pantas
     dianimasikan. Tanpa pembeda ini, setiap halaman dimuat akan berkedip. */
  const sebelumnya = useRef(null)

  /* Menulis hanya setelah pembacaan awal selesai. Tanpa penjagaan ini, render
     pertama (yang selalu 'id') akan menimpa pilihan yang tersimpan. */
  useEffect(() => {
    if (!siap) return
    /* Atribut lang ikut diperbarui: pembaca layar memilih pelafalan dari sini,
       dan tanpa itu kalimat Inggris akan dibacakan dengan lafal Indonesia. */
    document.documentElement.lang = bahasa
    try {
      localStorage.setItem(KUNCI, bahasa)
    } catch {
      /* diabaikan */
    }

    /* Seluruh tulisan di layar berganti sekaligus. Tanpa jeda apa pun, itu
       terbaca sebagai kedipan; dengan pudar sangat pendek, ia terbaca sebagai
       satu halaman yang menyusun ulang dirinya.

       Dipasang sebagai kelas di <html>, bukan state React, supaya tidak ada
       satu pun komponen halaman yang perlu tahu soal ini. Durasinya sudah
       dihormati aturan prefers-reduced-motion di index.css. */
    const awal = sebelumnya.current
    sebelumnya.current = bahasa
    if (awal === null || awal === bahasa) return

    const akar = document.documentElement
    akar.classList.add('ganti-bahasa')
    const id = setTimeout(() => akar.classList.remove('ganti-bahasa'), 300)
    return () => {
      clearTimeout(id)
      akar.classList.remove('ganti-bahasa')
    }
  }, [bahasa, siap])

  const t = useCallback((teks, nilai) => terjemah(bahasa, teks, nilai), [bahasa])
  const toggle = useCallback(() => setBahasa((b) => (b === 'id' ? 'en' : 'id')), [])

  const nilai = useMemo(() => ({ bahasa, setBahasa, toggle, t }), [bahasa, toggle, t])
  return <BahasaContext.Provider value={nilai}>{children}</BahasaContext.Provider>
}

/* Sengaja TIDAK melempar galat bila dipakai di luar penyedia: komponen kecil
   kerap dirender sendirian di dalam uji, dan bahasa bukan hal yang boleh
   membuat halaman gagal tampil. Di luar penyedia, semuanya berbahasa
   Indonesia. */
const CADANGAN = {
  bahasa: 'id',
  setBahasa: () => {},
  toggle: () => {},
  t: (teks, nilai) => isi(teks, nilai),
}

export function useBahasa() {
  return useContext(BahasaContext) ?? CADANGAN
}

/** Pintasan untuk komponen yang hanya butuh penerjemahnya. */
export const useTeks = () => useBahasa().t
