'use client';

import React, { useState, useCallback } from 'react';
import {
  Shield,
  LogOut,
  Copy,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  Hourglass,
  Layers,
  Lock,
  Sparkles,
  Users,
  Info,
} from 'lucide-react';

export interface GroupMember {
  id: number;
  nim: string;
  nama: string;
  golongan: string;
  gender: 'L' | 'P';
}

export interface DashboardUser {
  id: number;
  nama: string;
  nim: string;
  golongan: string;
  gender: 'L' | 'P';
  status: 'PENDING' | 'APPROVED';
  group_number: number | null;
  isPublished?: boolean;
  groupMembers?: GroupMember[];
}

export default function DashboardClient({ initialUser }: { initialUser: DashboardUser }) {
  const [data, setData] = useState<DashboardUser>(initialUser);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchMyGroup = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/participant/my-group');
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/';
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData({
          id: json.id,
          nama: json.nama || json.name,
          nim: json.nim,
          golongan: json.golongan || json.kelas || '',
          gender: json.gender,
          status: json.status || 'APPROVED',
          group_number: json.groupNumber,
          isPublished: Boolean(json.isPublished),
          groupMembers: json.groupMembers || [],
        });
      }
    } catch (err) {
      console.error('Gagal menyegarkan data kelompok:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      window.location.href = '/';
    }
  };

  const handleCopyGroup = () => {
    if (data.group_number) {
      navigator.clipboard.writeText(`Kelompok ${data.group_number}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPending = data.status === 'PENDING';
  const isApproved = data.status === 'APPROVED';
  const isPublished = Boolean(data.isPublished);
  const hasOfficialGroup = isApproved && isPublished && data.group_number !== null;

  // Initial letter for avatar
  const initials = data.nama
    ? data.nama
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#0F172A] flex flex-col relative selection:bg-[#B4E50D]/40">
      {/* Background Subtle Gradient & Mesh Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-[#B4E50D]/15 to-transparent blur-[140px] rounded-full pointer-events-none" />

      {/* Top Professional Navigation Bar */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-30 transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm border border-slate-800">
              <Shield className="w-5 h-5 text-[#B4E50D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight font-heading">
                  Portal Mahasiswa
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                  Edisi Resmi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Sistem Penempatan & Pengacakan Kelompok
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchMyGroup}
              disabled={refreshing}
              title="Segarkan data status akun & kelompok"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition duration-150 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <button
              id="participant-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 hover:border-red-200 border border-slate-200 text-slate-700 hover:text-red-600 text-xs font-semibold shadow-xs transition duration-150 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 z-10">
        
        {/* ========================================================================= */}
        {/* EXCLUSIVE DIGITAL PARTICIPANT CARD (MEMBER PASS)                          */}
        {/* ========================================================================= */}
        <div className="relative rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Top accent line */}
          <div
            className={`h-1.5 w-full ${
              isPending
                ? 'bg-amber-400'
                : hasOfficialGroup
                ? 'bg-[#B4E50D]'
                : 'bg-emerald-500'
            }`}
          />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Profile Details */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md border border-slate-700 font-heading">
                    {initials}
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                      isPending ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                  >
                    {isPending ? (
                      <Clock className="w-2.5 h-2.5 text-slate-900" />
                    ) : (
                      <Check className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-heading">
                      {data.nama}
                    </h1>
                    {/* Status Badge */}
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Menunggu Tinjauan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Akun Terverifikasi
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2">
                    <span>NIM: <strong className="text-slate-800 font-bold tracking-wide">{data.nim}</strong></span>
                    <span>•</span>
                    <span>Golongan: <strong className="text-slate-800 font-bold">{data.golongan}</strong></span>
                  </p>
                </div>
              </div>

              {/* Right Profile Meta Badges */}
              <div className="flex items-center flex-wrap gap-2.5 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Golongan
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {data.golongan || '-'}
                  </span>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Jenis Kelamin
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {data.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                  </span>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Status Kelompok
                  </span>
                  <span className="text-sm font-extrabold">
                    {isPending ? (
                      <span className="text-amber-600">Menunggu Peninjauan</span>
                    ) : (
                      <span className="text-slate-600">Disembunyikan (Menunggu Pengumuman)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3-STEP VISUAL PROGRESS TIMELINE                                           */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Alur Tahapan Keanggotaan
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              {isPending ? 'Langkah 2 dari 3' : hasOfficialGroup ? 'Langkah 3 dari 3 (Lengkap)' : 'Langkah 2 dari 3 (Tervalidasi)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: Registration */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-900 block truncate">1. Pendaftaran Akun</span>
                <span className="text-[10px] text-emerald-700 font-medium">Berhasil Didaftarkan</span>
              </div>
            </div>

            {/* Step 2: Verification */}
            <div
              className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                isPending
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-emerald-50/60 border-emerald-200/80'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                  isPending ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
                }`}
              >
                {isPending ? <Hourglass className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span
                  className={`text-xs font-bold block truncate ${
                    isPending ? 'text-amber-950' : 'text-emerald-900'
                  }`}
                >
                  2. Verifikasi Admin
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    isPending ? 'text-amber-700 font-bold' : 'text-emerald-700'
                  }`}
                >
                  {isPending ? 'Sedang Ditinjau' : 'Telah Disetujui'}
                </span>
              </div>
            </div>

            {/* Step 3: Announcement */}
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-400">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs bg-slate-200 text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate text-slate-600">
                  3. Pengumuman Kelompok
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isPending ? 'Menunggu Persetujuan' : 'Disembunyikan (Diumumkan Admin)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN HERO CONTENT: PARTICIPANT STATES                                     */}
        {/* ========================================================================= */}

        {isPending ? (
          /* ======================================================================= */
          /* CASE 1: ACCOUNT STATUS IS PENDING (APPROVAL IN PROGRESS)                */
          /* ======================================================================= */
          <div className="rounded-3xl bg-white border border-amber-200/90 p-8 sm:p-10 shadow-xs text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5 text-amber-600 shadow-xs">
              <Hourglass className="w-8 h-8 text-amber-600 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold uppercase tracking-wider mb-4">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Menunggu Peninjauan Administrator
            </div>

            {/* EXACT MANDATED INDONESIAN TEXT */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading mb-3 max-w-xl mx-auto">
              Akun Anda sedang ditinjau oleh Admin.
            </h2>

            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-lg mx-auto font-medium">
              Data pendaftaran akun Anda telah tersimpan dengan aman. Administrator sedang meninjau dan memverifikasi data sebelum akun Anda aktif dan dapat melihat penetapan kelompok.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={fetchMyGroup}
                disabled={refreshing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#B4E50D]' : ''}`} />
                <span>{refreshing ? 'Memeriksa Status...' : 'Periksa Status Sekarang'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* CASE 2: APPROVED & RESULTS KEPT STRICTLY CONFIDENTIAL BY ADMIN           */
          /* ======================================================================= */
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs relative overflow-hidden">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5 text-emerald-600 shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-4">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                Akun Terverifikasi Resmi
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading mb-3">
                Akun Anda Telah Aktif & Terverifikasi
              </h2>

              {/* MANDATED LOGIC: GROUP RESULTS HIDDEN / WAITING FOR ADMIN PUBLISH */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left my-6 space-y-2">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Hasil Penempatan Kelompok Sedang Disiapkan
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                      Akun Anda sudah aktif dan terverifikasi di sistem, namun nomor kelompok dan daftar anggota kelompok dirahasiakan dan menunggu jadwal pengumuman resmi dari Admin.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-medium">
                Pihak panitia/admin mengelola pengacakan kelompok secara internal demi menjaga keadilan dan keseimbangan data. Hasil resmi akan diumumkan secara serentak.
              </p>

              <div className="mt-7 flex justify-center">
                <button
                  onClick={fetchMyGroup}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#B4E50D]' : ''}`} />
                  <span>{refreshing ? 'Memperbarui...' : 'Periksa Status Pembaruan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400 mt-auto">
        <p>© 2026 Portal Akademik Kelompok • Sistem Penempatan Resmi & Transparan</p>
      </footer>
    </div>
  );
}
