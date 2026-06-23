import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Users, FileText, BarChart3, Shield, ShieldAlert,
  RefreshCw, ChevronDown, Trash2, RotateCcw, CheckCircle,
  AlertCircle, Activity, BookOpen, Lock, Settings, Search,
  Download, Database, Check, Play, AlertTriangle
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
}

interface AdminWriting {
  id: string;
  user_id: string;
  title: string;
  content_type: string;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  word_count: number;
}

interface AuditLog {
  id: string;
  admin_id: string;
  target_id: string;
  action: string;
  details: string;
  created_at: string;
}

interface BackupFile {
  filename: string;
  size_bytes: number;
  created_at: string;
}

interface DbHealth {
  db_size_bytes: number;
  integrity_status: string;
  journal_mode: string;
  page_size: number;
  page_count: number;
  row_counts: Record<string, number>;
}

interface LockedLink {
  id: string;
  access_token: string;
  writing_title: string;
  failed_attempts: number;
  locked_until: string | null;
  is_locked: boolean;
}

interface TimelineEntry {
  date: string;
  count: number;
}

interface CategoryDist {
  category: string;
  count: number;
}

interface SystemStats {
  user_signups_timeline: TimelineEntry[];
  writings_timeline: TimelineEntry[];
  category_distribution: CategoryDist[];
}

type Tab = 'stats' | 'users' | 'content' | 'audit' | 'backups' | 'health' | 'settings' | 'security';

const ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

const roleColor = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'text-vault-gold border-vault-gold/30 bg-vault-gold/10';
  if (role === 'ADMIN') return 'text-vault-emerald border-vault-emerald/30 bg-vault-emerald/10';
  return 'text-vault-400 border-vault-700 bg-vault-900/40';
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Core Data States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [writings, setWritings] = useState<AdminWriting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [lockedLinks, setLockedLinks] = useState<LockedLink[]>([]);
  const [failedLogins, setFailedLogins] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Search & Filtering States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  
  const [writingSearch, setWritingSearch] = useState('');
  const [writingTypeFilter, setWritingTypeFilter] = useState('ALL');
  const [writingDeletedFilter, setWritingDeletedFilter] = useState('ALL');

  // Bulk Operations Selection States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkUserRole, setBulkUserRole] = useState('USER');

  const [selectedWritingIds, setSelectedWritingIds] = useState<string[]>([]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const showMsg = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3000);
  };

  // Reload tab data when filters or active tab changes
  useEffect(() => {
    loadTab(tab);
  }, [tab, userSearch, userRoleFilter, writingSearch, writingTypeFilter, writingDeletedFilter]);

  const loadTab = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'stats') {
        const data = await api.get('/api/v1/admin/system-stats');
        setSystemStats(data);
      } else if (t === 'users') {
        const roleParam = userRoleFilter === 'ALL' ? '' : userRoleFilter;
        const data = await api.get('/api/v1/admin/users', { search: userSearch, role: roleParam });
        setUsers(data.users);
      } else if (t === 'content') {
        const typeParam = writingTypeFilter === 'ALL' ? '' : writingTypeFilter;
        const delParam = writingDeletedFilter === 'ALL' ? '' : (writingDeletedFilter === 'DELETED' ? 'true' : 'false');
        const data = await api.get('/api/v1/admin/writings', { search: writingSearch, content_type: typeParam, is_deleted: delParam });
        setWritings(data.writings);
      } else if (t === 'audit' && isSuperAdmin) {
        const data = await api.get('/api/v1/admin/audit-logs');
        setAuditLogs(data.audit_logs);
      } else if (t === 'backups' && isSuperAdmin) {
        const data = await api.get('/api/v1/admin/backups');
        setBackups(data.backups);
      } else if (t === 'health' && isSuperAdmin) {
        const data = await api.get('/api/v1/admin/db-health');
        setDbHealth(data);
      } else if (t === 'settings' && isSuperAdmin) {
        const data = await api.get('/api/v1/admin/settings');
        setSiteSettings(data.settings);
      } else if (t === 'security' && isSuperAdmin) {
        const data = await api.get('/api/v1/admin/security/lockouts');
        setLockedLinks(data.locked_share_links);
        setFailedLogins(data.failed_login_attempts);
      }
    } catch (e: any) {
      showMsg(e.message || 'Failed to fetch dashboard data.', false);
    } finally {
      setLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkUserRoleChange = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      await api.post('/api/v1/admin/users/bulk-role', { user_ids: selectedUserIds, role: bulkUserRole });
      showMsg(`Bulk promoted ${selectedUserIds.length} users to ${bulkUserRole}`);
      setSelectedUserIds([]);
      loadTab('users');
    } catch (e: any) {
      showMsg(e.message || 'Bulk update failed.', false);
    }
  };

  const handleBulkWritingDelete = async () => {
    if (selectedWritingIds.length === 0) return;
    try {
      await api.post('/api/v1/admin/writings/bulk-delete', { writing_ids: selectedWritingIds });
      showMsg(`Bulk soft-deleted ${selectedWritingIds.length} writings`);
      setSelectedWritingIds([]);
      loadTab('content');
    } catch (e: any) {
      showMsg(e.message || 'Bulk delete failed.', false);
    }
  };

  const handleBulkWritingRestore = async () => {
    if (selectedWritingIds.length === 0) return;
    try {
      await api.post('/api/v1/admin/writings/bulk-restore', { writing_ids: selectedWritingIds });
      showMsg(`Bulk restored ${selectedWritingIds.length} writings`);
      setSelectedWritingIds([]);
      loadTab('content');
    } catch (e: any) {
      showMsg(e.message || 'Bulk restore failed.', false);
    }
  };

  // User deletion
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this user account? All their writings and categories will be lost.')) return;
    try {
      await api.delete(`/api/v1/admin/users/${userId}`);
      showMsg('User account permanently deleted.');
      loadTab('users');
    } catch (e: any) {
      showMsg(e.message || 'Failed to delete user.', false);
    }
  };

  // Role management
  const updateRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/api/v1/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showMsg(`Role updated to ${newRole}`);
    } catch (e: any) {
      showMsg(e.message || 'Failed to update role.', false);
    }
  };

  // Soft deletion/restore
  const softDelete = async (writingId: string) => {
    try {
      await api.delete(`/api/v1/admin/writings/${writingId}`);
      setWritings(prev => prev.map(w => w.id === writingId ? { ...w, is_deleted: true, deleted_at: new Date().toISOString() } : w));
      showMsg('Writing removed successfully.');
    } catch (e: any) {
      showMsg(e.message || 'Failed to delete.', false);
    }
  };

  const restoreWriting = async (writingId: string) => {
    try {
      await api.post(`/api/v1/admin/writings/${writingId}/restore`);
      setWritings(prev => prev.map(w => w.id === writingId ? { ...w, is_deleted: false, deleted_at: null } : w));
      showMsg('Writing restored.');
    } catch (e: any) {
      showMsg(e.message || 'Failed to restore.', false);
    }
  };

  // Backup operations
  const triggerBackup = async () => {
    setLoading(true);
    try {
      const data = await api.post('/api/v1/admin/backups/create');
      showMsg(`Backup completed successfully: ${data.filename}`);
      loadTab('backups');
    } catch (e: any) {
      showMsg(e.message || 'Backup failed.', false);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = (filename: string) => {
    const accessToken = localStorage.getItem('vault_access_token');
    const url = `/api/v1/admin/backups/download/${filename}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      showMsg('Failed to download backup file.', false);
    });
  };

  const deleteBackup = async (filename: string) => {
    if (!window.confirm(`Delete backup file ${filename}?`)) return;
    try {
      await api.delete(`/api/v1/admin/backups/${filename}`);
      showMsg('Backup file deleted successfully.');
      loadTab('backups');
    } catch (e: any) {
      showMsg(e.message || 'Failed to delete backup.', false);
    }
  };

  // DB Health actions
  const triggerVacuum = async () => {
    setLoading(true);
    try {
      await api.post('/api/v1/admin/db-health/vacuum');
      showMsg('Database vacuum completed successfully.');
      loadTab('health');
    } catch (e: any) {
      showMsg(e.message || 'Vacuum failed.', false);
    } finally {
      setLoading(false);
    }
  };

  // Site Settings operations
  const updateSetting = async (key: string, value: string) => {
    try {
      await api.post('/api/v1/admin/settings', { [key]: value });
      setSiteSettings(prev => ({ ...prev, [key]: value }));
      showMsg(`Updated setting: ${key}`);
    } catch (e: any) {
      showMsg(e.message || 'Failed to update setting.', false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; restricted?: boolean }[] = [
    { id: 'stats', label: 'System Stats', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'audit', label: 'Audit Logs', icon: Activity, restricted: true },
    { id: 'backups', label: 'Backups', icon: Shield, restricted: true },
    { id: 'health', label: 'DB Health', icon: Database, restricted: true },
    { id: 'settings', label: 'Site Settings', icon: Settings, restricted: true },
    { id: 'security', label: 'Security', icon: ShieldAlert, restricted: true },
  ];

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-6xl mx-auto text-left">
      {/* Header Banner */}
      <div className="flex items-center gap-4 border-b border-vault-800 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-vault-gold/30 bg-vault-gold/10">
          <ShieldAlert size={24} className="text-vault-gold" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-100">Super Admin Control Center</h1>
          <p className="text-xs text-vault-500 font-sans">Enterprise-grade platform management suite and hardware dashboard.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${roleColor(user?.role || 'USER')}`}>
            <Lock size={10} />
            {user?.role}
          </span>
        </div>
      </div>

      {/* Toast message display */}
      {message && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm animate-slide-up ${message.ok ? 'bg-vault-emerald/10 border border-vault-emerald/30 text-vault-emerald' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {message.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Main Tab Navigation Grid */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-vault-800 bg-vault-950 p-1 sm:grid-cols-4 md:grid-cols-8">
        {tabs.map(t => {
          const Icon = t.icon;
          const isLocked = t.restricted && !isSuperAdmin;
          return (
            <button
              key={t.id}
              onClick={() => !isLocked && setTab(t.id)}
              disabled={isLocked}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-vault-800 text-zinc-100 border border-vault-700/50 shadow-md'
                  : isLocked
                  ? 'text-vault-700 cursor-not-allowed opacity-40'
                  : 'text-vault-400 hover:text-vault-200 hover:bg-vault-900/10'
              }`}
            >
              <Icon size={14} />
              <span className="truncate">{t.label}</span>
              {isLocked && <Lock size={8} className="text-vault-600" />}
            </button>
          );
        })}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-vault-gold border-t-transparent" />
        </div>
      )}

      {/* Tab Panels */}
      {!loading && (
        <div className="space-y-6">
          
          {/* 1. SYSTEM STATS TAB */}
          {tab === 'stats' && systemStats && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Users Growth Timeline */}
                <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-zinc-100">User Signups Growth</h3>
                      <p className="text-[10px] text-vault-500 font-sans mt-0.5">Chronological platform registration frequency</p>
                    </div>
                    <Users size={16} className="text-vault-gold" />
                  </div>
                  {systemStats.user_signups_timeline.length === 0 ? (
                    <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono">NO SIGNUP EVENTS RECORDED</div>
                  ) : (
                    <div className="flex items-end justify-between gap-2 h-36 pt-2">
                      {systemStats.user_signups_timeline.map((entry, idx) => {
                        const maxVal = Math.max(...systemStats.user_signups_timeline.map(d => d.count), 1);
                        const pct = (entry.count / maxVal) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-vault-950 border border-vault-800 px-2 py-0.5 rounded text-[8px] font-mono whitespace-nowrap z-10">
                              {entry.count} signups · {entry.date}
                            </div>
                            <div className="w-full rounded-t bg-vault-gold/30 hover:bg-vault-gold/60 transition-all" style={{ height: `${Math.max(6, pct)}%` }} />
                            <span className="text-[7px] text-vault-600 font-mono mt-1 rotate-45 origin-left whitespace-nowrap">{entry.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Writings Growth Timeline */}
                <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-zinc-100">Writings Contribution Growth</h3>
                      <p className="text-[10px] text-vault-500 font-sans mt-0.5">Live content creation timeline metrics</p>
                    </div>
                    <BookOpen size={16} className="text-cyan-400" />
                  </div>
                  {systemStats.writings_timeline.length === 0 ? (
                    <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono">NO WRITINGS CREATED YET</div>
                  ) : (
                    <div className="flex items-end justify-between gap-2 h-36 pt-2">
                      {systemStats.writings_timeline.map((entry, idx) => {
                        const maxVal = Math.max(...systemStats.writings_timeline.map(d => d.count), 1);
                        const pct = (entry.count / maxVal) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-vault-950 border border-vault-800 px-2 py-0.5 rounded text-[8px] font-mono whitespace-nowrap z-10">
                              {entry.count} created · {entry.date}
                            </div>
                            <div className="w-full rounded-t bg-cyan-500/20 hover:bg-cyan-500/50 transition-all" style={{ height: `${Math.max(6, pct)}%` }} />
                            <span className="text-[7px] text-vault-600 font-mono mt-1 rotate-45 origin-left whitespace-nowrap">{entry.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Category distribution popular breakdown */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                <div className="mb-4">
                  <h3 className="font-serif text-sm font-bold text-zinc-100">Global Category Popularity</h3>
                  <p className="text-[10px] text-vault-500 font-sans mt-0.5">Breakdown of writings distribution per category folder</p>
                </div>
                <div className="space-y-4">
                  {systemStats.category_distribution.map((cat, idx) => {
                    const totalW = systemStats.category_distribution.reduce((acc, c) => acc + c.count, 0) || 1;
                    const pct = Math.round((cat.count / totalW) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-zinc-300 font-bold uppercase tracking-wider">{cat.category}</span>
                          <span className="text-vault-400">{cat.count} writings ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-vault-900 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-vault-gold to-yellow-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {systemStats.category_distribution.length === 0 && (
                    <div className="text-center py-6 text-xs text-vault-500 font-mono uppercase">No category statistics found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. USER MANAGEMENT TAB */}
          {tab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              {/* Search & Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-vault-800 bg-vault-950/20 p-4">
                <div className="relative flex-1 max-w-md flex items-center rounded-xl border border-vault-800 bg-vault-900/30 px-3.5 py-2">
                  <Search size={14} className="mr-2 text-vault-500" />
                  <input
                    type="text"
                    placeholder="Search by email or display name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Filter Role:</span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="rounded-xl border border-vault-700 bg-vault-900 px-3 py-2 text-xs text-vault-300 outline-none focus:border-vault-gold cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
              </div>

              {/* Bulk operations bar */}
              {selectedUserIds.length > 0 && isSuperAdmin && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-vault-gold/20 bg-vault-gold/5 p-4 animate-slide-up">
                  <span className="text-xs font-bold text-vault-gold">{selectedUserIds.length} users selected for bulk action</span>
                  <div className="flex items-center gap-3">
                    <select
                      value={bulkUserRole}
                      onChange={(e) => setBulkUserRole(e.target.value)}
                      className="rounded-xl border border-vault-700 bg-vault-900 px-3 py-1.5 text-xs text-vault-200 outline-none"
                    >
                      <option value="USER">Make USER</option>
                      <option value="ADMIN">Make ADMIN</option>
                      <option value="SUPER_ADMIN">Make SUPER_ADMIN</option>
                    </select>
                    <button
                      onClick={handleBulkUserRoleChange}
                      className="rounded-xl bg-vault-gold px-4 py-1.5 text-xs font-bold text-vault-950 uppercase tracking-wider hover:brightness-110 transition"
                    >
                      Apply Role
                    </button>
                  </div>
                </div>
              )}

              {/* Users table */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950 overflow-hidden">
                <div className="border-b border-vault-800 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-zinc-200">Registered Accounts</h3>
                    <p className="text-xs text-vault-500">{users.length} accounts found matching query</p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        if (selectedUserIds.length === users.length) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(users.map(u => u.id));
                        }
                      }}
                      className="text-xs text-vault-400 hover:text-zinc-200 font-semibold"
                    >
                      {selectedUserIds.length === users.length ? 'Clear Selection' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-vault-900">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-vault-900/20 transition">
                      {isSuperAdmin && (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => {
                            setSelectedUserIds(prev =>
                              prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-vault-700 bg-vault-900 text-vault-gold focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      )}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vault-800 text-vault-gold font-serif font-bold text-sm">
                        {(u.display_name || u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{u.display_name || '—'}</p>
                        <p className="text-xs text-vault-500 truncate font-mono">{u.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleColor(u.role)}`}>
                        {u.role}
                      </span>
                      {isSuperAdmin && u.id !== user?.id && (
                        <div className="relative shrink-0 flex items-center gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => updateRole(u.id, e.target.value)}
                            className="appearance-none rounded-xl border border-vault-700 bg-vault-900 px-3 py-1.5 pr-7 text-xs text-vault-300 outline-none focus:border-vault-gold cursor-pointer"
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-2 text-vault-500" />
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition"
                            title="Delete User permanently"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                      <p className="shrink-0 text-[10px] text-vault-600 font-mono">{new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="px-6 py-8 text-center text-sm text-vault-500">No users found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. CONTENT MANAGEMENT TAB */}
          {tab === 'content' && (
            <div className="space-y-6 animate-fade-in">
              {/* Search & Filter Filters Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-vault-800 bg-vault-950/20 p-4">
                <div className="relative flex-1 max-w-xs flex items-center rounded-xl border border-vault-800 bg-vault-900/30 px-3.5 py-2">
                  <Search size={14} className="mr-2 text-vault-500" />
                  <input
                    type="text"
                    placeholder="Search writings by title..."
                    value={writingSearch}
                    onChange={(e) => setWritingSearch(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={writingTypeFilter}
                    onChange={(e) => setWritingTypeFilter(e.target.value)}
                    className="rounded-xl border border-vault-700 bg-vault-900 px-3 py-2 text-xs text-vault-200 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Formats</option>
                    <option value="SHAYARI">SHAYARIS</option>
                    <option value="POEM">POEMS</option>
                    <option value="QUOTE">QUOTES</option>
                    <option value="THOUGHT">THOUGHTS</option>
                    <option value="JOURNAL">JOURNALS</option>
                    <option value="NOTE">NOTES</option>
                  </select>
                  <select
                    value={writingDeletedFilter}
                    onChange={(e) => setWritingDeletedFilter(e.target.value)}
                    className="rounded-xl border border-vault-700 bg-vault-900 px-3 py-2 text-xs text-vault-200 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active only</option>
                    <option value="DELETED">Soft-deleted</option>
                  </select>
                </div>
              </div>

              {/* Bulk actions bar */}
              {selectedWritingIds.length > 0 && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-vault-gold/20 bg-vault-gold/5 p-4 animate-slide-up">
                  <span className="text-xs font-bold text-vault-gold">{selectedWritingIds.length} writings selected for bulk action</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBulkWritingDelete}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition uppercase tracking-wider"
                    >
                      Bulk Soft-Delete
                    </button>
                    <button
                      onClick={handleBulkWritingRestore}
                      className="rounded-xl border border-vault-emerald/20 bg-vault-emerald/10 px-4 py-1.5 text-xs font-bold text-vault-emerald hover:bg-vault-emerald/20 transition uppercase tracking-wider"
                    >
                      Bulk Restore
                    </button>
                  </div>
                </div>
              )}

              {/* writings table */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950 overflow-hidden">
                <div className="border-b border-vault-800 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-zinc-200">Global Content Catalog</h3>
                    <p className="text-xs text-vault-500">{writings.length} writings total across users</p>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedWritingIds.length === writings.length) {
                        setSelectedWritingIds([]);
                      } else {
                        setSelectedWritingIds(writings.map(w => w.id));
                      }
                    }}
                    className="text-xs text-vault-400 hover:text-zinc-200 font-semibold"
                  >
                    {selectedWritingIds.length === writings.length ? 'Clear Selection' : 'Select All'}
                  </button>
                </div>
                <div className="divide-y divide-vault-900">
                  {writings.map(w => (
                    <div key={w.id} className={`flex items-center gap-4 px-6 py-4 transition ${w.is_deleted ? 'opacity-50 bg-vault-950/20' : 'hover:bg-vault-900/20'}`}>
                      <input
                        type="checkbox"
                        checked={selectedWritingIds.includes(w.id)}
                        onChange={() => {
                          setSelectedWritingIds(prev =>
                            prev.includes(w.id) ? prev.filter(id => id !== w.id) : [...prev, w.id]
                          );
                        }}
                        className="h-4 w-4 rounded border-vault-700 bg-vault-900 text-vault-gold focus:ring-0 cursor-pointer animate-scale-up"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200 truncate">{w.title}</p>
                          {w.is_deleted && <span className="rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[8px] font-bold uppercase text-red-400 font-mono">Deleted</span>}
                        </div>
                        <p className="text-xs text-vault-500 font-mono">{w.content_type} · {w.word_count} words · Owner: {w.user_id}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {w.is_deleted ? (
                          <button
                            onClick={() => restoreWriting(w.id)}
                            className="flex items-center gap-1 rounded-xl border border-vault-emerald/30 bg-vault-emerald/10 px-3 py-1.5 text-xs font-bold text-vault-emerald hover:bg-vault-emerald/20 transition"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => softDelete(w.id)}
                            className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                      <p className="shrink-0 text-[10px] text-vault-600 font-mono">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {writings.length === 0 && (
                    <p className="px-6 py-8 text-center text-sm text-vault-500">No writings in the system.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. AUDIT LOGS TAB */}
          {tab === 'audit' && isSuperAdmin && (
            <div className="rounded-2xl border border-vault-800 bg-vault-950 overflow-hidden animate-fade-in">
              <div className="border-b border-vault-800 px-6 py-4">
                <h3 className="font-serif text-sm font-bold text-zinc-200">Chronological Audit Trails</h3>
                <p className="text-xs text-vault-500">Chronological, tamper-proof record of all admin actions</p>
              </div>
              <div className="divide-y divide-vault-900">
                {auditLogs.map(log => (
                  <div key={log.id} className="px-6 py-4 hover:bg-vault-900/10 transition">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-vault-gold/30 bg-vault-gold/10 px-2.5 py-0.5 font-mono text-[9px] font-bold text-vault-gold uppercase tracking-wider">
                        {log.action}
                      </span>
                      <span className="text-[9px] text-vault-600 font-mono">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-xs text-vault-300 font-sans">{log.details}</p>
                    <p className="mt-1 font-mono text-[8px] text-vault-500">Admin: {log.admin_id} · Target: {log.target_id}</p>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="px-6 py-8 text-center text-sm text-vault-500">No audit logs recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* 5. BACKUP MANAGEMENT TAB */}
          {tab === 'backups' && isSuperAdmin && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between rounded-2xl border border-vault-800 bg-vault-950/20 p-4">
                <div>
                  <h3 className="font-serif text-sm font-bold text-zinc-100">Live Database Backups</h3>
                  <p className="text-[10px] text-vault-500 font-sans mt-0.5">Manage live SQLite database copies stored securely in the local folder.</p>
                </div>
                <button
                  onClick={triggerBackup}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg hover:brightness-110 transition"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Create Backup Copy</span>
                </button>
              </div>

              {/* backups list */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950 overflow-hidden">
                <div className="border-b border-vault-800 px-6 py-4">
                  <h3 className="font-serif text-sm font-bold text-zinc-200">Database Backup Archives</h3>
                  <p className="text-xs text-vault-500">{backups.length} file(s) found in backups directory</p>
                </div>
                <div className="divide-y divide-vault-900">
                  {backups.map(b => (
                    <div key={b.filename} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-vault-900/20 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate font-mono">{b.filename}</p>
                        <p className="text-xs text-vault-500 font-mono">{(b.size_bytes / (1024 * 1024)).toFixed(2)} MB · {new Date(b.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadBackup(b.filename)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-vault-700 bg-vault-900 text-vault-300 hover:text-vault-gold transition"
                          title="Download Backup file"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => deleteBackup(b.filename)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                          title="Delete Backup file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <p className="px-6 py-8 text-center text-sm text-vault-500 font-mono uppercase">No backups exist yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. DATABASE HEALTH TAB */}
          {tab === 'health' && isSuperAdmin && dbHealth && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'DB File Size', value: `${(dbHealth.db_size_bytes / (1024 * 1024)).toFixed(2)} MB`, icon: Database, color: 'text-vault-gold' },
                  { label: 'Integrity status', value: dbHealth.integrity_status.toUpperCase(), icon: CheckCircle, color: 'text-vault-emerald' },
                  { label: 'Journaling Mode', value: dbHealth.journal_mode.toUpperCase(), icon: Shield, color: 'text-cyan-400' },
                  { label: 'DB Page Size', value: `${dbHealth.page_size} B`, icon: Settings, color: 'text-purple-400' },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-vault-800 bg-vault-950 p-5 text-left premium-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-vault-500">{item.label}</span>
                      <item.icon size={12} className={item.color} />
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Table stats & Re-claim */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-2xl border border-vault-800 bg-vault-950 p-6 premium-border">
                  <h3 className="font-serif text-sm font-bold text-zinc-100 mb-4">Table Row Distribution</h3>
                  <div className="space-y-3.5">
                    {Object.entries(dbHealth.row_counts).map(([table, count]) => {
                      const maxRows = Math.max(...Object.values(dbHealth.row_counts), 1);
                      const pct = Math.round((count / maxRows) * 100);
                      return (
                        <div key={table} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-zinc-300 font-bold uppercase tracking-wider">{table}</span>
                            <span className="text-vault-400">{count} rows</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-vault-900 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-vault-gold to-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-vault-800 bg-vault-950 p-6 flex flex-col justify-between premium-border">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-zinc-100 mb-2">Maintenance Console</h3>
                    <p className="text-[10px] text-vault-500 font-sans leading-relaxed">
                      Optimize SQLite database health by rebuilding the database file, freeing up memory buffers, and clearing deleted records cache blocks.
                    </p>
                  </div>
                  <button
                    onClick={triggerVacuum}
                    className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border border-vault-gold/40 bg-vault-gold/10 px-5 py-3 text-xs font-bold tracking-wider text-vault-gold uppercase hover:bg-vault-gold/20 transition"
                  >
                    <RefreshCw size={14} />
                    <span>Run SQLite Vacuum</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. SITE SETTINGS TAB */}
          {tab === 'settings' && isSuperAdmin && (
            <div className="rounded-2xl border border-vault-800 bg-vault-950 p-6 space-y-8 premium-border animate-fade-in">
              <div>
                <h3 className="font-serif text-sm font-bold text-zinc-100">Global Configuration Console</h3>
                <p className="text-[10px] text-vault-500 font-sans mt-0.5">Control live site accessibility settings, registration modules, and messages.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Toggles */}
                <div className="space-y-6">
                  {/* Allow Registration Toggle */}
                  <div className="flex items-center justify-between border-b border-vault-900 pb-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Open Public Registration</h4>
                      <p className="text-[10px] text-vault-500 mt-0.5">Allow new visitors to register accounts.</p>
                    </div>
                    <button
                      onClick={() => updateSetting('allow_registration', siteSettings.allow_registration === 'true' ? 'false' : 'true')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${siteSettings.allow_registration === 'true' ? 'bg-vault-gold' : 'bg-vault-900'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${siteSettings.allow_registration === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Maintenance Mode Toggle */}
                  <div className="flex items-center justify-between border-b border-vault-900 pb-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Maintenance Mode</h4>
                      <p className="text-[10px] text-vault-500 mt-0.5">Block all non-admin API requests with a lockout window.</p>
                    </div>
                    <button
                      onClick={() => updateSetting('maintenance_mode', siteSettings.maintenance_mode === 'true' ? 'false' : 'true')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${siteSettings.maintenance_mode === 'true' ? 'bg-red-500' : 'bg-vault-900'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${siteSettings.maintenance_mode === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* System notice text */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">System Broadcast Notice</label>
                  <textarea
                    rows={4}
                    value={siteSettings.system_notice || ''}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, system_notice: e.target.value }))}
                    placeholder="Enter broadcast message here..."
                    className="w-full rounded-xl border border-vault-800 bg-vault-900/50 p-4 text-xs text-zinc-200 outline-none focus:border-vault-gold"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => updateSetting('system_notice', siteSettings.system_notice)}
                      className="flex items-center gap-1.5 rounded-xl bg-vault-gold px-4 py-2 text-xs font-bold text-vault-950 uppercase hover:brightness-110 transition"
                    >
                      <Check size={12} />
                      <span>Save Notice</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. SECURITY MONITORING TAB */}
          {tab === 'security' && isSuperAdmin && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Locked Share Links */}
                <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-zinc-100">Locked Share Links</h3>
                      <p className="text-[10px] text-vault-500 font-sans mt-0.5">Brute-force protection: share links with cooldown lockouts</p>
                    </div>
                    <AlertTriangle size={16} className="text-vault-gold" />
                  </div>
                  <div className="divide-y divide-vault-900 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                    {lockedLinks.map(link => (
                      <div key={link.id} className="py-3 flex justify-between items-center text-xs">
                        <div className="min-w-0">
                          <p className="font-mono text-zinc-300 truncate">Token: {link.access_token.slice(0, 12)}...</p>
                          <p className="text-[10px] text-vault-500 truncate">Writing: {link.writing_title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="rounded bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-400 font-mono">
                            Locked · {link.failed_attempts} fails
                          </span>
                        </div>
                      </div>
                    ))}
                    {lockedLinks.length === 0 && (
                      <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">No links currently locked</div>
                    )}
                  </div>
                </div>

                {/* Failed Login Audits */}
                <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-zinc-100">Failed Authentication Events</h3>
                      <p className="text-[10px] text-vault-500 font-sans mt-0.5">Alerts tracking unauthorized account login attempts</p>
                    </div>
                    <ShieldAlert size={16} className="text-red-400" />
                  </div>
                  <div className="divide-y divide-vault-900 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                    {failedLogins.map(log => (
                      <div key={log.id} className="py-2.5 text-xs">
                        <div className="flex justify-between items-center font-mono text-[9px] text-vault-600">
                          <span>{log.action}</span>
                          <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-zinc-300 mt-1">{log.details}</p>
                      </div>
                    ))}
                    {failedLogins.length === 0 && (
                      <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">No failed logins logged</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
