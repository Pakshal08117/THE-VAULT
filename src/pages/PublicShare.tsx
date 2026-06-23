import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  KeyRound, ShieldAlert, BookOpen, Clock, Calendar, Tag as TagIcon,
  Lock, Globe, Timer, Eye, AlertTriangle, CheckCircle2, Sparkles,
} from 'lucide-react';
import { ShareMode } from '../types';

interface ShareMeta {
  share_mode: ShareMode;
  has_passcode: boolean;
  expires_at: string | null;
  max_views: number | null;
  views_remaining: number | null;
  view_count: number;
  is_locked: boolean;
  lockout_seconds: number;
  failed_attempts: number;
}

interface SharedWriting {
  title: string;
  content: string;
  content_type: string;
  created_at: string;
  category_name: string | null;
  tags: string[];
  share_mode: ShareMode;
  expires_at: string | null;
  view_count: number;
  max_views: number | null;
  views_remaining: number | null;
}

const MODE_CONFIG: Record<ShareMode, { icon: React.ReactNode; label: string; color: string }> = {
  public:       { icon: <Globe  size={12} />, label: 'Public',       color: 'text-vault-emerald border-vault-emerald/30 bg-vault-emerald/10' },
  passcode:     { icon: <Lock   size={12} />, label: 'Protected',    color: 'text-vault-gold    border-vault-gold/30    bg-vault-gold/10'    },
  expiring:     { icon: <Timer  size={12} />, label: 'Expiring',     color: 'text-sky-400       border-sky-400/30       bg-sky-400/10'       },
  view_limited: { icon: <Eye    size={12} />, label: 'View-Limited', color: 'text-purple-400    border-purple-400/30    bg-purple-400/10'    },
};

function useCountdown(targetIso: string | null) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!targetIso) return;
    const calc = () => Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000));
    setSeconds(calc());
    const id = setInterval(() => setSeconds(calc()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { seconds, formatted: `${h}h ${m}m ${s}s` };
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-vault-800">
      <div
        className="h-full bg-gradient-to-r from-vault-gold to-amber-400 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export const PublicShare: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'locked' | 'reading' | 'error'>('loading');
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [writing, setWriting] = useState<SharedWriting | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Passcode unlock state
  const [passcode, setPasscode] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lockout countdown (if brute-force locked)
  const lockoutEnd = meta?.is_locked ? new Date(Date.now() + (meta.lockout_seconds || 0) * 1000).toISOString() : null;
  const { seconds: lockoutSecs, formatted: lockoutFormatted } = useCountdown(lockoutEnd);

  // Expiry countdown
  const expiryCountdown = useCountdown(writing?.expires_at || null);

  // ── Phase 1: Fetch meta ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setErrorMsg('Invalid link.'); setPhase('error'); return; }

    const init = async () => {
      try {
        const res = await fetch(`/api/v1/public/share/${token}/meta`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErrorMsg(body.message || 'This share link has expired or been revoked.');
          setPhase('error');
          return;
        }
        const metaData: ShareMeta = await res.json();
        setMeta(metaData);
        setAttemptsLeft(Math.max(0, 5 - (metaData.failed_attempts || 0)));

        if (metaData.has_passcode) {
          setPhase('locked');
        } else {
          // Auto-fetch content for open links
          await fetchContent();
        }
      } catch {
        setErrorMsg('Network error. Failed to reach the vault.');
        setPhase('error');
      }
    };

    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/v1/public/share/${token}`);
        if (res.ok) {
          setWriting(await res.json());
          setPhase('reading');
        } else {
          const body = await res.json().catch(() => ({}));
          if (body.passcode_required) {
            setPhase('locked');
          } else {
            setErrorMsg(body.message || 'Unable to load this writing.');
            setPhase('error');
          }
        }
      } catch {
        setErrorMsg('Network error. Please try again.');
        setPhase('error');
      }
    };

    init();
  }, [token]);

  // ── Phase 2: Unlock with passcode ───────────────────────────────────────
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isUnlocking) return;
    setUnlockError('');
    setIsUnlocking(true);

    try {
      const res = await fetch(`/api/v1/public/share/${token}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const body = await res.json();

      if (res.ok) {
        setWriting(body);
        setPhase('reading');
      } else if (res.status === 429) {
        // Brute-force locked
        setMeta(prev => prev ? {
          ...prev,
          is_locked: true,
          lockout_seconds: body.lockout_seconds || 900,
          failed_attempts: 5,
        } : prev);
        setUnlockError('Too many failed attempts. Link is temporarily locked.');
        setAttemptsLeft(0);
      } else {
        const remaining = body.attempts_remaining ?? (attemptsLeft - 1);
        setAttemptsLeft(Math.max(0, remaining));
        setUnlockError(
          remaining > 0
            ? `Incorrect passcode. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Incorrect passcode. Link is now locked for 15 minutes.'
        );
        setPasscode('');
        inputRef.current?.focus();
      }
    } catch {
      setUnlockError('Network error. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── Loading ─────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-vault-gold border-t-transparent" />
          <span className="font-serif text-sm tracking-widest text-vault-400 uppercase animate-pulse">Opening vault...</span>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-vault-800 bg-vault-950 p-8 text-center shadow-2xl premium-glow animate-slide-up">
          <ShieldAlert className="mx-auto mb-4 text-vault-rose" size={36} />
          <h3 className="font-serif text-base font-bold text-zinc-200">Vault Link Sealed</h3>
          <p className="mt-2 text-xs text-vault-500 max-w-xs mx-auto">{errorMsg}</p>
          <button onClick={() => navigate('/login')} className="mt-6 rounded-xl border border-vault-800 bg-vault-900/30 px-5 py-2.5 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition">
            Go to The Vault
          </button>
        </div>
      </div>
    );
  }

  // ── Locked ──────────────────────────────────────────────────────────────
  if (phase === 'locked') {
    const isHardLocked = meta?.is_locked || attemptsLeft === 0;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-vault-800 bg-vault-950 shadow-2xl premium-glow animate-slide-up overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-vault-gold/60 via-vault-gold to-vault-gold/60" />

          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-vault-gold/30 bg-vault-900 text-vault-gold shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                <Lock size={22} />
              </div>
              <h2 className="font-serif text-xl font-bold tracking-wide text-zinc-100">Passcode Protected</h2>
              <p className="mt-1.5 text-xs text-vault-500 max-w-xs mx-auto">
                This writing is guarded. Enter the key passcode to unlock it.
              </p>
            </div>

            {/* Meta pills */}
            {meta && (
              <div className="flex flex-wrap justify-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${MODE_CONFIG[meta.share_mode]?.color || MODE_CONFIG.public.color}`}>
                  {MODE_CONFIG[meta.share_mode]?.icon}
                  {MODE_CONFIG[meta.share_mode]?.label}
                </span>
                {meta.expires_at && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-vault-800 bg-vault-900/40 px-2.5 py-1 text-[10px] font-mono text-vault-500">
                    <Clock size={10} /> {new Date(meta.expires_at).toLocaleDateString()}
                  </span>
                )}
                {meta.max_views && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-vault-800 bg-vault-900/40 px-2.5 py-1 text-[10px] font-mono text-vault-500">
                    <Eye size={10} /> {meta.views_remaining ?? '?'} views left
                  </span>
                )}
              </div>
            )}

            {/* Locked state */}
            {isHardLocked ? (
              <div className="rounded-xl border border-vault-rose/20 bg-vault-rose/5 p-4 text-center">
                <AlertTriangle size={20} className="mx-auto mb-2 text-vault-rose" />
                <p className="text-xs font-semibold text-vault-rose">Too Many Failed Attempts</p>
                {lockoutSecs > 0 ? (
                  <p className="mt-1 text-[10px] font-mono text-vault-500">
                    Try again in <span className="text-vault-rose font-bold">{lockoutFormatted}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-vault-500">Lockout period has ended. Try again.</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Enter Passcode</label>
                  <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-3 transition focus-within:border-vault-gold">
                    <KeyRound size={15} className="mr-3 shrink-0 text-vault-500" />
                    <input
                      ref={inputRef}
                      type="password"
                      placeholder="Key passcode..."
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-vault-600 outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Attempts indicator */}
                  <div className="flex items-center justify-between px-0.5">
                    {unlockError ? (
                      <p className="text-[10px] text-vault-rose font-semibold">{unlockError}</p>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`h-1 w-4 rounded-full transition ${i < attemptsLeft ? 'bg-vault-gold' : 'bg-vault-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUnlocking || !passcode.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 py-3 text-xs font-bold tracking-widest text-vault-950 uppercase shadow-lg hover:brightness-110 transition disabled:opacity-50"
                >
                  {isUnlocking
                    ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vault-950/40 border-t-vault-950" /> Unlocking...</>
                    : <><CheckCircle2 size={14} /> Unlock Writing</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Reading ─────────────────────────────────────────────────────────────
  if (!writing) return null;

  const modeConfig = MODE_CONFIG[writing.share_mode] || MODE_CONFIG.public;

  return (
    <>
      <ReadingProgress />
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] px-4 py-12 md:py-20 select-none">
        <div className="max-w-2xl mx-auto text-left space-y-10 animate-fade-in">

          {/* ── Top bar ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-vault-900 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-vault-gold/30 bg-vault-900 text-vault-gold">
                <BookOpen size={15} />
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-vault-500">Shared Writing</span>
                <p className="text-[10px] text-vault-400 font-mono mt-0.5">Read-Only · Secure Shell</p>
              </div>
            </div>

            {/* Mode + meta badges */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${modeConfig.color}`}>
                {modeConfig.icon} {modeConfig.label}
              </span>
              {writing.views_remaining !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-1 text-[10px] font-mono text-purple-400">
                  <Eye size={9} /> {writing.views_remaining} left
                </span>
              )}
              {writing.expires_at && expiryCountdown.seconds > 0 && expiryCountdown.seconds < 3600 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[10px] font-mono text-sky-400">
                  <Timer size={9} /> {expiryCountdown.formatted}
                </span>
              )}
            </div>
          </div>

          {/* ── Article ──────────────────────────────────────────────────── */}
          <article className="space-y-6">
            <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl text-zinc-100 leading-tight">
              {writing.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 border-b border-vault-900 pb-4 text-[10px] text-vault-500 font-mono">
              <span className="rounded bg-vault-900 px-1.5 py-0.5 text-[8px] tracking-wider uppercase text-vault-400">
                {writing.content_type}
              </span>
              {writing.category_name && (
                <span className="text-vault-400">{writing.category_name}</span>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={11} /><span>{formatDate(writing.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye size={11} /><span>{writing.view_count} views</span>
              </div>
            </div>

            <div
              className="font-serif text-lg leading-relaxed text-zinc-200 space-y-4"
              style={{ lineHeight: '1.9' }}
              dangerouslySetInnerHTML={{ __html: writing.content }}
            />

            {writing.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-8 border-t border-vault-900">
                {writing.tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-lg bg-vault-900 px-2 py-0.5 text-[10px] text-vault-400">
                    <TagIcon size={10} /><span>{tag}</span>
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* ── Expiry warning banner (< 1 hour) ─────────────────────────── */}
          {writing.expires_at && expiryCountdown.seconds > 0 && expiryCountdown.seconds < 3600 && (
            <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 flex items-center gap-3">
              <Timer size={16} className="text-sky-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-sky-400">This link is expiring soon</p>
                <p className="text-[10px] text-vault-500 font-mono mt-0.5">
                  Expires in <span className="text-sky-400 font-bold">{expiryCountdown.formatted}</span>
                </p>
              </div>
            </div>
          )}

          {/* ── Branded footer CTA ────────────────────────────────────────── */}
          <div className="pt-12 text-center border-t border-vault-900">
            <button onClick={() => navigate('/register')} className="inline-flex flex-col items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-vault-gold/30 bg-vault-900 group-hover:border-vault-gold/60 transition">
                <Sparkles size={16} className="text-vault-gold" />
              </div>
              <div>
                <p className="font-serif text-sm font-semibold text-vault-400 group-hover:text-vault-gold transition">
                  Protected by The Vault
                </p>
                <p className="text-[9px] tracking-wider text-vault-600 uppercase mt-0.5">
                  Create your own secure writing sanctuary
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
