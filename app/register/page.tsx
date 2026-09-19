'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  GraduationCap,
  Lock,
  Layers,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

export default function RegisterPage() {
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [golongan, setGolongan] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanNama = nama.trim();
    const cleanNim = nim.trim();
    const cleanGolongan = golongan.trim();

    if (!cleanNama) {
      setError('Silakan masukkan nama lengkap Anda.');
      return;
    }
    if (!cleanNim) {
      setError('Silakan masukkan NIM Anda.');
      return;
    }
    if (!password || password.length < 5) {
      setError('Password minimal harus terdiri dari 5 karakter.');
      return;
    }
    if (!cleanGolongan) {
      setError('Silakan pilih golongan Anda (A, B, C, atau D).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: cleanNama,
          nim: cleanNim,
          password,
          golongan: cleanGolongan,
          gender,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal mendaftar akun.');
        setLoading(false);
        return;
      }

      // Full document navigation ensures session cookie is immediately sent in request headers
      window.location.href = data.redirect || '/dashboard';
    } catch {
      setError('Terjadi kendala jaringan saat mendaftar. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#FBFBFA] text-[#111111] selection:bg-[#B4E50D] selection:text-[#111111]">
      {/* Handcrafted subtle background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[340px] bg-[#B4E50D]/12 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto z-10 py-6">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-[#B4E50D] border border-[#111111]/30" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Pendaftaran Peserta
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] font-heading">
            Buat Akun Peserta
          </h1>
          <div className="w-12 h-1 bg-[#111111] mx-auto mt-2.5 rounded-full opacity-80" />
          <p className="text-neutral-500 text-xs sm:text-sm mt-2.5 max-w-sm mx-auto leading-relaxed font-medium">
            Lengkapi data diri Anda di bawah ini untuk didaftarkan ke dalam sistem penentuan kelompok.
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-8 card-shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#B4E50D]" />

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-[#FB4141]/30 flex items-start gap-3 text-red-700 text-xs sm:text-sm font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FB4141] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form action="/api/auth/register" method="POST" onSubmit={handleRegister} className="space-y-4">
            {/* Field 1: Nama Lengkap */}
            <div>
              <label
                htmlFor="register-nama"
                className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
              >
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="register-nama"
                  name="nama"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  disabled={loading}
                  placeholder="Contoh: Maya Putri Rahayu"
                  required
                  autoFocus
                  autoComplete="name"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-medium transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60"
                />
              </div>
            </div>

            {/* Field 2 & 3: NIM and Golongan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="register-nim"
                  className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
                >
                  NIM (Unik)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    id="register-nim"
                    name="nim"
                    type="text"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    disabled={loading}
                    placeholder="Contoh: 230109"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-medium transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-golongan"
                  className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
                >
                  Golongan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <select
                    id="register-golongan"
                    name="golongan"
                    value={golongan}
                    onChange={(e) => setGolongan(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] text-sm font-medium transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60 cursor-pointer appearance-none"
                  >
                    <option value="" disabled>
                      -- Pilih Golongan (A, B, C, D) --
                    </option>
                    <option value="A">Golongan A</option>
                    <option value="B">Golongan B</option>
                    <option value="C">Golongan C</option>
                    <option value="D">Golongan D</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Field 4: Password */}
            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Minimal 5 karakter"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-medium transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 5: Gender Selection ('L' / 'P') */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2">
                Jenis Kelamin (Untuk Penyeimbangan Kelompok)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label
                  htmlFor="gender-l"
                  className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    gender === 'L'
                      ? 'border-[#111111] bg-white shadow-sm ring-2 ring-[#B4E50D]'
                      : 'border-neutral-200 bg-[#FBFBFA] hover:bg-white text-neutral-600'
                  }`}
                >
                  <input
                    id="gender-l"
                    type="radio"
                    name="gender"
                    value="L"
                    checked={gender === 'L'}
                    onChange={() => setGender('L')}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      gender === 'L' ? 'border-[#111111] bg-[#111111]' : 'border-neutral-400'
                    }`}
                  >
                    {gender === 'L' && <div className="w-1.5 h-1.5 rounded-full bg-[#B4E50D]" />}
                  </div>
                  <span className="text-xs font-bold text-[#111111]">Laki-laki (L)</span>
                </label>

                <label
                  htmlFor="gender-p"
                  className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    gender === 'P'
                      ? 'border-[#111111] bg-white shadow-sm ring-2 ring-[#B4E50D]'
                      : 'border-neutral-200 bg-[#FBFBFA] hover:bg-white text-neutral-600'
                  }`}
                >
                  <input
                    id="gender-p"
                    type="radio"
                    name="gender"
                    value="P"
                    checked={gender === 'P'}
                    onChange={() => setGender('P')}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      gender === 'P' ? 'border-[#111111] bg-[#111111]' : 'border-neutral-400'
                    }`}
                  >
                    {gender === 'P' && <div className="w-1.5 h-1.5 rounded-full bg-[#B4E50D]" />}
                  </div>
                  <span className="text-xs font-bold text-[#111111]">Perempuan (P)</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-5 rounded-xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-sm transition btn-lift cursor-pointer flex items-center justify-center gap-2 border border-[#9ecc09] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <span>Daftar Akun Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Referral Link */}
          <div className="mt-5 pt-4 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-500 font-medium">
              Sudah memiliki akun?{' '}
              <Link
                href="/"
                className="font-bold text-[#111111] hover:underline decoration-[#B4E50D] decoration-2 underline-offset-2"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Data akun Anda terlindungi dengan enkripsi kata sandi</span>
        </div>
      </div>
    </main>
  );
}
