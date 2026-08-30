'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, Lock, Sparkles, AlertCircle, Copy, Check, CheckCircle } from 'lucide-react';

export default function ParticipantDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ name: string; groupNumber: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchMyGroup() {
      try {
        const res = await fetch('/api/participant/my-group');
        if (res.status === 401 || res.status === 403) {
          router.replace('/');
          return;
        }
        const json = await res.json();
        if (json.success) {
          setData({
            name: json.name,
            groupNumber: json.groupNumber,
          });
        } else {
          setError(json.error || 'Failed to load group assignment.');
        }
      } catch (err) {
        console.error(err);
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchMyGroup();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      router.push('/');
    }
  };

  const handleCopyGroup = () => {
    if (data?.groupNumber) {
      navigator.clipboard.writeText(`Group ${data.groupNumber}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#B4E50D]/20 border border-[#B4E50D]/40 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-[#111111]" />
          </div>
          <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
            <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
            <span>Loading your assignment...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-neutral-200 text-center card-shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#FB4141] flex items-center justify-center mx-auto mb-4 border border-[#FB4141]/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#111111] mb-2 font-heading">Unable to Load Assignment</h2>
          <p className="text-neutral-500 text-sm mb-6">{error || 'Session expired or not found.'}</p>
          <button
            onClick={() => router.replace('/')}
            className="w-full py-3 px-4 rounded-xl bg-[#B4E50D] hover:bg-[#a8db0a] text-[#111111] font-extrabold text-sm transition btn-lift cursor-pointer border border-[#9ecc09]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111] flex flex-col relative overflow-hidden">
      {/* Handcrafted subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e5e0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#B4E50D]/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-[#111111]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-[#111111] block font-heading">
                Secret Group System
              </span>
              <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B4E50D] border border-[#111111]/40 inline-block" />
                Confidential Participant Session
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FBFBFA] hover:bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-[#111111] text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-neutral-500" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Assignment Reveal View */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-md mx-auto w-full z-10">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 text-[#111111] text-xs font-bold shadow-sm mb-3">
            <div className="w-2 h-2 rounded-full bg-[#FB4141]" />
            <span>Official Assignment</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] font-heading">
            Hello, <span className="underline decoration-[#B4E50D] decoration-4 underline-offset-4">{data.name}</span>! 👋
          </h1>
          <p className="text-neutral-500 text-sm mt-1.5 font-medium">
            Your auto-assigned group is confirmed.
          </p>
        </div>

        <div className="w-full rounded-3xl bg-white border border-neutral-200/90 p-7 sm:p-9 card-shadow-lg text-center relative overflow-hidden">
          {/* Top Brand Lime accent strip */}
          <div className="absolute top-0 inset-x-0 h-2 bg-[#B4E50D]" />

          <div className="my-5">
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 block mb-2">
              You are assigned to
            </span>

            {/* Enormous and Bold Group Number */}
            <div className="relative inline-flex items-center justify-center my-3">
              <div className="absolute -inset-3 bg-[#B4E50D]/30 rounded-3xl blur-xl" />
              <div className="relative px-10 py-5 rounded-2xl bg-[#FBFBFA] border-2 border-[#111111] shadow-md flex flex-col items-center">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-[#111111] font-heading">
                  Group {data.groupNumber}
                </span>
                <div className="mt-1 px-2.5 py-0.5 bg-[#B4E50D] text-[#111111] text-[11px] font-extrabold uppercase tracking-wider rounded-md">
                  Active Participant
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200 flex justify-center">
            <button
              onClick={handleCopyGroup}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FBFBFA] hover:bg-neutral-100 border border-neutral-300 text-[#111111] text-xs font-bold transition duration-200 cursor-pointer shadow-sm btn-lift"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied Group {data.groupNumber}!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-neutral-600" />
                  <span>Copy Group Number</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-[#FBFBFA] border border-neutral-200 text-left flex items-start gap-3">
            <div className="p-1 rounded bg-neutral-200/60 text-[#111111] shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs text-neutral-600 space-y-1">
              <span className="font-bold text-[#111111] block">Confidentiality Protected</span>
              <p className="leading-relaxed">
                Other participants cannot view who else is in this group. Group assignments remain secret and private.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-neutral-500 flex items-center justify-center gap-1.5 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Connected to Secret Group Assignment Engine</span>
        </div>
      </main>
    </div>
  );
}
