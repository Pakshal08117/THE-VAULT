import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { Tag as TagIcon, Plus, Trash2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Tags: React.FC = () => {
  const navigate = useNavigate();
  const { tags, writings, createTag, deleteTag } = useVault();
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName.trim());
      setNewTagName('');
    } catch (err) {
      // Ignored
    }
  };

  const getWritingsCount = (tagId: string) => {
    return writings.filter((w) => w.tag_ids.includes(tagId) && !w.is_archived).length;
  };

  const activeWritings = selectedTagId
    ? writings.filter((w) => w.tag_ids.includes(selectedTagId) && !w.is_archived)
    : [];

  const handleCardClick = (id: string) => {
    navigate(`/view/${id}`);
  };

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-6xl mx-auto text-left">
      {/* Head */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl text-zinc-100">
          Tags
        </h1>
        <p className="text-xs text-vault-500 font-sans tracking-wide">
          Filter and cross-reference your writing themes with custom tags.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Create and List Tags (Left/Middle 2 Columns) */}
        <div className="space-y-6 lg:col-span-2">
          {/* New Tag Form */}
          <form onSubmit={handleCreate} className="rounded-2xl border border-vault-800 bg-vault-900/10 p-5 space-y-4 premium-border">
            <h3 className="font-serif text-xs font-bold text-zinc-300">Register Tag</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Tag Label</label>
                <input
                  type="text"
                  placeholder="e.g., Nostalgia"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full rounded-xl border border-vault-800 bg-vault-950 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-vault-600 outline-none focus:border-vault-gold"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg hover:brightness-110 transition shrink-0 h-10"
              >
                <Plus size={16} />
                <span>Create</span>
              </button>
            </div>
          </form>

          {/* List display of tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const count = getWritingsCount(tag.id);
              const isSelected = selectedTagId === tag.id;
              return (
                <div
                  key={tag.id}
                  onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                  className={`group flex items-center gap-2 cursor-pointer rounded-xl border px-4 py-2.5 transition ${
                    isSelected
                      ? 'border-vault-gold bg-vault-900/40 text-zinc-200'
                      : 'border-vault-800 bg-vault-950 text-vault-400 hover:border-vault-700 hover:text-zinc-200'
                  }`}
                >
                  <TagIcon size={12} className="text-vault-500 group-hover:text-vault-gold" />
                  <span className="text-xs font-medium">#{tag.name}</span>
                  <span className="rounded bg-vault-900 px-1 text-[9px] text-vault-500">{count}</span>
                  
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deleteTag(tag.id);
                      if (selectedTagId === tag.id) setSelectedTagId(null);
                    }}
                    className="ml-1 rounded p-0.5 text-vault-600 hover:bg-vault-900 hover:text-vault-rose transition"
                    title="Delete Tag"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Tag Entries View Panel (Right Column) */}
        <div className="rounded-2xl border border-vault-800 bg-vault-950 p-5 space-y-4 premium-border">
          <h3 className="font-serif text-sm font-bold text-zinc-300">
            {selectedTagId
              ? `#${tags.find((t) => t.id === selectedTagId)?.name} Entries`
              : 'Tag Writings'}
          </h3>

          {!selectedTagId ? (
            <div className="py-12 text-center text-xs text-vault-500 font-sans">
              Select a tag on the left to inspect its active writings.
            </div>
          ) : activeWritings.length === 0 ? (
            <div className="py-12 text-center text-xs text-vault-500 font-sans">
              No active writings associated with this tag.
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
