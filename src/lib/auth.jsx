'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { contohEmailDosen, contohEmailMahasiswa, getDosenByEmail, getStudentByEmail } from './mockData.js'

/* Autentikasi tiruan untuk tahap UI/UX — peran ditentukan dari domain email.
   Nanti tinggal diganti pemanggilan API tanpa mengubah komponen halaman. */

const STORAGE_KEY = 'sk5c.session'

const ADMIN_PROFILE = {
  name: 'Biro Kemahasiswaan & Humaniora',
  unit: 'Student Development & Humanities',
  email: 'admin@umn.ac.id',
  officer: 'Andini Prameswari, M.Psi.',
}

const AuthContext = createContext(null)

/* Domain menentukan peran — konvensi UMN yang sebenarnya: mahasiswa memakai
   @student.umn.ac.id, dosen @lecturer.umn.ac.id, dan alamat @umn.ac.id biasa
   dipegang unit kerja, termasuk Biro Kemahasiswaan.

   Ditulis sebagai daftar, bukan rantai ternary: menambah peran keempat nanti
   cukup menambah satu baris, dan tiap pasangan domain-peran tetap terbaca
   sebagai satu kesatuan. */
const DOMAIN = [
  [/@student\.umn\.ac\.id$/i, 'student'],
  [/@lecturer\.umn\.ac\.id$/i, 'dosen'],
]

export function roleFromEmail(email) {
  const alamat = String(email ?? '').trim()
  for (const [pola, peran] of DOMAIN) if (pola.test(alamat)) return peran
  return 'admin'
}

/* --------------------------------------------------------------------------
   Tempat mendarat tiap peran.

   Dulu ini ditulis `role === 'admin' ? '/admin' : '/mahasiswa'` di tujuh tempat
   berbeda. Percabangan biner seperti itu tidak pernah salah selama perannya
   memang dua — dan diam-diam salah pada hari peran ketiga lahir: dosen akan
   dilempar ke panel mahasiswa tanpa satu pun galat muncul. Sekarang hanya ada
   SATU tempat yang tahu jawabannya.
   -------------------------------------------------------------------------- */
const PANEL = { admin: '/admin', dosen: '/dosen', student: '/mahasiswa' }

export const panelUntuk = (role) => PANEL[role] ?? '/masuk'

/** Sebutan peran yang dibaca manusia — dipakai menu akun dan halaman masuk. */
export const LABEL_PERAN = { admin: 'Kemahasiswaan', dosen: 'Dosen', student: 'Mahasiswa' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [siap, setSiap] = useState(false)

  /* --------------------------------------------------------------------------
     Sesi dibaca SESUDAH komponen menempel, bukan saat state pertama dibuat.

     Di Next.js halaman dirender lebih dulu di server, dan di sana localStorage
     tidak ada. Kalau sesi ikut dibaca pada render pertama, HTML dari server
     (belum masuk) berbeda dengan render pertama di peramban (sudah masuk), dan
     React akan menolak hidrasinya. `siap` menandai bahwa pembacaan itu sudah
     selesai — sebelum itu, penjaga peran tidak boleh menyimpulkan apa pun.
     -------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* localStorage bisa diblokir — sesi cukup di memori */
    }
    setSiap(true)
  }, [])

  /* Menulis hanya setelah pembacaan awal selesai. Tanpa penjagaan ini,
     render pertama (user masih null) akan menghapus sesi yang tersimpan. */
  useEffect(() => {
    if (!siap) return
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* diabaikan */
    }
  }, [user, siap])

  const login = useCallback(async ({ email, password }) => {
    if (!email.trim() || !password) throw new Error('Email dan kata sandi wajib diisi.')
    if (password.length < 6) throw new Error('Kata sandi minimal 6 karakter.')
    await new Promise((r) => setTimeout(r, 550))

    const role = roleFromEmail(email)

    if (role === 'admin') {
      const next = {
        role,
        email: ADMIN_PROFILE.email,
        name: ADMIN_PROFILE.name,
        initials: 'KH',
        subtitle: ADMIN_PROFILE.unit,
      }
      setUser(next)
      return next
    }

    /* Dosen dikenali dari daftar pengampu. Sama seperti mahasiswa, alamat yang
       tidak terdaftar ditolak — bukan dibuatkan akun kosong di tempat. */
    if (role === 'dosen') {
      const dosen = getDosenByEmail(email)
      if (!dosen) {
        throw new Error(
          'Email ' + email.trim() + ' tidak terdaftar sebagai dosen pengampu. Contoh yang terdaftar: ' +
            contohEmailDosen(2).join(', ') + '.',
        )
      }
      const next = {
        role,
        nip: dosen.nip,
        email: dosen.email,
        name: dosen.nama,
        initials: dosen.inisial,
        subtitle: dosen.jabatan,
        /* Kewenangan menilai: satu unit asesmen pada satu semester. Dipakai
           halaman dosen untuk menyaring pengumpulan yang memang menjadi
           tanggung jawabnya — bukan sekadar hiasan di kartu profil. */
        sumber: dosen.sumber,
        semester: dosen.semester,
        prodi: dosen.prodi,
        fakultas: dosen.fakultas,
      }
      setUser(next)
      return next
    }

    /* Identitas mahasiswa ditentukan oleh alamat yang diketik, bukan persona
       bawaan. Alamat yang tidak terdaftar ditolak — masuk sebagai orang lain
       jauh lebih berbahaya daripada gagal masuk. */
    const mahasiswa = getStudentByEmail(email)
    if (!mahasiswa) {
      throw new Error(
        'Email ' + email.trim() + ' tidak terdaftar sebagai mahasiswa. Contoh yang terdaftar: ' +
          contohEmailMahasiswa(2).join(', ') + '.',
      )
    }

    const next = {
      role,
      studentId: mahasiswa.id,
      nim: mahasiswa.nim,
      email: mahasiswa.email,
      name: mahasiswa.name,
      initials: mahasiswa.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      subtitle: mahasiswa.program,
      cohort: mahasiswa.angkatanId,
      semesterAktif: mahasiswa.semesterAktif,
    }
    setUser(next)
    return next
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const value = useMemo(
    () => ({ user, siap, login, logout, admin: ADMIN_PROFILE }),
    [user, siap, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/**
 * Penjaga peran. Berbeda dari versi react-router yang mengembalikan <Navigate>,
 * di Next perpindahan dilakukan lewat router di dalam efek — mengubah rute
 * selagi merender akan ditolak React.
 *
 * Selama sesi belum selesai dibaca, tidak ada yang dirender: menebak "belum
 * masuk" lalu melempar ke halaman login akan menendang keluar pengguna yang
 * sebenarnya sudah masuk.
 */
export function RequireRole({ role, children }) {
  const { user, siap } = useAuth()
  const router = useRouter()

  const tujuan = !siap
    ? null
    : !user
      ? '/masuk'
      : user.role !== role
        ? panelUntuk(user.role)
        : null

  useEffect(() => {
    if (tujuan) router.replace(tujuan)
  }, [tujuan, router])

  if (!siap || tujuan) return null
  return children
}
