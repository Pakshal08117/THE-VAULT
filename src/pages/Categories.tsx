import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { FolderHeart, Plus, Trash2, Tag, BookMarked, Folder, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export const Categories: React.FC = () => {
  const navigate = useNavigate();
  const { categories, writings, createCategory, deleteCategory } = useVault();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleCategoryExport = async () => {
    if (!selectedCatId) return;
    setIsExporting(true);
    try {
      const categoryName = categories.find((c) => c.id === selectedCatId)?.name || 'category';
      const blob = await api.get(`/api/v1/categories/${selectedCatId}/export`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `category-${categoryName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export category PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const colors = [
    '#10b981', // Emerald
    '#d4af37', // Gold
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
    '#a855f7', // Purple
    '#64748b', // Slate
    '#f97316', // Orange
    '#3b82f6', // Blue
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createCategory(newCatName.trim(), newCatColor);
      setNewCatName('');
    } catch (err) {
      // Ignored
    }
  };

  const getWritingsCount = (catId: string) => {
    return writings.filter((w) => w.category_id === catId && !w.is_archived).length;
  };

  // Filter writings for the currently selected category
  const activeWritings = selectedCatId
    ? writings.filter((w) => w.category_id === selectedCatId && !w.is_archived)
    : [];

  const handleCardClick = (id: string) => {
    navigate(`/view/${id}`);
  };

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-6xl mx-auto text-left">
      {/* Head */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl text-zinc-100">
          Categories
        </h1>
        <p className="text-xs text-vault-500 font-sans tracking-wide">
          Organize your poetry, journals, and thoughts into structural vaults.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Create and List Categories (Left/Middle 2 Columns) */}
        <div className="space-y-6 lg:col-span-2">
          {/* New Category Form */}
          <form onSubmit={handleCreate} className="rounded-2xl border border-vault-800 bg-vault-900/10 p-5 space-y-4 premium-border">
            <h3 className="font-serif text-xs font-bold text-zinc-300">Establish Category</h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Name field */}
              <div className="flex-1 space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Sonnets of Autumn"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-xl border border-vault-800 bg-vault-950 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-vault-600 outline-none focus:border-vault-gold"
                />
              </div>

              {/* Color selection pills */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Theme Color</label>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className={`h-6 w-6 rounded-full transition ${
                        newCatColor === color ? 'ring-2 ring-zinc-300 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg hover:brightness-110 transition shrink-0"
              >
                <Plus size={16} />
                <span>Create</span>
              </button>
            </div>
          </form>

          {/* Grid display of Categories */}
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((cat) => {
              const count = getWritingsCount(cat.id);
              const isSelected = selectedCatId === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(isSelected ? null : cat.id)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition duration-200 ${
                    isSelected
                      ? 'border-vault-gold bg-vault-900/30'
                      : 'border-vault-800 bg-vault-950 hover:border-vault-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-vault-900"
                        style={{ color: cat.color_hex }}
                      >
                        <Folder size={18} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-zinc-200 group-hover:text-vault-gold transition">
                          {cat.name}
                        </h4>
                        <p className="text-[10px] text-vault-500">{count} active entries</p>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteCategory(cat.id);
                        if (selectedCatId === cat.id) setSelectedCatId(null);
                      }}
                      className="rounded-lg p-1.5 text-vault-600 hover:bg-vault-900 hover:text-vault-rose transition"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Category Entries View Panel (Right Column) */}
        <div className="rounded-2xl border border-vault-800 bg-vault-950 p-5 space-y-4 premium-border">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold text-zinc-300">
              {selectedCatId
                ? `${categories.find((c) => c.id === selectedCatId)?.name} Entries`
                : 'Category Writings'}
            </h3>
            {selectedCatId && activeWritings.length > 0 && (
              <button
                onClick={handleCategoryExport}
                disabled={isExporting}
                className="flex items-center gap-1 rounded-lg border border-vault-800 bg-vault-900/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-vault-gold hover:text-zinc-200 hover:border-vault-700 transition disabled:opacity-50"
                title="Export Category Book as PDF"
              >
                {isExporting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-vault-gold border-t-transparent" />
                ) : (
                  <BookMarked size={12} />
                )}
                <span>Export PDF</span>
              </button>
            )}
          </div>

          {!selectedCatId ? (
            <div className="py-12 text-center text-xs text-vault-500 font-sans">
              Select a category on the left to inspect its active writings.
            </div>
          ) : activeWritings.length === 0 ? (
            <div className="py-12 text-center text-xs text-vault-500 font-sans">
              No active writings classified in this category folder.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeWritings.map((w) => (
                <div
                  key={w.id}
                  onClick={() => handleCardClick(w.id)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-vault-900 bg-vault-900/10 p-3 hover:border-vault-700 transition duration-200"
                >
                  <div className="text-left overflow-hidden mr-2">
                    <p className="truncate text-xs font-semibold text-zinc-200 group-hover:text-vault-gold transition">
                      {w.title}
                    </p>
                    <p className="text-[9px] text-vault-500 font-mono mt-0.5">
                      {w.word_count} words • {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-vault-900 px-1 py-0.5 text-[8px] tracking-wider uppercase text-vault-400 font-mono">
                    {w.content_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
