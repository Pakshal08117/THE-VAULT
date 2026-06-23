import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useVault } from '../context/VaultContext';
import { api } from '../lib/api';
import { ShareMode } from '../types';
import {
  PenTool, Star, Archive, Share2, Download, Trash2, ChevronLeft,
  Calendar, Tag as TagIcon, X, Copy, Check, ShieldAlert, ExternalLink,
  Globe, Lock, Timer, Eye, BarChart2, RefreshCw, Link2,
} from 'lucide-react';

const SHARE_MODES: { value: ShareMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'public',       icon: <Globe  size={14} />, label: 'Public',        desc: 'Anyone with the link can read' },
  { value: 'passcode',     icon: <Lock   size={14} />, label: 'Passcode',      desc: 'Requires a secret passcode' },
  { value: 'expiring',     icon: <Timer  size={14} />, label: 'Expiring',      desc: 'Auto-revokes after set time' },
  { value: 'view_limited', icon: <Eye    size={14} />, label: 'View-Limited',  desc: 'Auto-revokes after N views' },
];

const MODE_COLORS: Record<ShareMode, string> = {
  public:       'text-vault-emerald border-vault-emerald/30 bg-vault-emerald/10',
  passcode:     'text-vault-gold    border-vault-gold/30    bg-vault-gold/10',
  expiring:     'text-sky-400       border-sky-400/30       bg-sky-400/10',
  view_limited: 'text-purple-400    border-purple-400/30    bg-purple-400/10',
};

export const ViewWriting: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { writings, categories, tags, updateWriting, deleteWriting, generateShareLink, deleteShareLink, getWritingShareLink } = useVault();

  const writing = writings.find((w) => w.id === id);

  const [showShareModal, setShowShareModal]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting]           = useState(false);
  const [isGenerating, setIsGenerating]         = useState(false);

  // Share form state
  const [shareMode, setShareMode]     = useState<ShareMode>('public');
  const [passcode, setPasscode]       = useState('');
  const [expiresHours, setExpiresHours] = useState(24);
  const [maxViews, setMaxViews]       = useState(10);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!writing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h3 className="font-serif text-lg font-bold text-zinc-300">Writing Not Found</h3>
        <p className="mt-1 text-xs text-vault-500 font-sans">The entry you are looking for does not exist or has been deleted.</p>
        <button onClick={() => navigate('/')} className="mt-6 rounded-xl border border-vault-800 bg-vault-900/30 px-4 py-2 text-xs font-semibold text-vault-400 hover:bg-vault-900/60 hover:text-zinc-200 transition">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const category = categories.find((c) => c.id === writing.category_id);
  const activeShareLink = getWritingShareLink(writing.id);

  const handleFavoriteToggle  = async () => { await updateWriting(writing.id, { is_favorite: !writing.is_favorite }); };
  const handleArchiveToggle   = async () => { await updateWriting(writing.id, { is_archived: !writing.is_archived }); navigate(writing.is_archived ? '/' : '/archive'); };
  const handleDelete          = async () => { await deleteWriting(writing.id); navigate('/'); };

  const handleGenerateShare = async () => {
    setIsGenerating(true);
    try {
      await generateShareLink(
        writing.id,
        (shareMode === 'passcode' && passcode.trim()) ? passcode.trim() : undefined,
        (shareMode === 'expiring' || shareMode === 'public' || shareMode === 'passcode') ? expiresHours : undefined,
        shareMode,
        shareMode === 'view_limited' ? maxViews : undefined,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeShare = async () => { await deleteShareLink(writing.id); };

  const handleCopyLink = () => {
    if (!activeShareLink) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${activeShareLink.access_token}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      const blob = await api.get(`/api/v1/writings/${writing.id}/export`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${writing.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to export PDF'); }
    finally { setIsExporting(false); }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const selectedModeInfo = SHARE_MODES.find(m => m.value === shareMode)!;

  return (
    <div className="flex-1 space-y-6 px-4 py-8 md:px-8 max-w-4xl mx-auto text-left">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-vault-800 pb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(writing.is_archived ? '/archive' : '/')} className="flex h-10 w-10 items-center justify-center rounded-xl border border-vault-800 bg-vault-900/30 text-vault-400 hover:text-zinc-200 transition" title="Back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-vault-500">Reading Mode</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {category && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color_hex }} />}
              <span className="text-xs font-semibold text-vault-400">{category?.name || 'Uncategorized'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/edit/${writing.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition" title="Edit Entry">
            <PenTool size={14} /><span className="hidden sm:inline">Edit</span>
          </Link>
          <button onClick={handleFavoriteToggle} className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 text-xs font-semibold transition ${writing.is_favorite ? 'text-amber-500' : 'text-vault-400 hover:text-zinc-200'}`} title={writing.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}>
            <Star size={14} fill={writing.is_favorite ? 'currentColor' : 'none'} /><span className="hidden sm:inline">Favorite</span>
          </button>
          <button onClick={handleArchiveToggle} className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 text-xs font-semibold transition ${writing.is_archived ? 'text-vault-gold bg-vault-900/60' : 'text-vault-400 hover:text-zinc-200'}`} title={writing.is_archived ? 'Unarchive' : 'Archive'}>
            <Archive size={14} /><span className="hidden sm:inline">{writing.is_archived ? 'Unarchive' : 'Archive'}</span>
          </button>
          <button onClick={() => setShowShareModal(true)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition relative" title="Share Publicly">
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
            {activeShareLink && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-vault-emerald" />}
          </button>
          <button onClick={handlePdfExport} disabled={isExporting} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition disabled:opacity-50" title="Export PDF">
            {isExporting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vault-400 border-t-transparent" /> : <Download size={14} />}
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-vault-rose/20 bg-vault-rose/5 px-4 text-xs font-semibold text-vault-rose hover:bg-vault-rose/10 transition" title="Delete Entry">
            <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* ── Writing Canvas ───────────────────────────────────────────────────── */}
      <article className="prose prose-invert max-w-none py-6 space-y-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl text-zinc-100 leading-tight">{writing.title}</h1>
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 border-b border-vault-900 pb-4 text-[10px] text-vault-500 font-mono">
          <span className="rounded bg-vault-900 px-1.5 py-0.5 text-[8px] tracking-wider uppercase text-vault-400">{writing.content_type}</span>
          <div className="flex items-center gap-1"><Calendar size={12} /><span>{formatDate(writing.created_at)}</span></div>
          <span>{writing.word_count} words</span>
        </div>
        <div className="font-serif text-lg leading-relaxed text-zinc-200 space-y-4 max-w-2xl" style={{ lineHeight: '1.85' }} dangerouslySetInnerHTML={{ __html: writing.content }} />
        {writing.tag_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-8 border-t border-vault-900">
            {writing.tag_ids.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span key={tagId} className="inline-flex items-center gap-1 rounded-lg bg-vault-900 px-2 py-0.5 text-[10px] text-vault-400">
                  <TagIcon size={10} /><span>{tag.name}</span>
                </span>
              );
            })}
          </div>
        )}
      </article>

      {/* ── Share Modal ──────────────────────────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-vault-800 bg-vault-950 shadow-2xl premium-glow animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-vault-800 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-vault-gold/30 bg-vault-900 text-vault-gold">
                  <Share2 size={14} />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-zinc-200">Share Writing</h3>
                  <p className="text-[9px] text-vault-500 font-mono">Secure public URL · Read-only</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="rounded-lg p-1.5 text-vault-500 hover:bg-vault-800 hover:text-vault-400 transition">
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {activeShareLink ? (
                /* ── Active Link Panel ─────────────────────────────────── */
                <div className="space-y-4">
                  {/* Status badge */}
                  <div className={`flex items-center justify-between rounded-xl border p-3.5 ${MODE_COLORS[activeShareLink.share_mode as ShareMode] || MODE_COLORS.public}`}>
                    <div className="flex items-center gap-2">
                      {SHARE_MODES.find(m => m.value === activeShareLink.share_mode)?.icon}
                      <div>
                        <p className="text-xs font-bold">{SHARE_MODES.find(m => m.value === activeShareLink.share_mode)?.label || 'Public'} Link Active</p>
                        <p className="text-[9px] opacity-70 font-mono mt-0.5">
                          {activeShareLink.share_mode === 'view_limited'
                            ? `${activeShareLink.views_remaining ?? '?'} views remaining`
                            : activeShareLink.expires_at
                              ? `Expires ${new Date(activeShareLink.expires_at).toLocaleString()}`
                              : 'No expiry set'}
                        </p>
                      </div>
                    </div>
                    {activeShareLink.has_passcode && (
                      <div className="flex items-center gap-1 rounded-lg border border-vault-gold/30 bg-vault-gold/10 px-2 py-1">
                        <Lock size={10} className="text-vault-gold" />
                        <span className="text-[9px] text-vault-gold font-semibold">Protected</span>
                      </div>
                    )}
                  </div>

                  {/* Analytics row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-vault-800 bg-vault-900/40 p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-vault-500 font-bold">Views</p>
                      <p className="mt-1 font-serif text-lg font-bold text-zinc-200">{activeShareLink.view_count}</p>
                    </div>
                    <div className="rounded-xl border border-vault-800 bg-vault-900/40 p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-vault-500 font-bold">Max</p>
                      <p className="mt-1 font-serif text-lg font-bold text-zinc-200">{activeShareLink.max_views ?? '∞'}</p>
                    </div>
                    <div className="rounded-xl border border-vault-800 bg-vault-900/40 p-3 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-vault-500 font-bold">Last View</p>
                      <p className="mt-1 text-[10px] font-mono text-vault-400">
                        {activeShareLink.last_viewed_at
                          ? new Date(activeShareLink.last_viewed_at).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Link copy row */}
                  <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/60 p-2.5">
                    <Link2 size={12} className="mr-2 shrink-0 text-vault-500" />
                    <input type="text" readOnly value={`${window.location.origin}/share/${activeShareLink.access_token}`} className="flex-1 bg-transparent font-mono text-[10px] text-vault-300 outline-none min-w-0 truncate" />
                    <button onClick={handleCopyLink} className="ml-2 shrink-0 rounded-lg bg-vault-800 px-3 py-1.5 text-[10px] font-semibold text-vault-400 hover:text-zinc-200 flex items-center gap-1 transition">
                      {copySuccess ? <><Check size={12} className="text-vault-emerald" /><span>Copied!</span></> : <><Copy size={12} /><span>Copy</span></>}
                    </button>
                  </div>

                  {/* Actions row */}
                  <div className="flex gap-2">
                    <button onClick={handleRevokeShare} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-vault-rose/20 bg-vault-rose/5 py-2.5 text-xs font-semibold text-vault-rose hover:bg-vault-rose/10 transition">
                      <X size={13} /> Revoke
                    </button>
                    <a href={`/share/${activeShareLink.access_token}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 py-2.5 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition">
                      <ExternalLink size={13} /> Preview
                    </a>
                    <Link to="/shares" onClick={() => setShowShareModal(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 py-2.5 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition">
                      <BarChart2 size={13} /> All Shares
                    </Link>
                  </div>
                </div>
              ) : (
                /* ── Create New Link Form ───────────────────────────────── */
                <div className="space-y-5">
                  {/* Mode selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Share Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SHARE_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setShareMode(mode.value)}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                            shareMode === mode.value
                              ? MODE_COLORS[mode.value]
                              : 'border-vault-800 bg-vault-900/20 text-vault-400 hover:border-vault-700 hover:bg-vault-900/40'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">{mode.icon}</span>
                          <div>
                            <p className="text-xs font-semibold">{mode.label}</p>
                            <p className="text-[9px] opacity-70 mt-0.5 leading-tight">{mode.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode-specific options */}
                  <div className="space-y-3">
                    {/* Passcode field — show when mode is passcode */}
                    {(shareMode === 'passcode') && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Passcode <span className="text-vault-rose">*</span></label>
                        <div className="relative flex items-center rounded-xl border border-vault-gold/30 bg-vault-900/40 px-3.5 py-2.5 focus-within:border-vault-gold transition">
                          <Lock size={13} className="mr-2.5 shrink-0 text-vault-gold" />
                          <input
                            type="password"
                            placeholder="Set a secret passcode..."
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-vault-600 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Expiry — show when mode is public, passcode, or expiring */}
                    {(shareMode !== 'view_limited') && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">
                          {shareMode === 'expiring' ? 'Auto-Expires After' : 'Expiration (optional)'}
                        </label>
                        <select
                          value={expiresHours}
                          onChange={(e) => setExpiresHours(Number(e.target.value))}
                          className="w-full rounded-xl border border-vault-800 bg-vault-900/40 px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-vault-700 transition"
                        >
                          <option value={1}>1 Hour</option>
                          <option value={6}>6 Hours</option>
                          <option value={12}>12 Hours</option>
                          <option value={24}>1 Day</option>
                          <option value={72}>3 Days</option>
                          <option value={168}>7 Days</option>
                          <option value={720}>30 Days</option>
                        </select>
                      </div>
                    )}

                    {/* Max views — show only for view_limited */}
                    {shareMode === 'view_limited' && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Maximum Views <span className="text-vault-rose">*</span></label>
                        <div className="flex items-center gap-2">
                          {[1, 5, 10, 25, 50, 100].map((n) => (
                            <button key={n} onClick={() => setMaxViews(n)} className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${maxViews === n ? 'border-purple-400/40 bg-purple-400/10 text-purple-400' : 'border-vault-800 bg-vault-900/30 text-vault-500 hover:border-vault-700'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-vault-500">Link auto-revokes after <span className="text-zinc-300 font-semibold">{maxViews}</span> read{maxViews !== 1 ? 's' : ''}.</p>
                      </div>
                    )}
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateShare}
                    disabled={isGenerating || (shareMode === 'passcode' && !passcode.trim())}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 py-3 text-xs font-bold tracking-widest text-vault-950 uppercase shadow-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vault-950/40 border-t-vault-950" /> Generating...</>
                    ) : (
                      <><RefreshCw size={13} /> Generate {selectedModeInfo.label} Link</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-vault-800 bg-vault-950 p-6 shadow-2xl premium-glow animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <ShieldAlert className="mb-3 text-vault-rose" size={32} />
              <h3 className="font-serif text-base font-bold text-zinc-200">Bury this writing?</h3>
              <p className="mt-2 text-xs text-vault-500 font-sans max-w-xs">
                This action is irreversible. All contents of "{writing.title}" will be permanently erased from your vault.
              </p>
              <div className="mt-6 flex w-full gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border border-vault-800 bg-vault-900/20 py-2.5 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 rounded-xl bg-vault-rose border border-vault-rose/50 py-2.5 text-xs font-semibold text-white hover:brightness-110 transition">
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
