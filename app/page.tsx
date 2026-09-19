'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('notice') === 'login_required') {
        setNotice('Silakan masuk dengan akun peserta Anda terlebih dahulu untuk mengakses Dashboard.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanNim = nim.trim();
    if (!cleanNim) {
      setError('Silakan masukkan NIM Anda.');
      return;
    }
    if (!password) {
      setError('Silakan masukkan password Anda.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim: cleanNim, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'NIM atau Password yang Anda masukkan salah.');
        setLoading(false);
        return;
      }

      // Full document navigation ensures session cookie is immediately sent in request headers
      window.location.href = data.redirect || '/dashboard';
    } catch {
      setError('Terjadi kendala koneksi ke server. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#FBFBFA] text-[#111111] selection:bg-[#B4E50D] selection:text-[#111111]">
      {/* Handcrafted subtle background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-[#B4E50D]/12 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md mx-auto z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-[#B4E50D] border border-[#111111]/30" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Portal Akun Peserta
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] font-heading">
            Masuk ke Akun Anda
          </h1>
          <div className="w-12 h-1 bg-[#111111] mx-auto mt-3 rounded-full opacity-80" />
          <p className="text-neutral-500 text-sm mt-3 max-w-xs mx-auto leading-relaxed font-medium">
            Masukkan NIM dan password terdaftar Anda untuk mengakses portal dan status akun resmi.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-8 card-shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#B4E50D]" />

          {notice && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-blue-800 text-xs sm:text-sm font-medium animate-in fade-in duration-150">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-[#FB4141]/30 flex items-start gap-3 text-red-700 text-xs sm:text-sm font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FB4141] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input 1: NIM */}
            <div>
              <label
                htmlFor="nim-input"
                className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
              >
                Nomor Induk Mahasiswa (NIM)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <input
                  id="nim-input"
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  disabled={loading}
                  placeholder="Contoh: 230101"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-medium transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60"
                />
              </div>
            </div>

            {/* Input 2: Password */}
            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Masukkan password Anda"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-medium transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-sm transition btn-lift cursor-pointer flex items-center justify-center gap-2 border border-[#9ecc09] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                  <span>Memeriksa Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Referral Link & Button */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center space-y-2.5">
            <p className="text-xs text-neutral-500 font-medium">
              Belum memiliki akun terdaftar?
            </p>
            <Link
              href="/register"
              id="goto-register-btn"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-[#111111] font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <span>Daftar Akun Peserta Baru</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
            </Link>
          </div>
        </div>

        {/* Footer & Admin link */}
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-neutral-400 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sistem Otentikasi Terenkripsi & Terlindungi</span>
          </div>
          <Link
            href="/hidden-admin-access"
            className="text-[11px] text-neutral-400 hover:text-neutral-600 transition underline underline-offset-2 mt-1"
          >
            Portal Akses Khusus Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
