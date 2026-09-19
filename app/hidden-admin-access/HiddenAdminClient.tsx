'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HiddenAdminClient() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sga_admin_logged_in', 'true');
        }
        // Full document navigation ensures session cookie is immediately sent in request headers
        window.location.href = data.redirect || '/admin';
      } else {
        setError(data.message || 'Password admin tidak sesuai. Silakan periksa kembali.');
        setLoading(false);
      }
    } catch {
      setError('Kendala koneksi ke server. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#FBFBFA] text-[#111111] selection:bg-[#B4E50D] selection:text-[#111111]">
      {/* Subtle handcrafted background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[300px] bg-[#B4E50D]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md mx-auto z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-[#FB4141]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Area Terbatas
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] font-heading">
            Portal Akses Admin
          </h1>
          <div className="w-10 h-1 bg-[#FB4141] mx-auto mt-2.5 rounded-full opacity-80" />
          <p className="text-neutral-500 text-xs sm:text-sm mt-2.5 font-medium">
            Masukkan kata sandi administrator untuk mengelola pengacakan kelompok.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white border border-neutral-200/90 p-7 sm:p-8 card-shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#FB4141]" />

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-[#FB4141]/30 flex items-start gap-2.5 text-red-700 text-xs font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-[#FB4141] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
              >
                Password Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                {/* STRICTLY MASKED PASSWORD INPUT (••••) */}
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoFocus
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-medium tracking-widest transition duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60"
                />
              </div>
            </div>

            <button
              id="admin-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-sm rounded-xl shadow-sm btn-lift flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-[#9ecc09] mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#111111]/30 border-t-[#111111] rounded-full animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Buka Pusat Kontrol Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-200 flex flex-col items-center gap-2.5 text-center">
            <Link
              href="/"
              className="text-xs text-neutral-500 hover:text-[#111111] font-medium transition underline underline-offset-2"
            >
              ← Kembali ke Login Peserta
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verifikasi Server Terenkripsi • Sesi HTTP-Only</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
