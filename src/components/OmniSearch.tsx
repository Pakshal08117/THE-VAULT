import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../context/VaultContext';
import { Search, X, FileText, Folder, Tag, CornerDownLeft } from 'lucide-react';
import { Writing } from '../types';

interface OmniSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OmniSearch: React.FC<OmniSearchProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { writings, categories, tags } = useVault();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    writings: Writing[];
    categories: typeof categories;
    tags: typeof tags;
  }>({ writings: [], categories: [], tags: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Ctrl+K shortcut to toggle and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults({ writings: [], categories: [], tags: [] });
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Filter writings (exclude archived by default, or include)
    const matchingWritings = writings.filter(
      (w) =>
        !w.is_archived &&
        (w.title.toLowerCase().includes(lowerQuery) ||
          w.content.toLowerCase().includes(lowerQuery))
    );

    // Filter categories
    const matchingCats = categories.filter((c) =>
      c.name.toLowerCase().includes(lowerQuery)
    );

    // Filter tags
    const matchingTags = tags.filter((t) =>
      t.name.toLowerCase().includes(lowerQuery)
    );

    setResults({
      writings: matchingWritings.slice(0, 5),
      categories: matchingCats.slice(0, 3),
      tags: matchingTags.slice(0, 3),
    });
    setSelectedIndex(0);
  }, [query, writings, categories, tags]);

  // Flattened items for keyboard navigation
  const flatItems = [
    ...results.writings.map((w) => ({ type: 'writing', id: w.id, item: w })),
    ...results.categories.map((c) => ({ type: 'category', id: c.id, item: c })),
    ...results.tags.map((t) => ({ type: 'tag', id: t.id, item: t })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      handleSelect(selected);
    }
  };

  const handleSelect = (selected: typeof flatItems[0]) => {
    onClose();
    if (selected.type === 'writing') {
      navigate(`/view/${selected.id}`);
    } else if (selected.type === 'category') {
      navigate('/categories', { state: { filterId: selected.id } });
    } else if (selected.type === 'tag') {
      navigate('/tags', { state: { filterId: selected.id } });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-vault-800 bg-vault-950 shadow-2xl premium-glow animate-slide-up"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Head */}
        <div className="relative flex items-center border-b border-vault-800 px-4 py-4">
          <Search className="mr-3 text-vault-500" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search writings, tags, or categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-vault-500 outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-vault-500 hover:bg-vault-900 hover:text-vault-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-vault-500 font-sans">
              Type something to search...
            </div>
          ) : flatItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-vault-500 font-sans">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-4">
              {/* Writings section */}
              {results.writings.length > 0 && (
                <div>
                  <h3 className="mb-2 px-2 text-[10px] font-bold tracking-wider text-vault-500 uppercase">Writings</h3>
                  <div className="space-y-1">
                    {results.writings.map((w, index) => {
                      const flatIndex = index;
                      const isSelected = selectedIndex === flatIndex;
                      return (
                        <div
                          key={w.id}
                          onClick={() => handleSelect({ type: 'writing', id: w.id, item: w })}
                          className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition ${
                            isSelected ? 'bg-vault-800 text-zinc-100' : 'hover:bg-vault-900/60 text-vault-400'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText size={16} className={isSelected ? 'text-vault-gold' : 'text-vault-500'} />
                            <div className="text-left overflow-hidden">
                              <p className="truncate text-xs font-medium">{w.title}</p>
                              <p
                                className="truncate text-[10px] text-vault-500"
                                dangerouslySetInnerHTML={{
                                  __html: w.content.replace(/<[^>]*>/g, '').substring(0, 60),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-vault-900 px-1.5 py-0.5 text-[8px] tracking-wider text-vault-400 uppercase">
                              {w.content_type}
                            </span>
                            {isSelected && <CornerDownLeft size={10} className="text-vault-gold" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categories Section */}
              {results.categories.length > 0 && (
                <div>
                  <h3 className="mb-2 px-2 text-[10px] font-bold tracking-wider text-vault-500 uppercase">Categories</h3>
                  <div className="space-y-1">
                    {results.categories.map((c, index) => {
                      const flatIndex = results.writings.length + index;
                      const isSelected = selectedIndex === flatIndex;
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelect({ type: 'category', id: c.id, item: c })}
                          className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition ${
                            isSelected ? 'bg-vault-800 text-zinc-100' : 'hover:bg-vault-900/60 text-vault-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Folder size={16} style={{ color: c.color_hex }} />
                            <span className="text-xs font-medium">{c.name}</span>
                          </div>
                          {isSelected && <CornerDownLeft size={10} className="text-vault-gold" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags Section */}
              {results.tags.length > 0 && (
                <div>
                  <h3 className="mb-2 px-2 text-[10px] font-bold tracking-wider text-vault-500 uppercase">Tags</h3>
                  <div className="space-y-1">
                    {results.tags.map((t, index) => {
                      const flatIndex = results.writings.length + results.categories.length + index;
                      const isSelected = selectedIndex === flatIndex;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelect({ type: 'tag', id: t.id, item: t })}
                          className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition ${
                            isSelected ? 'bg-vault-800 text-zinc-100' : 'hover:bg-vault-900/60 text-vault-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Tag size={16} className="text-vault-500" />
                            <span className="text-xs font-medium">#{t.name}</span>
                          </div>
                          {isSelected && <CornerDownLeft size={10} className="text-vault-gold" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-vault-800 bg-vault-900/40 px-4 py-2.5 font-mono text-[9px] text-vault-500">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-vault-800 bg-vault-950 px-1 py-0.5">↓↑</kbd> Navigate</span>
            <span><kbd className="rounded border border-vault-800 bg-vault-950 px-1 py-0.5">Enter</kbd> Select</span>
          </div>
          <span><kbd className="rounded border border-vault-800 bg-vault-950 px-1 py-0.5">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};
