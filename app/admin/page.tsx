'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  UserPlus,
  Users,
  Layers,
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
} from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE';
  role: 'PARTICIPANT';
  group_number: number;
  created_at: string;
}

interface GroupBreakdown {
  group_number: number;
  total: number;
  males: number;
  females: number;
  maxCapacity: number;
  isFull: boolean;
  percentageFilled: number;
}

interface Stats {
  totalParticipants: number;
  totalMales: number;
  totalFemales: number;
  totalCapacity: number;
  settings: {
    totalGroups: number;
    maxPerGroup: number;
  };
  groupBreakdowns: GroupBreakdown[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Group Settings State
  const [totalGroupsInput, setTotalGroupsInput] = useState('4');
  const [maxPerGroupInput, setMaxPerGroupInput] = useState('10');
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Add Participant Form State
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [newGroup, setNewGroup] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');

  // Edit / Reassign Modal State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [reassignGroup, setReassignGroup] = useState('1');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch all participants & stats
  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/participants');
      if (res.status === 401 || res.status === 403) {
        // Strictly redirect to homepage if unauthorized
        router.replace('/');
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
      } else {
        router.replace('/');
      }
    } catch {
      setError('Network error fetching admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      router.replace('/');
    }
  };

  // Save Group Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const tg = parseInt(totalGroupsInput, 10);
    const mpg = parseInt(maxPerGroupInput, 10);

    if (isNaN(tg) || tg < 2 || tg > 30) {
      setError('Total Groups must be between 2 and 30.');
      return;
    }
    if (isNaN(mpg) || mpg < 1 || mpg > 200) {
      setError('Max Per Group must be between 1 and 200.');
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
        setActionSuccess(`Settings updated: ${tg} Total Groups, Max ${mpg} members per group.`);
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch {
      setError('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Please enter a participant name.');
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
          name: newName.trim(),
          gender: newGender,
          groupNumber: newGroup ? parseInt(newGroup, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to add participant');
      } else {
        setActionSuccess(data.message || 'Participant registered successfully!');
        setNewName('');
        setNewGroup('');
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      setError('Failed to add participant.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Participant
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/participants/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to delete participant');
      } else {
        setActionSuccess(`Removed "${name}".`);
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      setError('Failed to delete participant.');
    }
  };

  // Reassign Participant Group
  const openReassignModal = (p: Participant) => {
    setEditingParticipant(p);
    setReassignGroup(p.group_number.toString());
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;

    setEditSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/participants/${editingParticipant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupNumber: parseInt(reassignGroup, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to reassign participant');
      } else {
        setActionSuccess(`Reassigned "${editingParticipant.name}" to Group ${reassignGroup}.`);
        setEditingParticipant(null);
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      setError('Failed to reassign participant');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Clear Roster (Critical action using Brand Coral)
  const handleClearRoster = async () => {
    if (
      !window.confirm(
        'WARNING: Are you sure you want to clear the entire participant roster? This action cannot be undone.'
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
        setActionSuccess('Participant roster cleared successfully.');
        await fetchData();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to clear roster');
      }
    } catch {
      setError('Failed to clear roster');
    }
  };

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `group ${p.group_number}`.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGroup =
        selectedGroupFilter === 'all' || p.group_number.toString() === selectedGroupFilter;

      const matchesGender =
        selectedGenderFilter === 'all' || p.gender === selectedGenderFilter;

      return matchesSearch && matchesGroup && matchesGender;
    });
  }, [participants, searchTerm, selectedGroupFilter, selectedGenderFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (participants.length === 0) return;
    const headers = ['ID', 'Participant Name', 'Gender', 'Assigned Group', 'Registered Time'];
    const rows = participants.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.gender,
      p.group_number,
      `"${p.created_at}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gender_balanced_groups_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalConfiguredGroups = stats?.settings?.totalGroups || 4;
  const configuredGroupsList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= totalConfiguredGroups; i++) {
      list.push(i);
    }
    return list;
  }, [totalConfiguredGroups]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#111111] border-t-[#B4E50D] rounded-full animate-spin" />
          <span className="text-sm font-medium text-neutral-600">Loading Administrator Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111] flex flex-col selection:bg-[#B4E50D] selection:text-[#111111]">
      {/* Top Header Navigation */}
      <header className="w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-[#111111]">
              <Shield className="w-5 h-5 text-[#111111]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-[#111111] text-sm sm:text-base font-heading">
                  Admin Control Center
                </span>
                {/* Active Brand Lime status badge */}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#B4E50D] text-[#111111] border border-[#9ecc09] shadow-2xs">
                  GENDER-BALANCED ENGINE
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 hidden sm:block font-medium">
                Auto-Allocation & Capacity Configuration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-2 rounded-xl bg-[#FBFBFA] hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-[#111111] transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 border border-neutral-300 hover:border-[#FB4141]/40 text-neutral-700 hover:text-[#FB4141] text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Action / Error Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-[#FB4141]/30 flex items-start gap-3 text-red-800 text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-[#FB4141] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Notice</span>
              <p className="font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg text-red-600 hover:bg-red-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-[#F4FBDB] border border-[#B4E50D] flex items-center gap-3 text-[#111111] text-sm animate-in fade-in duration-200 font-semibold shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-[#111111] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Section 1: Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-neutral-100 text-[#111111]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Total Registered
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] font-heading">
                {stats?.totalParticipants ?? participants.length}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-[#F4FBDB] text-[#111111]">
              <span className="text-xl font-bold">♂</span>
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Total Males
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] font-heading">
                {stats?.totalMales ?? 0}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-[#FFEBEB] text-[#111111]">
              <span className="text-xl font-bold">♀</span>
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Total Females
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] font-heading">
                {stats?.totalFemales ?? 0}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-neutral-200 card-shadow flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-neutral-100 text-[#111111]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                System Capacity
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] font-heading">
                {stats?.totalParticipants ?? 0} / {stats?.totalCapacity ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Group Settings & Capacity Configurator */}
        <section className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 card-shadow">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-neutral-200">
            <div className="p-2 rounded-lg bg-neutral-100 text-[#111111]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111] font-heading">
                Group Settings & Allocation Parameters
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                Configure total groups and maximum capacity per group. The server uses these limits to enforce balanced auto-allocation.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Total Groups (`totalGroups`)
              </label>
              <input
                type="number"
                min="2"
                max="30"
                value={totalGroupsInput}
                onChange={(e) => setTotalGroupsInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] font-mono text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
              />
              <span className="text-[11px] text-neutral-500 block mt-1">Number of active groups (e.g. 4)</span>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Max Members Per Group (`maxPerGroup`)
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={maxPerGroupInput}
                onChange={(e) => setMaxPerGroupInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] font-mono text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
              />
              <span className="text-[11px] text-neutral-500 block mt-1">Capacity cap per group (e.g. 10)</span>
            </div>

            <div className="sm:col-span-2">
              {/* Solid Brand Lime Save Settings Button */}
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 px-4 bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-sm rounded-xl shadow-sm transition btn-lift flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-[#9ecc09]"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </section>

        {/* Section 3: Group Statistics & Gender-Balance Verification Cards */}
        <section className="p-6 rounded-2xl bg-white border border-neutral-200 card-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#111111] flex items-center gap-2 font-heading">
                <Layers className="w-4 h-4 text-[#111111]" />
                Gender-Balanced Group Distribution Verification
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                Real-time breakdown of Male ♂ and Female ♀ allocation across each active group.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#111111] bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200 w-fit">
              Capacity: {stats?.settings?.maxPerGroup || 10} / group
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats?.groupBreakdowns.map((g) => (
              <div
                key={g.group_number}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  g.isFull
                    ? 'bg-red-50/50 border-[#FB4141]/30'
                    : 'bg-[#FBFBFA] border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-sm text-[#111111] flex items-center gap-1.5 font-heading">
                    <span className="w-2 h-2 rounded-full bg-[#111111]" />
                    Group {g.group_number}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      g.isFull
                        ? 'bg-[#FFEBEB] text-[#FB4141] border border-[#FB4141]/30'
                        : 'bg-white text-[#111111] border border-neutral-200'
                    }`}
                  >
                    {g.isFull ? 'FULL' : `${g.total}/${g.maxCapacity}`}
                  </span>
                </div>

                {/* Male vs Female Counts using Soft Derived Shades */}
                <div className="grid grid-cols-2 gap-2 my-2.5 text-xs">
                  <div className="p-2 rounded-lg bg-[#F4FBDB] border border-[#B4E50D]/40 text-[#111111] flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      <span>♂</span> Male:
                    </span>
                    <span className="font-mono font-extrabold">{g.males}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#FFEBEB] border border-[#FB4141]/20 text-[#111111] flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      <span>♀</span> Female:
                    </span>
                    <span className="font-mono font-extrabold">{g.females}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden mt-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      g.isFull ? 'bg-[#FB4141]' : 'bg-[#B4E50D]'
                    }`}
                    style={{ width: `${g.percentageFilled}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1.5 font-mono">
                  <span>{g.percentageFilled}% filled</span>
                  <span>{g.maxCapacity - g.total} spots left</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Manual Add / Pre-register Form */}
        <section className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 card-shadow">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-neutral-200">
            <div className="p-2 rounded-lg bg-neutral-100 text-[#111111]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111] font-heading">Manual Add Participant</h2>
              <p className="text-xs text-neutral-500 font-medium">
                Directly register a participant. Leave group blank to let the gender-balanced algorithm assign them automatically.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddParticipant} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Participant Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                required
                className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as 'MALE' | 'FEMALE')}
                className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] cursor-pointer font-medium"
              >
                <option value="MALE">♂ Male</option>
                <option value="FEMALE">♀ Female</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Group (Optional)
              </label>
              <input
                type="number"
                min="1"
                max={totalConfiguredGroups}
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="Auto"
                className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-sm font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-sm rounded-xl shadow-sm transition btn-lift flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-[#9ecc09]"
              >
                {submitting ? '...' : 'Add'}
              </button>
            </div>
          </form>
        </section>

        {/* Section 5: Master Participant Roster Table */}
        <section className="rounded-2xl bg-white border border-neutral-200 card-shadow overflow-hidden">
          {/* Controls Bar */}
          <div className="p-5 sm:p-6 border-b border-neutral-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2 font-heading">
                <span>Master Participant Roster</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono font-bold border border-neutral-200">
                  {filteredParticipants.length} entries
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                Complete roster with Gender and Auto-Assigned Groups.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-48">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name/group..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] placeholder-neutral-400 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                />
              </div>

              {/* Gender Filter */}
              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="px-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] cursor-pointer"
              >
                <option value="all">All Genders</option>
                <option value="MALE">♂ Male</option>
                <option value="FEMALE">♀ Female</option>
              </select>

              {/* Group Filter */}
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="px-3 py-2 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111] cursor-pointer"
              >
                <option value="all">All Groups</option>
                {configuredGroupsList.map((g) => (
                  <option key={g} value={g.toString()}>
                    Group {g}
                  </option>
                ))}
              </select>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-[#111111] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer btn-lift"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {/* Clear Roster (Critical Action using Brand Coral) */}
              <button
                type="button"
                onClick={handleClearRoster}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 border border-[#FB4141]/40 text-[#FB4141] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer btn-lift"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#FB4141]" />
                <span>Clear Roster</span>
              </button>
            </div>
          </div>

          {/* Clean Data Table with Alternating Subtle Gray Rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-[#FBFBFA] text-[11px] uppercase tracking-wider font-extrabold text-neutral-500">
                  <th className="py-3.5 px-4 sm:px-6">#</th>
                  <th className="py-3.5 px-4 sm:px-6">Participant Name</th>
                  <th className="py-3.5 px-4 sm:px-6">Gender</th>
                  <th className="py-3.5 px-4 sm:px-6">Assigned Group</th>
                  <th className="py-3.5 px-4 sm:px-6">Joined Time</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-500">
                      <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="font-bold text-neutral-700">No participants found</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Participants who join via the homepage will appear here automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="border-b border-neutral-100 transition-colors odd:bg-white even:bg-[#F9F9F8] hover:bg-neutral-100/60"
                    >
                      <td className="py-4 px-4 sm:px-6 text-xs text-neutral-400 font-mono font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                            {p.name.charAt(0)}
                          </div>
                          <span className="font-bold text-[#111111]">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            p.gender === 'FEMALE'
                              ? 'bg-[#FFEBEB] text-[#111111] border border-[#FB4141]/20'
                              : 'bg-[#F4FBDB] text-[#111111] border border-[#B4E50D]/40'
                          }`}
                        >
                          <span>{p.gender === 'FEMALE' ? '♀' : '♂'}</span>
                          <span>{p.gender}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FBFBFA] border border-neutral-300 text-[#111111]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B4E50D] border border-[#111111]/30" />
                          Group {p.group_number}
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-xs text-neutral-500 font-mono">
                        {new Date(p.created_at).toLocaleDateString()}{' '}
                        {new Date(p.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openReassignModal(p)}
                            title="Reassign Group"
                            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Remove Participant"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-500 hover:text-[#FB4141] transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Reassign Group Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200">
              <h3 className="font-bold text-[#111111] text-base flex items-center gap-2 font-heading">
                <Edit2 className="w-4 h-4 text-[#111111]" />
                Reassign Group
              </h3>
              <button
                onClick={() => setEditingParticipant(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-[#111111] hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              Reassign <strong className="text-[#111111] font-bold">{editingParticipant.name}</strong> ({editingParticipant.gender}) to a new group:
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase mb-1.5">
                  New Group Number
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalConfiguredGroups}
                  value={reassignGroup}
                  onChange={(e) => setReassignGroup(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-[#FBFBFA] border border-neutral-300 rounded-xl text-[#111111] text-sm font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B4E50D] focus:border-[#111111]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] text-xs font-extrabold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border border-[#9ecc09] btn-lift"
                >
                  {editSubmitting ? 'Saving...' : 'Update Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
