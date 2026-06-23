import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Star,
  Plus,
  Search,
  BookMarked,
  Tags,
  FileText,
  Calendar,
  PenTool,
  Clock,
  Archive,
  BarChart3,
  Eye,
  TrendingUp,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Writing, WritingType } from '../types';
import { api } from '../lib/api';


export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { writings, categories, tags, updateWriting } = useVault();
  const [selectedType, setSelectedType] = useState<WritingType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('The Vault Collection');
  const [isExporting, setIsExporting] = useState(false);

  // Analytics State
  interface AnalyticsData {
    summary: {
      total_writings: number;
      total_favorites: number;
      total_words: number;
      total_archived: number;
      total_deleted: number;
      total_categories: number;
      total_tags: number;
      total_users: number;
      type_breakdown: { type: string; count: number }[];
    } | null;
    dailyActivity: { date: string; count: number }[];
    monthlyActivity: { month: string; count: number }[];
    topTags: { name: string; count: number }[];
    mostViewed: { id: string; title: string; content_type: string; views: number }[];
  }

  const [activeTab, setActiveTab] = useState<'LIBRARY' | 'ANALYTICS'>('LIBRARY');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    summary: null,
    dailyActivity: [],
    monthlyActivity: [],
    topTags: [],
    mostViewed: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [summary, daily, monthly, tagsData, viewed] = await Promise.all([
        api.get('/api/v1/analytics/summary'),
        api.get('/api/v1/analytics/activity/daily'),
        api.get('/api/v1/analytics/activity/monthly'),
        api.get('/api/v1/analytics/tags/top'),
        api.get('/api/v1/analytics/writings/most-viewed'),
      ]);
      setAnalytics({
        summary,
        dailyActivity: daily.daily_activity || [],
        monthlyActivity: monthly.monthly_activity || [],
        topTags: tagsData.top_tags || [],
        mostViewed: viewed.most_viewed_writings || [],
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSummaryOnly = async () => {
      try {
        const summary = await api.get('/api/v1/analytics/summary');
        setAnalytics(prev => ({ ...prev, summary }));
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      }
    };
    fetchSummaryOnly();
  }, [user, writings, categories, tags]);

  const handleCollectionExport = async () => {
    setIsExporting(true);
    try {
      const blob = await api.post('/api/v1/writings/export-collection', {
        title: collectionTitle.trim(),
        writing_ids: selectedIds,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${collectionTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Cleanup states
      setShowExportModal(false);
      setIsSelectMode(false);
      setSelectedIds([]);
      setCollectionTitle('The Vault Collection');
    } catch {
      alert('Failed to export collection PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter writings: exclude archived
  const activeWritings = writings.filter((w) => !w.is_archived);

  // Stats calculation
  const totalCount = analytics.summary?.total_writings ?? activeWritings.length;
  const favoritesCount = analytics.summary?.total_favorites ?? activeWritings.filter((w) => w.is_favorite).length;
  const totalWords = analytics.summary?.total_words ?? activeWritings.reduce((acc, w) => acc + w.word_count, 0);
  const categoriesCount = analytics.summary?.total_categories ?? categories.length;


  // Filter by writing type & search query
  const filteredWritings = activeWritings.filter((w) => {
    const matchesType = selectedType === 'ALL' || w.content_type === selectedType;
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleFavoriteToggle = async (e: React.MouseEvent, id: string, currentVal: boolean) => {
    e.stopPropagation(); // Prevent card click navigation
    await updateWriting(id, { is_favorite: !currentVal });
  };

  const getCategoryDetails = (catId?: string) => {
    return categories.find((c) => c.id === catId);
  };

  const getTagDetails = (tagId: string) => {
    return tags.find((t) => t.id === tagId);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const writingTypes: { value: WritingType | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Writings' },
    { value: 'SHAYARI', label: 'Shayaris' },
    { value: 'POEM', label: 'Poems' },
    { value: 'QUOTE', label: 'Quotes' },
    { value: 'THOUGHT', label: 'Thoughts' },
    { value: 'JOURNAL', label: 'Journals' },
    { value: 'NOTE', label: 'Notes' },
  ];

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-6xl mx-auto text-left">
      {/* Welcome Hero header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl text-zinc-100">
            Welcome to Your Vault, {user?.username}
          </h1>
          <p className="text-xs text-vault-500 font-sans tracking-wide">
            Your private literary sanctuary. Write down your soul.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedIds([]);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition ${
              isSelectMode
                ? 'border-vault-rose bg-vault-rose/10 text-vault-rose'
                : 'border-vault-800 bg-vault-900/30 text-vault-400 hover:border-vault-700 hover:text-zinc-200'
            }`}
          >
            <span>{isSelectMode ? 'Exit Select' : 'Select'}</span>
          </button>
          <button
            onClick={() => navigate('/create')}
            disabled={isSelectMode}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg transition duration-200 hover:brightness-110 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>New Writing</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-vault-800 pb-px">
        <button
          onClick={() => setActiveTab('LIBRARY')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition duration-200 ${
            activeTab === 'LIBRARY'
              ? 'border-vault-gold text-zinc-100 font-semibold'
              : 'border-transparent text-vault-500 hover:text-zinc-300 font-medium'
          }`}
        >
          My Library
        </button>
        <button
          onClick={() => {
            setActiveTab('ANALYTICS');
            fetchAnalytics();
          }}
          className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition duration-200 ${
            activeTab === 'ANALYTICS'
              ? 'border-vault-gold text-zinc-100 font-semibold'
              : 'border-transparent text-vault-500 hover:text-zinc-300 font-medium'
          }`}
        >
          Live Analytics
        </button>
      </div>

      {activeTab === 'LIBRARY' ? (
        <>
          {/* Analytics Stats Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Total Entries', value: totalCount, icon: BookMarked, color: 'text-vault-gold' },
              { label: 'Starred Favorites', value: favoritesCount, icon: Star, color: 'text-amber-500' },
              { label: 'Words Crafted', value: totalWords, icon: PenTool, color: 'text-vault-emerald' },
              { label: 'Categories', value: categoriesCount, icon: Tags, color: 'text-cyan-500' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-vault-800 bg-vault-900/20 p-5 premium-border"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-vault-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-serif font-bold text-zinc-100">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl bg-vault-900/60 p-2.5 ${stat.color}`}>
                    <Icon size={18} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Filter Section */}
          <div className="flex flex-col gap-4 border-b border-vault-800 pb-4 md:flex-row md:items-center md:justify-between">
            {/* Horizontal filter chips */}
            <div className="flex flex-wrap gap-1.5 no-scrollbar overflow-x-auto pb-1 md:pb-0">
              {writingTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`rounded-xl px-4 py-2 text-xs font-medium transition duration-200 ${
                    selectedType === type.value
                      ? 'bg-vault-800 text-zinc-100 border border-vault-700'
                      : 'text-vault-400 hover:bg-vault-900/50 hover:text-zinc-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Inline Search filter */}
            <div className="relative flex items-center rounded-xl border border-vault-800 bg-vault-900/30 px-3.5 py-2 md:w-64">
              <Search size={14} className="mr-2 text-vault-500" />
              <input
                type="text"
                placeholder="Search active writings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-100 placeholder-vault-600 outline-none"
              />
            </div>
          </div>

          {/* Writings Card Grid */}
          {filteredWritings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-vault-800 py-16 text-center">
              <BookOpen className="mb-4 text-vault-500" size={36} />
              <h3 className="font-serif text-lg font-bold text-zinc-300">The Vault is Silent</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-vault-500 font-sans">
                {searchQuery
                  ? 'No writings matched your filters. Clear your search or type query to begin.'
                  : 'Write your thoughts, poems, quotes, or notes. Capture your mind before it drifts.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/create')}
                  className="mt-6 flex items-center justify-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 py-2 text-xs font-semibold text-vault-400 hover:bg-vault-900/60 hover:text-zinc-200 transition"
                >
                  <Plus size={14} />
                  <span>Compose First Writing</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredWritings.map((writing) => {
                const cat = getCategoryDetails(writing.category_id);
                const isSelected = selectedIds.includes(writing.id);
                return (
                  <div
                    key={writing.id}
                    onClick={() => {
                      if (isSelectMode) {
                        setSelectedIds((prev) =>
                          prev.includes(writing.id) ? prev.filter((id) => id !== writing.id) : [...prev, writing.id]
                        );
                      } else {
                        navigate(`/view/${writing.id}`);
                      }
                    }}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-6 transition duration-300 cursor-pointer premium-border-hover animate-slide-up ${
                      isSelectMode
                        ? isSelected
                          ? 'border-vault-gold bg-vault-gold/5'
                          : 'border-vault-800 bg-vault-950/40 hover:border-vault-700'
                        : 'border-vault-800 bg-vault-950 hover:border-vault-700'
                    }`}
                  >
                    <div>
                      {/* Category marker and favorite star */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isSelectMode && (
                            <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center mr-1 transition duration-150 ${
                              isSelected
                                ? 'border-vault-gold bg-vault-gold text-vault-950'
                                : 'border-vault-700 bg-vault-950'
                            }`}>
                              {isSelected && <span className="text-[10px] font-bold font-sans">✓</span>}
                            </div>
                          )}
                          {cat && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color_hex }}
                            ></span>
                          )}
                          <span className="text-[10px] font-bold tracking-wider text-vault-500 uppercase">
                            {cat?.name || 'Uncategorized'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleFavoriteToggle(e, writing.id, writing.is_favorite)}
                          className={`rounded-lg p-1 transition ${
                            writing.is_favorite
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-vault-600 hover:text-vault-400'
                          }`}
                          title={writing.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}
                        >
                          <Star size={16} fill={writing.is_favorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Title and HTML snippet */}
                      <h3 className="font-serif text-base font-bold text-zinc-100 group-hover:text-vault-gold transition duration-200">
                        {writing.title}
                      </h3>
                      <div
                        className="mt-2.5 line-clamp-4 font-serif text-sm leading-relaxed text-vault-400"
                        dangerouslySetInnerHTML={{ __html: writing.content }}
                      />
                    </div>

                    {/* Footer metadata info */}
                    <div className="mt-6 flex items-center justify-between border-t border-vault-900 pt-4 text-[10px] text-vault-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{formatDate(writing.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-vault-900 px-1.5 py-0.5 text-[8px] tracking-wider uppercase">
                          {writing.content_type}
                        </span>
                        <span>{writing.word_count} words</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Selection Action Bar */}
          {isSelectMode && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 rounded-2xl border border-vault-800 bg-vault-950/80 backdrop-blur-md px-6 py-4 shadow-2xl animate-slide-up w-[90%] max-w-2xl">
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Selection</p>
                <p className="text-xs font-bold text-zinc-200">
                  {selectedIds.length} of {filteredWritings.length} items selected
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (selectedIds.length === filteredWritings.length) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(filteredWritings.map((w) => w.id));
                    }
                  }}
                  className="rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition"
                >
                  {selectedIds.length === filteredWritings.length ? 'Select None' : 'Select All'}
                </button>
                <button
                  onClick={() => {
                    if (selectedIds.length > 0) {
                      setShowExportModal(true);
                    }
                  }}
                  disabled={selectedIds.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={14} />
                  <span>Export Collection</span>
                </button>
              </div>
            </div>
          )}

          {/* Export Collection Modal */}
          {showExportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-2xl border border-vault-800 bg-vault-950 p-6 space-y-6 shadow-2xl text-left animate-scale-up">
                <div>
                  <h3 className="font-serif text-lg font-bold text-zinc-100">Export Custom Collection</h3>
                  <p className="text-[11px] text-vault-500 mt-1 font-sans">
                    Compile {selectedIds.length} selected writings into a formatted PDF book.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-vault-500">Collection Title</label>
                  <input
                    type="text"
                    value={collectionTitle}
                    onChange={(e) => setCollectionTitle(e.target.value)}
                    placeholder="e.g. My Anthology"
                    className="w-full rounded-xl border border-vault-800 bg-vault-900/50 px-4 py-3 text-xs text-zinc-200 outline-none focus:border-vault-gold"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setCollectionTitle('The Vault Collection');
                    }}
                    disabled={isExporting}
                    className="rounded-xl border border-vault-800 bg-vault-900/30 px-4 py-2.5 text-xs font-bold text-vault-400 hover:text-zinc-200 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCollectionExport}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase hover:brightness-110 transition disabled:opacity-50"
                  >
                    {isExporting ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vault-950 border-t-transparent" />
                    ) : (
                      <span>Export</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Analytics View */
        analyticsLoading && !analytics.summary ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-vault-gold border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in text-left">
            {/* Live Stats Overview */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              {[
                { label: 'Writings', value: analytics.summary?.total_writings ?? 0, icon: BookMarked, color: 'text-vault-gold' },
                { label: 'Favorites', value: analytics.summary?.total_favorites ?? 0, icon: Star, color: 'text-amber-500' },
                { label: 'Words Crafted', value: analytics.summary?.total_words ?? 0, icon: PenTool, color: 'text-vault-emerald' },
                { label: 'Categories', value: analytics.summary?.total_categories ?? 0, icon: Tags, color: 'text-cyan-500' },
                { label: 'Total Tags', value: analytics.summary?.total_tags ?? 0, icon: FileText, color: 'text-blue-400' },
                { label: 'Platform Users', value: analytics.summary?.total_users ?? 0, icon: Users, color: 'text-purple-400' },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-2xl border border-vault-800 bg-vault-900/20 p-5 premium-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-vault-500">{stat.label}</span>
                      <Icon size={14} className={stat.color} />
                    </div>
                    <p className="text-xl font-serif font-bold text-zinc-100">{stat.value.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>

            {/* Timelines row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Daily contribution chart */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-zinc-100">Daily Writing Activity</h3>
                    <p className="text-[10px] text-vault-500 font-sans mt-0.5">Entries created per day (last 30 days)</p>
                  </div>
                  <TrendingUp size={16} className="text-vault-gold" />
                </div>
                {analytics.dailyActivity.length === 0 ? (
                  <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">
                    No activity recorded in the past 30 days
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar pb-2 pt-2">
                    <div className="flex items-end justify-between gap-1.5 min-w-[500px] h-36">
                      {analytics.dailyActivity.map((item, idx) => {
                        const maxDailyCount = Math.max(...analytics.dailyActivity.map(d => d.count), 1);
                        const heightPct = (item.count / maxDailyCount) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none bg-vault-950 border border-vault-800 rounded-lg px-2.5 py-1 text-[9px] text-zinc-200 z-10 whitespace-nowrap font-mono shadow-xl">
                              {item.count} entries · {formatDate(item.date)}
                            </div>
                            {/* Bar */}
                            <div 
                              className="w-full rounded-t bg-gradient-to-t from-vault-gold/20 to-vault-gold transition-all duration-300 hover:from-vault-gold/40 hover:to-vault-gold"
                              style={{ height: `${Math.max(4, heightPct)}%` }}
                            />
                            {/* Label */}
                            <span className="text-[8px] text-vault-500 font-mono mt-1.5 uppercase">
                              {item.date.slice(5).replace('-', '/')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly contribution trend */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-zinc-100">Monthly Contribution Trend</h3>
                    <p className="text-[10px] text-vault-500 font-sans mt-0.5">Entries created per month (last 12 months)</p>
                  </div>
                  <BarChart3 size={16} className="text-cyan-400" />
                </div>
                {analytics.monthlyActivity.length === 0 ? (
                  <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">
                    No activity recorded in the past 12 months
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-3.5 h-36 pt-2">
                    {analytics.monthlyActivity.map((item, idx) => {
                      const maxMonthlyCount = Math.max(...analytics.monthlyActivity.map(m => m.count), 1);
                      const heightPct = (item.count / maxMonthlyCount) * 100;
                      const [year, month] = item.month.split('-');
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const monthLabel = monthNames[parseInt(month, 10) - 1] || month;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          <div className="absolute bottom-full mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none bg-vault-950 border border-vault-800 rounded-lg px-2.5 py-1 text-[9px] text-zinc-200 z-10 whitespace-nowrap font-mono shadow-xl">
                            {item.count} entries · {monthLabel} {year}
                          </div>
                          <div 
                            className="w-full rounded-t bg-gradient-to-t from-cyan-500/20 to-cyan-400 transition-all duration-300 hover:from-cyan-500/45 hover:to-cyan-400"
                            style={{ height: `${Math.max(4, heightPct)}%` }}
                          />
                          <span className="text-[9px] text-vault-500 font-mono mt-1.5">
                            {monthLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Breakdowns */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Type breakdown */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                <div className="mb-4">
                  <h3 className="font-serif text-sm font-bold text-zinc-100">Content Type Breakdown</h3>
                  <p className="text-[10px] text-vault-500 font-sans mt-0.5">Distribution across writing formats</p>
                </div>
                <div className="space-y-4">
                  {analytics.summary && analytics.summary.type_breakdown.length > 0 ? (
                    analytics.summary.type_breakdown.map((row, idx) => {
                      const totalW = analytics.summary?.total_writings || 1;
                      const pct = Math.round((row.count / totalW) * 100);
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-zinc-300 font-bold uppercase tracking-wider">{row.type}</span>
                            <span className="text-vault-400">{row.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-vault-900 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-vault-gold to-amber-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Top Tags */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                <div className="mb-4">
                  <h3 className="font-serif text-sm font-bold text-zinc-100">Most Used Tags</h3>
                  <p className="text-[10px] text-vault-500 font-sans mt-0.5">Your most recurring topics</p>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {analytics.topTags.map((tag, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-vault-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-vault-600 font-bold"># {idx + 1}</span>
                        <span className="rounded-lg bg-vault-900/60 px-2 py-0.5 font-mono text-[11px] text-vault-300 border border-vault-800">
                          {tag.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-zinc-400">{tag.count} usages</span>
                    </div>
                  ))}
                  {analytics.topTags.length === 0 && (
                    <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">
                      No tags used yet
                    </div>
                  )}
                </div>
              </div>

              {/* Most Viewed Writings */}
              <div className="rounded-2xl border border-vault-800 bg-vault-950/40 p-6 premium-border">
                <div className="mb-4">
                  <h3 className="font-serif text-sm font-bold text-zinc-100">Most Viewed Writings</h3>
                  <p className="text-[10px] text-vault-500 font-sans mt-0.5">Writings with active shared views</p>
                </div>
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {analytics.mostViewed.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 border-b border-vault-900 pb-2.5">
                      <div className="flex-1 min-w-0">
                        <p 
                          onClick={() => navigate(`/view/${w.id}`)}
                          className="text-xs font-bold text-zinc-200 truncate hover:text-vault-gold transition cursor-pointer"
                        >
                          {w.title}
                        </p>
                        <span className="rounded bg-vault-900 px-1 py-0.5 text-[8px] tracking-wider uppercase text-vault-500 font-mono">
                          {w.content_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-vault-400 font-mono text-[11px]">
                        <Eye size={11} className="text-vault-gold" />
                        <span>{w.views}</span>
                      </div>
                    </div>
                  ))}
                  {analytics.mostViewed.length === 0 && (
                    <div className="flex h-36 items-center justify-center text-xs text-vault-600 font-mono uppercase tracking-wider">
                      No views recorded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Refresh Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={fetchAnalytics}
                disabled={analyticsLoading}
                className="flex items-center gap-1.5 rounded-xl border border-vault-800 bg-vault-900/30 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-vault-400 hover:text-zinc-200 transition disabled:opacity-50"
              >
                <RefreshCw size={12} className={analyticsLoading ? 'animate-spin' : ''} />
                <span>{analyticsLoading ? 'Refreshing...' : 'Refresh Analytics'}</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );

};
