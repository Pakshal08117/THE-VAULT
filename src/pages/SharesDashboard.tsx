import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../context/VaultContext';
import { ShareLink, ShareMode } from '../types';
import {
  Link2, Globe, Lock, Timer, Eye, Copy, Check, X,
  ExternalLink, BarChart2, Clock, AlertTriangle, Sparkles,
} from 'lucide-react';

const MODE_CONFIG: Record<ShareMode, { icon: React.ReactNode; label: string; color: string; badge: string }> = {
  public:       { icon: <Globe  size={12} />, label: 'Public',       color: 'text-vault-emerald',  badge: 'border-vault-emerald/30 bg-vault-emerald/10 text-vault-emerald' },
  passcode:     { icon: <Lock   size={12} />, label: 'Protected',    color: 'text-vault-gold',     badge: 'border-vault-gold/30 bg-vault-gold/10 text-vault-gold' },
  expiring:     { icon: <Timer  size={12} />, label: 'Expiring',     color: 'text-sky-400',        badge: 'border-sky-400/30 bg-sky-400/10 text-sky-400' },
  view_limited: { icon: <Eye    size={12} />, label: 'View-Limited', color: 'text-purple-400',     badge: 'border-purple-400/30 bg-purple-400/10 text-purple-400' },
};

type SortKey = 'recent' | 'views' | 'expiring';

export const SharesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { fetchAllShareLinks, deleteShareLink } = useVault();

  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllShareLinks();
      setLinks(data);
    } catch (err) {
      console.error('Failed to load share links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [fetchAllShareLinks]);

  const handleCopy = (token: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (link: ShareLink) => {
    await deleteShareLink(link.writing_id);
    setLinks(prev => prev.filter(l => l.id !== link.id));
  };

  const sorted = [...links].sort((a, b) => {
    if (sortBy === 'views') return b.view_count - a.view_count;
    if (sortBy === 'expiring') {
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalViews = links.reduce((sum, l) => sum + l.view_count, 0);
  const activeCount = links.filter(l => !l.is_expired && !l.is_view_exhausted).length;
  const protectedCount = links.filter(l => l.has_passcode).length;

  return (
    <div className="flex-1 px-4 py-8 md:px-8 max-w-5xl mx-auto text-left space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-vault-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-vault-gold/30 bg-vault-900 text-vault-gold">
              <Link2 size={16} />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-tight text-zinc-100">Shared Links</h1>
              <p className="text-[10px] text-vault-500 font-mono mt-0.5">Manage all your public share links</p>
            </div>
          </div>
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-1.5">
          {([
            { key: 'recent' as SortKey, label: 'Recent' },
            { key: 'views' as SortKey,  label: 'Most Viewed' },
            { key: 'expiring' as SortKey, label: 'Expiring Soon' },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition ${
                sortBy === s.key
                  ? 'border-vault-gold/40 bg-vault-gold/10 text-vault-gold'
                  : 'border-vault-800 bg-vault-900/30 text-vault-500 hover:text-vault-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-vault-800 bg-vault-900/30 p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Active Links</p>
          <p className="mt-1 font-serif text-2xl font-bold text-zinc-200">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-vault-800 bg-vault-900/30 p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Total Views</p>
          <p className="mt-1 font-serif text-2xl font-bold text-vault-gold">{totalViews}</p>
        </div>
        <div className="rounded-xl border border-vault-800 bg-vault-900/30 p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Protected</p>
          <p className="mt-1 font-serif text-2xl font-bold text-zinc-200">{protectedCount}</p>
        </div>
      </div>

      {/* ── Links Table ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-vault-gold border-t-transparent" />
            <span className="text-xs text-vault-500 font-mono uppercase tracking-wider">Loading shares...</span>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-vault-800 bg-vault-900/40 mb-4">
            <Sparkles size={24} className="text-vault-gold" />
          </div>
          <h3 className="font-serif text-base font-bold text-zinc-300">No Shared Links Yet</h3>
          <p className="mt-1.5 text-xs text-vault-500 max-w-xs">
            Open any writing and tap "Share" to create your first public link.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((link) => {
            const mode = MODE_CONFIG[link.share_mode as ShareMode] || MODE_CONFIG.public;
            const isExpired = link.is_expired;
            const isExhausted = link.is_view_exhausted;
            const isDead = isExpired || isExhausted;

            return (
              <div
                key={link.id}
                className={`group rounded-xl border p-4 transition ${
                  isDead
                    ? 'border-vault-800/50 bg-vault-900/10 opacity-60'
                    : 'border-vault-800 bg-vault-900/20 hover:border-vault-700 hover:bg-vault-900/40'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Title + mode */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`mt-0.5 shrink-0 ${mode.color}`}>{mode.icon}</div>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => navigate(`/view/${link.writing_id}`)}
                        className="text-sm font-semibold text-zinc-200 hover:text-vault-gold transition truncate block max-w-full text-left"
                      >
                        {link.writing_title || 'Untitled'}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${mode.badge}`}>
                          {mode.icon} {mode.label}
                        </span>
                        {link.has_passcode && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-vault-gold/20 bg-vault-gold/5 px-2 py-0.5 text-[9px] text-vault-gold">
                            <Lock size={8} /> Passcode
                          </span>
                        )}
                        {isDead && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-vault-rose/20 bg-vault-rose/5 px-2 py-0.5 text-[9px] text-vault-rose">
                            <AlertTriangle size={8} /> {isExpired ? 'Expired' : 'Views exhausted'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stats + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-vault-500">
                      <div className="flex items-center gap-1" title="Total views">
                        <BarChart2 size={11} /><span>{link.view_count}</span>
                      </div>
                      {link.max_views && (
                        <div className="flex items-center gap-1" title="Max views">
                          <Eye size={11} /><span>{link.views_remaining ?? 0} left</span>
                        </div>
                      )}
                      {link.expires_at && (
                        <div className="flex items-center gap-1" title={`Expires: ${new Date(link.expires_at).toLocaleString()}`}>
                          <Clock size={11} /><span>{new Date(link.expires_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(link.access_token, link.id)}
                        className="rounded-lg border border-vault-800 bg-vault-900/40 p-2 text-vault-400 hover:text-zinc-200 transition"
                        title="Copy link"
                      >
                        {copiedId === link.id ? <Check size={13} className="text-vault-emerald" /> : <Copy size={13} />}
                      </button>
                      {!isDead && (
                        <a
                          href={`/share/${link.access_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-vault-800 bg-vault-900/40 p-2 text-vault-400 hover:text-zinc-200 transition"
                          title="Preview"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => handleRevoke(link)}
                        className="rounded-lg border border-vault-rose/20 bg-vault-rose/5 p-2 text-vault-rose hover:bg-vault-rose/10 transition"
                        title="Revoke"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
