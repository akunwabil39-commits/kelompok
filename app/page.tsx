'use client';

import React, { useState } from 'react';
import {
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state after joining
  const [result, setResult] = useState<{
    name: string;
    gender: 'MALE' | 'FEMALE';
    groupNumber: number;
    isNew: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double-submit / spam

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Silakan masukkan nama lengkap Anda.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, gender }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal mendaftar. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      // Display frictionless assignment result
      setResult({
        name: data.name,
        gender: data.gender || gender,
        groupNumber: data.groupNumber,
        isNew: data.isNew,
      });
    } catch {
      setError('Terjadi kendala koneksi. Silakan periksa jaringan dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGroup = () => {
    if (result) {
      navigator.clipboard.writeText(`Group ${result.groupNumber}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setResult(null);
    setName('');
    setError(null);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#FBFBFA] text-[#111111] selection:bg-[#B4E50D] selection:text-[#111111]">
      {/* Handcrafted subtle background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#B4E50D]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {/* Logo Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-[#FB4141]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#111111]">
              Alokasi Rahasia
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] font-heading">
            Pembagian Kelompok Rahasia
          </h1>
          <div className="w-12 h-1 bg-[#FB4141] mx-auto mt-3 rounded-full opacity-80" />
          <p className="text-neutral-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed font-medium">
            {result
              ? 'Penempatan kelompok rahasia Anda telah dikonfirmasi di bawah ini.'
              : 'Masukkan nama Anda untuk ditempatkan secara otomatis ke dalam kelompok yang seimbang.'}
          </p>
        </div>

        {/* Dynamic Card: Registration Form or Assignment Reveal */}
        {!result ? (
          <div className="rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-8 card-shadow-lg relative overflow-hidden">
            {/* Subtle top accent border buffer */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#111111] to-transparent opacity-10" />

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-[#FB4141]/30 flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 text-[#FB4141] shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-5">
              {/* Input 1: Name */}
              <div>
                <label
                  htmlFor="name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    placeholder="Contoh: Maya Lin"
                    required
                    autoFocus
                    autoComplete="name"
                    className="w-full pl-11 pr-4 py-3.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-base font-medium transition-all duration-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Input 2: Gender Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Jenis Kelamin
                  </label>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    Digunakan untuk alokasi seimbang
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setGender('MALE')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      gender === 'MALE'
                        ? 'bg-[#111111] border-[#111111] text-white shadow-sm'
                        : 'bg-[#FBFBFA] border-neutral-300 text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70 hover:border-neutral-400'
                    }`}
                  >
                    <span className="text-base font-bold">♂</span>
                    <span>Laki-laki (Male)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setGender('FEMALE')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      gender === 'FEMALE'
                        ? 'bg-[#111111] border-[#111111] text-white shadow-sm'
                        : 'bg-[#FBFBFA] border-neutral-300 text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70 hover:border-neutral-400'
                    }`}
                  >
                    <span className="text-base font-bold">♀</span>
                    <span>Perempuan (Female)</span>
                  </button>
                </div>
              </div>

              {/* Primary Action Join Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-5 bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-base rounded-xl shadow-md btn-lift flex items-center justify-center gap-2.5 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3 border border-[#9ecc09]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#111111]/30 border-t-[#111111] rounded-full animate-spin" />
                    <span>Memproses Pendaftaran...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim & Buka Kelompok</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Frictionless Assignment Card View */
          <div className="rounded-3xl bg-white border border-neutral-200/90 p-7 sm:p-9 card-shadow-lg text-center relative overflow-hidden">
            {/* Top Brand Lime accent indicator */}
            <div className="absolute top-0 inset-x-0 h-2 bg-[#B4E50D]" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B4E50D]/20 border border-[#B4E50D]/40 text-[#111111] text-xs font-bold mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
              <span>{result.isNew ? 'Alokasi Seimbang Baru' : 'Penempatan Terverifikasi'}</span>
            </div>

            {/* Personalized Greeting */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] font-heading">
              Halo, <span className="underline decoration-[#B4E50D] decoration-4 underline-offset-4">{result.name}</span>! 👋
            </h2>
            <p className="text-neutral-500 text-xs mt-1 font-medium">
              Kelompok resmi Anda telah ditentukan.
            </p>

            {/* Group Number accented with Brand Lime */}
            <div className="my-7">
              <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 block mb-2">
                Kelompok Anda
              </span>

              <div className="relative inline-flex items-center justify-center my-2">
                <div className="absolute -inset-3 bg-[#B4E50D]/30 rounded-3xl blur-xl" />
                <div className="relative px-10 py-5 rounded-2xl bg-[#FBFBFA] border-2 border-[#111111] shadow-md flex flex-col items-center">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-[#111111] font-heading">
                    Kelompok {result.groupNumber}
                  </span>
                  <div className="mt-1 px-2.5 py-0.5 bg-[#B4E50D] text-[#111111] text-[11px] font-extrabold uppercase tracking-wider rounded-md">
                    Anggota Aktif
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Copy & Check Another */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-5 border-t border-neutral-200">
              <button
                onClick={handleCopyGroup}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FBFBFA] hover:bg-neutral-100 border border-neutral-300 text-[#111111] text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm btn-lift"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Nomor Kelompok {result.groupNumber} Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-600" />
                    <span>Salin Nomor Kelompok</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] text-xs font-extrabold transition-all duration-200 cursor-pointer border border-[#9ecc09] shadow-sm btn-lift"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#111111]" />
                <span>Cek Nama Lain</span>
              </button>
            </div>

            {/* Privacy notice */}
            <div className="mt-6 p-3.5 rounded-xl bg-[#FBFBFA] border border-neutral-200 text-left flex items-start gap-3">
              <div className="p-1 rounded bg-neutral-200/60 text-[#111111] shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <p className="text-[12px] text-neutral-600 leading-relaxed">
                <strong className="text-[#111111]">Kerahasiaan Terjaga:</strong> Penempatan kelompok Anda bersifat rahasia. Peserta lain tidak dapat melihat anggota tim lainnya sampai diumumkan secara resmi oleh panitia acara.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
