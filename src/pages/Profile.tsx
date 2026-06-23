import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { User, Mail, Calendar, BookOpen, Star, FileText, CheckCircle, Edit3, Save, X, ShieldCheck } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { writings } = useVault();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeWritings = writings.filter((w) => !w.is_archived);
  const totalCount = activeWritings.length;
  const wordCount = activeWritings.reduce((sum, w) => sum + w.word_count, 0);
  const favoriteCount = activeWritings.filter((w) => w.is_favorite).length;

  const countsByType = activeWritings.reduce((acc, w) => {
    acc[w.content_type] = (acc[w.content_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const types = ['POEM', 'SHAYARI', 'QUOTE', 'THOUGHT', 'JOURNAL', 'NOTE'];

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setSaveError('Name cannot be empty.'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(displayName.trim());
      setIsEditing(false);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.username || '');
    setSaveError(null);
    setIsEditing(false);
  };

  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Administrator' : 'Author';
  const roleColor = user?.role === 'SUPER_ADMIN' ? 'text-vault-gold' : user?.role === 'ADMIN' ? 'text-vault-emerald' : 'text-vault-400';

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-4xl mx-auto text-left">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl text-zinc-100">Pen Profile</h1>
        <p className="text-xs text-vault-500 font-sans tracking-wide">Your credentials and writing performance statistics.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* User Card */}
        <div className="rounded-2xl border border-vault-800 bg-vault-950 p-6 space-y-6 premium-border">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-vault-900 border border-vault-gold/20 text-vault-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]">
              <User size={32} />
            </div>

            {isEditing ? (
              <div className="w-full space-y-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-vault-700 bg-vault-900 px-3 py-2 text-center text-sm text-zinc-100 outline-none focus:border-vault-gold"
                  placeholder="Your pen name"
                  maxLength={50}
                  autoFocus
                />
                {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-vault-gold py-2 text-xs font-bold text-vault-950 disabled:opacity-50"
                  >
                    {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-vault-950 border-t-transparent" /> : <><Save size={12} /> Save</>}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-vault-800 py-2 text-xs text-vault-400 hover:text-vault-200"
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-zinc-200">{user?.username}</h3>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded p-1 text-vault-500 hover:text-vault-gold transition"
                    title="Edit display name"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
                <p className={`text-[10px] uppercase tracking-widest mt-0.5 font-semibold ${roleColor}`}>{roleLabel}</p>
              </div>
            )}
          </div>

          <div className="border-t border-vault-900 pt-5 space-y-3.5 text-xs text-vault-400">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-vault-500" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={14} className="text-vault-500" />
              <span>Joined {formatDate(user?.created_at)}</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck size={14} className={roleColor} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${roleColor}`}>
                {roleLabel} · Secure Vault
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={14} className="text-vault-emerald" />
              <span className="text-[10px] text-vault-emerald font-semibold uppercase tracking-wider">Secure Vault Active</span>
            </div>
          </div>
        </div>

        {/* Writing Stats */}
        <div className="space-y-6 md:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-vault-800 bg-vault-900/10 p-4 text-center premium-border">
              <BookOpen size={16} className="mx-auto text-vault-gold mb-1.5" />
              <p className="text-[8px] font-bold uppercase tracking-wider text-vault-500">Composed</p>
              <p className="mt-0.5 font-serif text-xl font-bold text-zinc-200">{totalCount}</p>
            </div>
            <div className="rounded-2xl border border-vault-800 bg-vault-900/10 p-4 text-center premium-border">
              <FileText size={16} className="mx-auto text-vault-emerald mb-1.5" />
              <p className="text-[8px] font-bold uppercase tracking-wider text-vault-500">Words Crafted</p>
              <p className="mt-0.5 font-serif text-xl font-bold text-zinc-200">{wordCount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-vault-800 bg-vault-900/10 p-4 text-center premium-border">
              <Star size={16} className="mx-auto text-amber-500 mb-1.5" />
              <p className="text-[8px] font-bold uppercase tracking-wider text-vault-500">Starred</p>
              <p className="mt-0.5 font-serif text-xl font-bold text-zinc-200">{favoriteCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-vault-800 bg-vault-950 p-6 space-y-4 premium-border">
            <h4 className="font-serif text-sm font-bold text-zinc-300">Format Distribution</h4>
            <div className="space-y-3.5">
              {types.map((type) => {
                const count = countsByType[type] || 0;
                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                return (
                  <div key={type} className="space-y-1 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-vault-400">{type}</span>
                      <span className="font-mono text-vault-300">{count} ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-vault-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-vault-gold/80 to-vault-gold transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
