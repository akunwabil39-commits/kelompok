'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  UserPlus,
  Users,
  Search,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Edit2,
  X,
  Shield,
  Sliders,
  Shuffle,
  Check,
  Hourglass,
  Layers,
  LogIn,
  Eye,
  EyeOff,
  Crown,
} from 'lucide-react';

export interface Participant {
  id: number;
  nim: string;
  nama: string;
  golongan: string;
  gender: 'L' | 'P';
  role: 'PARTICIPANT';
  status: 'PENDING' | 'APPROVED';
  group_number: number | null;
  is_leader?: boolean;
  created_at: string;
}

export const getGolonganBadge = (golongan: string) => {
  switch (golongan) {
    case 'A':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'B':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'C':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'D':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  }
};

export interface GroupBreakdown {
  group_number: number;
  total: number;
  males: number;
  females: number;
  maxCapacity: number;
  isFull: boolean;
  percentageFilled: number;
}

export interface Stats {
  totalParticipants: number;
  totalMales: number;
  totalFemales: number;
  totalUnassigned?: number;
  totalPending?: number;
  totalApproved?: number;
  isPublished?: boolean;
  totalCapacity: number;
  settings: {
    totalGroups: number;
    maxPerGroup: number;
    isPublished?: boolean;
  };
  groupBreakdowns: GroupBreakdown[];
}

interface AdminDashboardClientProps {
  initialParticipants: Participant[];
  initialStats: Stats | null;
}

export default function AdminDashboardClient({
  initialParticipants,
  initialStats,
}: AdminDashboardClientProps) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Auto-Shuffle State
  const [shuffling, setShuffling] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Group Settings State
  const [totalGroupsInput, setTotalGroupsInput] = useState(
    initialStats?.settings?.totalGroups?.toString() || '4'
  );
  const [maxPerGroupInput, setMaxPerGroupInput] = useState(
    initialStats?.settings?.maxPerGroup?.toString() || '10'
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Add Participant Form State
  const [newNim, setNewNim] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newGolongan, setNewGolongan] = useState('A');
  const [newGender, setNewGender] = useState<'L' | 'P'>('L');
  const [newGroup, setNewGroup] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGolonganFilter, setSelectedGolonganFilter] = useState<string>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Edit / Reassign Modal State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [reassignGroup, setReassignGroup] = useState('1');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch all participants & stats on demand
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/participants');
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/hidden-admin-access';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants || []);
        setStats(data.stats || null);
        if (data.stats?.settings) {
          setTotalGroupsInput(data.stats.settings.totalGroups.toString());
          setMaxPerGroupInput(data.stats.settings.maxPerGroup.toString());
        }
        setError(null);
      } else {
        setError(data.error || 'Gagal memuat data terbaru');
      }
    } catch {
      setError('Kendala jaringan saat mengambil data admin');
    } finally {
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  const handleLogout = async (target = '/') => {
    setLoggingOut(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sga_admin_logged_in');
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      window.location.href = target;
    }
  };

  // Toggle or Set Group Results Publication Status
  const handleTogglePublish = async (publish: boolean) => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_publish', isPublished: publish }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message);
        if (data.stats) setStats(data.stats);
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        setError(data.error || 'Gagal mengubah status publikasi kelompok.');
      }
    } catch {
      setError('Terjadi kendala saat mengubah status publikasi pengumuman.');
    } finally {
      setPublishing(false);
    }
  };

  // Approve single participant
  const handleApprove = async (id: number, nama: string) => {
    try {
      setError(null);
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Akun "${nama}" berhasil disetujui (APPROVED)! Klik tombol "Ke Login Peserta" di pojok kanan atas jika ingin login dan melihat dashboard peserta.`);
        if (data.participants) setParticipants(data.participants);
        if (data.stats) setStats(data.stats);
        setTimeout(() => setActionSuccess(null), 6000);
      } else {
        setError(data.error || 'Gagal menyetujui peserta.');
      }
    } catch {
      setError('Terjadi kendala saat menyetujui akun peserta.');
    }
  };

  // Approve all pending participants
  const handleApproveAll = async () => {
    if (!window.confirm('Setujui seluruh akun peserta yang masih berstatus PENDING?')) {
      return;
    }

    try {
      setError(null);
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message || 'Seluruh akun peserta berhasil disetujui!');
        if (data.participants) setParticipants(data.participants);
        if (data.stats) setStats(data.stats);
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setError(data.error || 'Gagal menyetujui seluruh peserta.');
      }
    } catch {
      setError('Terjadi kendala saat menyetujui akun peserta.');
    }
  };

  // Set / Toggle Leader
  const handleToggleLeader = async (id: number, currentIsLeader: boolean) => {
    try {
      setError(null);
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_leader', id, isLeader: !currentIsLeader }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message || 'Status ketua kelompok berhasil diperbarui.');
        if (data.participants) setParticipants(data.participants);
        if (data.stats) setStats(data.stats);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setError(data.error || 'Gagal memperbarui status ketua kelompok.');
      }
    } catch {
      setError('Terjadi kendala saat memperbarui status ketua kelompok.');
    }
  };

  // Save Group Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const tg = parseInt(totalGroupsInput, 10);
    const mpg = parseInt(maxPerGroupInput, 10);

    if (isNaN(tg) || tg < 2 || tg > 30) {
      setError('Jumlah Kelompok harus antara 2 dan 30.');
      return;
    }
    if (isNaN(mpg) || mpg < 1 || mpg > 200) {
      setError('Maksimal Per Kelompok harus antara 1 dan 200.');
      return;
    }

    setSavingSettings(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          totalGroups: tg,
          maxPerGroup: mpg,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Pengaturan diperbarui: ${tg} Kelompok, Maksimal ${mpg} anggota per kelompok.`);
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        setError(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      setError('Terjadi kendala saat menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNim.trim() || !newNama.trim()) {
      setError('Silakan lengkapi NIM dan Nama peserta.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          nim: newNim.trim(),
          nama: newNama.trim(),
          golongan: newGolongan.trim() || 'A',
          gender: newGender,
          status: 'APPROVED',
          groupNumber: newGroup ? parseInt(newGroup, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menambahkan peserta');
      } else {
        setActionSuccess(data.message || 'Peserta berhasil didaftarkan!');
        setNewNim('');
        setNewNama('');
        setNewGolongan('A');
        setNewGroup('');
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      setError('Gagal menambahkan peserta.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Participant
  const handleDelete = async (id: number, nama: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus peserta "${nama}"?`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/participants/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menghapus peserta');
      } else {
        setActionSuccess(`Peserta "${nama}" berhasil dihapus.`);
        await fetchData();
        setTimeout(() => setActionSuccess(null), 2500);
      }
    } catch {
      setError('Terjadi kesalahan saat menghapus peserta.');
    }
  };

  // Open Reassign Modal
  const openReassignModal = (p: Participant) => {
    setEditingParticipant(p);
    setReassignGroup(p.group_number ? p.group_number.toString() : '1');
  };

  // Submit Reassign
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/admin/participants/${editingParticipant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupNumber: parseInt(reassignGroup, 10) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Peserta ${editingParticipant.nama} dipindahkan ke Kelompok ${reassignGroup}`);
        setEditingParticipant(null);
        await fetchData();
        setTimeout(() => setActionSuccess(null), 2500);
      } else {
        setError(data.error || 'Gagal memindahkan peserta.');
      }
    } catch {
      setError('Terjadi kesalahan server saat memindahkan peserta.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Auto-Shuffle
  const handleAutoShuffle = async () => {
    if (participants.length === 0) {
      setError('Belum ada peserta yang terdaftar untuk diacak.');
      return;
    }

    if (
      !window.confirm(
        'Jalankan Auto-Shuffle sekarang? Seluruh peserta akan didistribusikan secara proporsional dan seimbang berdasarkan jenis kelamin (L/P).'
      )
    ) {
      return;
    }

    setShuffling(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(
          data.message || `Berhasil mengacak kelompok untuk ${data.count} peserta!`
        );
        await fetchData();
      } else {
        setError(data.error || 'Gagal melakukan pengacakan kelompok.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi saat pengacakan kelompok.');
    } finally {
      setShuffling(false);
    }
  };

  // Clear Roster
  const handleClearRoster = async () => {
    if (
      !window.confirm(
        'PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA PESERTA? Tindakan ini tidak dapat dibatalkan.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_roster' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess('Seluruh data peserta telah dikosongkan.');
        await fetchData();
      } else {
        setError(data.error || 'Gagal mengosongkan peserta');
      }
    } catch {
      setError('Terjadi kendala saat mengosongkan peserta.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (participants.length === 0) return;

    const headers = ['No', 'NIM', 'Nama Lengkap', 'Golongan', 'Jenis Kelamin', 'Status Akun', 'Nomor Kelompok', 'Tanggal Terdaftar'];
    const rows = participants.map((p, idx) => [
      idx + 1,
      `"${p.nim}"`,
      `"${p.nama.replace(/"/g, '""')}"`,
      `"${(p.golongan || '').replace(/"/g, '""')}"`,
      p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      p.status || 'APPROVED',
      p.group_number ? `Kelompok ${p.group_number}` : 'Belum Ditentukan',
      `"${new Date(p.created_at).toLocaleString('id-ID')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Kelompok_Peserta_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Participants List
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Search query filter
      const q = searchTerm.toLowerCase();
      const matchSearch =
        p.nama.toLowerCase().includes(q) ||
        p.nim.toLowerCase().includes(q) ||
        (p.golongan && p.golongan.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Golongan filter
      if (selectedGolonganFilter !== 'all') {
        const pGol = (p.golongan || '').trim().toUpperCase();
        // Match exact or normalized letter (e.g. 'A' matches 'A' or 'GOLONGAN A')
        if (pGol !== selectedGolonganFilter && !pGol.endsWith(` ${selectedGolonganFilter}`)) {
          return false;
        }
      }

      // Group filter
      if (selectedGroupFilter === 'unassigned' && p.group_number !== null) return false;
      if (
        selectedGroupFilter !== 'all' &&
        selectedGroupFilter !== 'unassigned' &&
        p.group_number !== parseInt(selectedGroupFilter, 10)
      ) {
        return false;
      }

      // Gender filter
      if (selectedGenderFilter !== 'all' && p.gender !== selectedGenderFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && p.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [participants, searchTerm, selectedGolonganFilter, selectedGroupFilter, selectedGenderFilter, selectedStatusFilter]);

  const pendingCount = useMemo(() => {
    return participants.filter((p) => p.status === 'PENDING').length;
  }, [participants]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="w-full border-b border-neutral-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-[#111111]">
              <Shield className="w-5 h-5 text-[#111111]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-[#111111] font-heading">
                  Panel Administrator
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#B4E50D] text-[#111111]">
                  Master Control
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium block">
                Sistem Alokasi Kelompok & Verifikasi Peserta
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={refreshing}
              title="Segarkan data peserta"
              className="p-2 rounded-xl bg-[#FBFBFA] hover:bg-neutral-100 border border-neutral-300 text-neutral-600 hover:text-[#111111] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#111111]' : ''}`} />
            </button>

            <button
              id="admin-to-participant-login-btn"
              onClick={() => handleLogout('/')}
              disabled={loggingOut}
              title="Keluar dari Admin dan buka Halaman Login Peserta"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Ke Login Peserta</span>
            </button>

            <button
              id="admin-logout-btn"
              onClick={() => handleLogout('/')}
              disabled={loggingOut}
              title="Keluar dari sesi Admin"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FBFBFA] hover:bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-[#111111] text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-neutral-500" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{actionSuccess}</div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Summary Statistics Cards (5 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Peserta */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Peserta</span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#111111] font-heading">
              {stats?.totalParticipants || 0}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">Terdaftar di database</div>
          </div>

          {/* Card 2: Laki-laki */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Laki-laki (L)</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">L</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-900 font-heading">
              {stats?.totalMales || 0}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">
              {stats && stats.totalParticipants > 0
                ? `${Math.round((stats.totalMales / stats.totalParticipants) * 100)}% dari total`
                : '0%'}
            </div>
          </div>

          {/* Card 3: Perempuan */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Perempuan (P)</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">P</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-900 font-heading">
              {stats?.totalFemales || 0}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">
              {stats && stats.totalParticipants > 0
                ? `${Math.round((stats.totalFemales / stats.totalParticipants) * 100)}% dari total`
                : '0%'}
            </div>
          </div>

          {/* Card 4: Menunggu Persetujuan (PENDING) */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 card-shadow">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Perlu Persetujuan</span>
              <Hourglass className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-800 font-heading">
              {pendingCount}
            </div>
            <div className="text-[11px] text-amber-700 mt-1 font-medium">Status Akun PENDING</div>
          </div>

          {/* Card 5: Belum Ditentukan Kelompok */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Belum Diacak</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">Grup ?</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-neutral-800 font-heading">
              {stats?.totalUnassigned ?? 0}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">Siap untuk Auto-Shuffle</div>
          </div>
        </div>

        {/* Action Toolbar: Auto-Shuffle, Settings & Clear Roster */}
        <div className="p-6 rounded-3xl bg-white border border-neutral-200 card-shadow flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B4E50D]/20 text-[#111111] text-xs font-bold mb-2">
              <Shuffle className="w-3.5 h-3.5" />
              <span>Algoritma Penyeimbang Gender L/P</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#111111] font-heading">
              Eksekusi Auto-Shuffle Kelompok
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              Tombol ini akan mendistribusikan peserta secara seimbang berdasarkan jenis kelamin (L/P) dan mengisi nomor kelompok ke database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {pendingCount > 0 && (
              <button
                onClick={handleApproveAll}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition btn-lift cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Setujui Semua ({pendingCount} PENDING)</span>
              </button>
            )}

            <button
              id="admin-auto-shuffle-btn"
              onClick={handleAutoShuffle}
              disabled={shuffling || participants.length === 0}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-black text-sm tracking-wide transition btn-lift cursor-pointer border border-[#9ecc09] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shuffle className={`w-4 h-4 ${shuffling ? 'animate-spin' : ''}`} />
              <span>{shuffling ? 'Mengacak Kelompok...' : 'Jalankan Auto-Shuffle'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={participants.length === 0}
              title="Unduh data ke file CSV"
              className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl border border-neutral-300 bg-[#FBFBFA] hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Publication Control Banner / Switch */}
        {(() => {
          const isResultsPublished = Boolean(stats?.isPublished ?? stats?.settings?.isPublished);
          return (
            <div
              className={`p-6 rounded-3xl border card-shadow transition-all ${
                isResultsPublished
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-amber-50/70 border-amber-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-3 rounded-2xl shrink-0 shadow-xs ${
                      isResultsPublished
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {isResultsPublished ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          isResultsPublished
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isResultsPublished ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                        />
                        {isResultsPublished
                          ? 'Hasil Terpublikasi ke Peserta'
                          : 'Hasil Disembunyikan (Draf Admin)'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                      {isResultsPublished
                        ? 'Pengumuman Kelompok Sedang Aktif Dilihat Peserta'
                        : 'Pengumuman Kelompok Masih Disembunyikan dari Peserta'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-0.5 font-medium leading-relaxed">
                      {isResultsPublished
                        ? 'Seluruh peserta yang telah disetujui dan memiliki nomor kelompok dapat melihat kelompok dan daftar rekan sekelompoknya di dashboard mereka.'
                        : 'Peserta yang disetujui saat ini hanya melihat konfirmasi akun aktif. Nomor kelompok dan daftar rekan sekelompok masih disembunyikan sampai Anda menekan tombol publikasi.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {isResultsPublished ? (
                    <button
                      id="hide-group-results-btn"
                      onClick={() => handleTogglePublish(false)}
                      disabled={publishing}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <EyeOff className="w-4 h-4 text-slate-500" />
                      <span>{publishing ? 'Memproses...' : 'Sembunyikan Hasil dari Peserta'}</span>
                    </button>
                  ) : (
                    <button
                      id="publish-group-results-btn"
                      onClick={() => handleTogglePublish(true)}
                      disabled={publishing}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md transition btn-lift cursor-pointer disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4 text-[#B4E50D]" />
                      <span>{publishing ? 'Memproses...' : '📢 Publikasikan Hasil ke Peserta'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Group Distribution Breakdown Overview */}
        {stats && stats.groupBreakdowns && (
          <div className="p-6 rounded-3xl bg-white border border-neutral-200 card-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111111] font-heading">
                    Distribusi Kelompok ({stats.settings.totalGroups} Kelompok Aktif)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Cross-Golongan & Gender Balanced
                  </span>
                </div>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  Rincian lengkap anggota tiap kelompok: Nama Lengkap, NIM, Golongan (A/B/C/D), dan 👑 Ketua Kelompok terpilih.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {stats.groupBreakdowns.map((grp) => {
                const groupMembers = participants
                  .filter((p) => p.group_number === grp.group_number)
                  .sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0));
                const currentLeader = groupMembers.find((m) => m.is_leader);

                return (
                  <div
                    key={grp.group_number}
                    className="p-5 rounded-2xl bg-[#FBFBFA] border border-neutral-200 flex flex-col justify-between hover:border-neutral-300 transition shadow-xs"
                  >
                    <div>
                      {/* Group Card Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-black text-[#111111] font-heading">
                            Kelompok {grp.group_number}
                          </span>
                          {currentLeader && (
                            <span
                              title={`Ketua: ${currentLeader.nama}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black"
                            >
                              <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span className="max-w-[100px] truncate">{currentLeader.nama}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 shadow-2xs">
                          {grp.total} / {grp.maxCapacity}
                        </span>
                      </div>

                      {/* Visual Bar */}
                      <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-[#111111] transition-all duration-300"
                          style={{ width: `${grp.percentageFilled}%` }}
                        />
                      </div>

                      {/* Gender ratio badges & summary */}
                      <div className="flex items-center justify-between text-xs pb-3 mb-3 border-b border-neutral-200/80 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-700 font-bold flex items-center gap-1 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                            L: {grp.males}
                          </span>
                          <span className="text-rose-700 font-bold flex items-center gap-1 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                            P: {grp.females}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          {groupMembers.length} Anggota Terdaftar
                        </span>
                      </div>

                      {/* Detailed Members List: Nama, NIM, Golongan, Ketua */}
                      <div className="space-y-2">
                        {groupMembers.length === 0 ? (
                          <div className="py-6 text-center text-neutral-400 text-xs italic bg-white/60 rounded-xl border border-dashed border-neutral-200">
                            Belum ada anggota (Jalankan Auto-Shuffle)
                          </div>
                        ) : (
                          groupMembers.map((m) => (
                            <div
                              key={m.id}
                              className={`p-2.5 rounded-xl border transition-all ${
                                m.is_leader
                                  ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/60 shadow-2xs'
                                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[#111111] truncate">
                                      {m.nama}
                                    </span>
                                    {m.is_leader && (
                                      <span
                                        title="Ketua Kelompok Terpilih"
                                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black shrink-0"
                                      >
                                        <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                        <span>Ketua</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                                    NIM: {m.nim}
                                  </div>
                                </div>

                                {/* Badges: Golongan, Gender & Leader Action */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    title={`Golongan ${m.golongan}`}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getGolonganBadge(
                                      m.golongan
                                    )}`}
                                  >
                                    Gol. {m.golongan}
                                  </span>
                                  <span
                                    title={m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      m.gender === 'L'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {m.gender}
                                  </span>
                                  <button
                                    onClick={() => handleToggleLeader(m.id, Boolean(m.is_leader))}
                                    title={
                                      m.is_leader
                                        ? 'Batalkan status Ketua'
                                        : 'Jadikan Ketua Kelompok ini'
                                    }
                                    className={`p-1 rounded-lg border transition cursor-pointer ${
                                      m.is_leader
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                                        : 'bg-neutral-50 hover:bg-amber-50 text-neutral-400 hover:text-amber-700 border-neutral-200'
                                    }`}
                                  >
                                    <Crown
                                      className={`w-3.5 h-3.5 ${
                                        m.is_leader ? 'fill-amber-500 text-amber-700' : ''
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two-Column Section: Manual Add Participant & Group Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manual Add Form */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-neutral-200 card-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-neutral-100 text-[#111111]">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#111111] font-heading">Tambah Peserta Manual</h3>
                <p className="text-xs text-neutral-500 font-medium">Daftarkan peserta langsung oleh admin (otomatis APPROVED)</p>
              </div>
            </div>

            <form onSubmit={handleAddParticipant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="admin-add-nim" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                    NIM
                  </label>
                  <input
                    id="admin-add-nim"
                    type="text"
                    value={newNim}
                    onChange={(e) => setNewNim(e.target.value)}
                    placeholder="Contoh: 230110"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label htmlFor="admin-add-nama" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    id="admin-add-nama"
                    type="text"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Nama peserta"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label htmlFor="admin-add-golongan" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                    Golongan
                  </label>
                  <select
                    id="admin-add-golongan"
                    value={newGolongan}
                    onChange={(e) => setNewGolongan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                  >
                    <option value="A">Golongan A</option>
                    <option value="B">Golongan B</option>
                    <option value="C">Golongan C</option>
                    <option value="D">Golongan D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-add-gender" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    id="admin-add-gender"
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="admin-add-group" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                    Kelompok (Opsional)
                  </label>
                  <input
                    id="admin-add-group"
                    type="number"
                    min="1"
                    max={stats?.settings?.totalGroups || 30}
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="Kosongkan jika ingin diacak nanti"
                    className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#B4E50D]" />
                <span>{submitting ? 'Menyimpan...' : 'Tambahkan Peserta'}</span>
              </button>
            </form>
          </div>

          {/* Group Settings */}
          <div className="p-6 rounded-3xl bg-white border border-neutral-200 card-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-neutral-100 text-[#111111]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#111111] font-heading">Pengaturan Kelompok</h3>
                <p className="text-xs text-neutral-500 font-medium">Batas kapasitas & kelompok</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label htmlFor="admin-total-groups" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                  Jumlah Kelompok (2 - 30)
                </label>
                <input
                  id="admin-total-groups"
                  type="number"
                  min="2"
                  max="30"
                  value={totalGroupsInput}
                  onChange={(e) => setTotalGroupsInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label htmlFor="admin-max-capacity" className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                  Kapasitas Maksimal Per Kelompok
                </label>
                <input
                  id="admin-max-capacity"
                  type="number"
                  min="1"
                  max="200"
                  value={maxPerGroupInput}
                  onChange={(e) => setMaxPerGroupInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-300 text-[#111111] font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-neutral-100">
              <button
                onClick={handleClearRoster}
                className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#FB4141] font-bold text-[11px] transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Seluruh Peserta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Master Participant Roster Table */}
        <div className="rounded-3xl bg-white border border-neutral-200 card-shadow overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-6 border-b border-neutral-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#111111] font-heading flex items-center gap-2">
                <span>Daftar Peserta Terdaftar</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600">
                  {filteredParticipants.length} dari {participants.length}
                </span>
                {pendingCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800">
                    {pendingCount} PENDING
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Roster seluruh mahasiswa/peserta beserta status verifikasi akun & penempatan kelompok
              </p>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari NIM, nama, golongan..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B4E50D]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium"
              >
                <option value="all">Semua Status</option>
                <option value="PENDING">Status: PENDING</option>
                <option value="APPROVED">Status: APPROVED</option>
              </select>

              {/* Golongan Filter */}
              <select
                id="admin-filter-golongan"
                value={selectedGolonganFilter}
                onChange={(e) => setSelectedGolonganFilter(e.target.value)}
                className="px-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium"
              >
                <option value="all">Semua Golongan</option>
                <option value="A">Golongan A</option>
                <option value="B">Golongan B</option>
                <option value="C">Golongan C</option>
                <option value="D">Golongan D</option>
              </select>

              {/* Group Filter */}
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="px-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium"
              >
                <option value="all">Semua Kelompok</option>
                <option value="unassigned">Belum Ditentukan</option>
                {stats &&
                  stats.groupBreakdowns.map((g) => (
                    <option key={g.group_number} value={g.group_number.toString()}>
                      Kelompok {g.group_number}
                    </option>
                  ))}
              </select>

              {/* Gender Filter */}
              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="px-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-medium"
              >
                <option value="all">Semua Gender</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FBFBFA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">NIM</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Golongan</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Status Kelompok</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-neutral-400">
                      Tidak ada data peserta yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3 px-4 text-neutral-400 text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#111111]">{p.nim}</td>
                      <td className="py-3 px-4 font-bold text-[#111111]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{p.nama}</span>
                          {p.is_leader && (
                            <span
                              title={`Ketua Kelompok ${p.group_number}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black shrink-0"
                            >
                              <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                              <span>Ketua Kel. {p.group_number}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${getGolonganBadge(
                            p.golongan
                          )}`}
                        >
                          <Layers className="w-3 h-3" />
                          <span>Golongan {p.golongan}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.gender === 'L'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.gender === 'L' ? 'L (Laki-laki)' : 'P (Perempuan)'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold">
                            <Hourglass className="w-2.5 h-2.5" />
                            <span>PENDING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>APPROVED</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.group_number ? (
                          <div className="inline-flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B4E50D]/20 text-[#111111] font-black border border-[#B4E50D]/60 text-[11px]">
                              Kelompok {p.group_number}
                            </span>
                            {p.is_leader && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                <span>Ketua</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-bold">
                            Belum Ditentukan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprove(p.id, p.nama)}
                              title="Setujui Akun Peserta"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Setujui</span>
                            </button>
                          )}
                          {p.group_number && (
                            <button
                              onClick={() => handleToggleLeader(p.id, Boolean(p.is_leader))}
                              title={
                                p.is_leader
                                  ? 'Batalkan status Ketua'
                                  : 'Pilih sebagai Ketua Kelompok'
                              }
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                p.is_leader
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                                  : 'hover:bg-amber-50 text-neutral-400 hover:text-amber-700 border-neutral-200'
                              }`}
                            >
                              <Crown
                                className={`w-3.5 h-3.5 ${
                                  p.is_leader ? 'fill-amber-500 text-amber-700' : ''
                                }`}
                              />
                            </button>
                          )}
                          <button
                            onClick={() => openReassignModal(p)}
                            title="Ubah Kelompok Peserta"
                            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.nama)}
                            title="Hapus Peserta"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit / Reassign Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-extrabold text-sm sm:text-base text-[#111111] font-heading">
                Pindah Kelompok Peserta
              </h4>
              <button
                onClick={() => setEditingParticipant(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 text-xs text-neutral-600 bg-[#FBFBFA] p-3 rounded-xl border border-neutral-200 space-y-1">
              <div>
                Nama: <span className="font-bold text-[#111111]">{editingParticipant.nama}</span>
              </div>
              <div>
                NIM: <span className="font-mono font-bold text-[#111111]">{editingParticipant.nim}</span>
              </div>
              <div>
                Golongan: <span className="font-bold text-[#111111]">{editingParticipant.golongan}</span>
              </div>
              <div>
                Kelompok Saat Ini:{' '}
                <span className="font-bold text-[#111111]">
                  {editingParticipant.group_number ? `Kelompok ${editingParticipant.group_number}` : 'Belum Ada'}
                </span>
              </div>
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-1">
                  Pindahkan ke Kelompok
                </label>
                <select
                  value={reassignGroup}
                  onChange={(e) => setReassignGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-xs font-bold text-[#111111]"
                >
                  {stats &&
                    stats.groupBreakdowns.map((g) => (
                      <option key={g.group_number} value={g.group_number.toString()}>
                        Kelompok {g.group_number} ({g.total} / {g.maxCapacity} anggota)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] text-xs font-black transition border border-[#9ecc09]"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
