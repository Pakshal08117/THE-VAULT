import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVault } from '../context/VaultContext';
import { Editor } from '../components/Editor';
import { Save, ChevronLeft, Plus, X, Tag } from 'lucide-react';
import { WritingType } from '../types';

export const EditWriting: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { writings, categories, tags, createTag, updateWriting } = useVault();

  const writing = writings.find((w) => w.id === id);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<WritingType>('NOTE');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');

  // Auto-save states
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const isDirtyRef = useRef(false);
  const stateRef = useRef({ title, content, contentType, categoryId, selectedTagIds });

  // Initialize values when writing is found
  useEffect(() => {
    if (writing) {
      setTitle(writing.title);
      setContent(writing.content);
      setContentType(writing.content_type);
      setCategoryId(writing.category_id || '');
      setSelectedTagIds(writing.tag_ids);
    }
  }, [writing]);

  // Keep refs up-to-date
  useEffect(() => {
    stateRef.current = { title, content, contentType, categoryId, selectedTagIds };
  }, [title, content, contentType, categoryId, selectedTagIds]);

  // Auto-save logic
  useEffect(() => {
    if (!id || !writing) return;

    const interval = setInterval(async () => {
      if (!isDirtyRef.current) return;

      const currentState = stateRef.current;
      setAutoSaveStatus('saving');
      isDirtyRef.current = false;

      const cleanText = currentState.content.replace(/<[^>]*>/g, '').trim();
      const wordCount = cleanText === '' ? 0 : cleanText.split(/\s+/).length;

      try {
        await updateWriting(id, {
          title: currentState.title || 'Untitled Writing',
          content: currentState.content,
          content_type: currentState.contentType,
          category_id: currentState.categoryId || undefined,
          tag_ids: currentState.selectedTagIds,
          word_count: wordCount,
        });
        setAutoSaveStatus('saved');
      } catch (e) {
        setAutoSaveStatus('idle');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, writing, updateWriting]);

  if (!writing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-left">
        <h3 className="font-serif text-lg font-bold text-zinc-300">Writing Not Found</h3>
        <p className="mt-1 text-xs text-vault-500 font-sans">The entry you are trying to edit does not exist or has been deleted.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 rounded-xl border border-vault-800 bg-vault-900/30 px-4 py-2 text-xs font-semibold text-vault-400 hover:bg-vault-900/60 hover:text-zinc-200 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleFieldChange = (field: string, val: any) => {
    isDirtyRef.current = true;
    setAutoSaveStatus('idle');
    if (field === 'title') setTitle(val);
    if (field === 'content') setContent(val);
    if (field === 'type') setContentType(val);
    if (field === 'category') setCategoryId(val);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const tag = await createTag(newTagName.trim());
      if (!selectedTagIds.includes(tag.id)) {
        const nextTags = [...selectedTagIds, tag.id];
        setSelectedTagIds(nextTags);
        isDirtyRef.current = true;
      }
      setNewTagName('');
    } catch (e) {
      // Ignored
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((tagIdVal) => tagIdVal !== tagId));
    isDirtyRef.current = true;
  };

  const handleManualSave = async () => {
    if (!id) return;
    const cleanText = content.replace(/<[^>]*>/g, '').trim();
    const wordCount = cleanText === '' ? 0 : cleanText.split(/\s+/).length;

    try {
      await updateWriting(id, {
        title: title || 'Untitled Writing',
        content,
        content_type: contentType,
        category_id: categoryId || undefined,
        tag_ids: selectedTagIds,
        word_count: wordCount,
      });
      navigate(`/view/${id}`);
    } catch (e) {
      // Ignored
    }
  };

  return (
    <div className="flex-1 space-y-6 px-4 py-8 md:px-8 max-w-5xl mx-auto text-left">
      {/* Editor Header Navigation bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/view/${id}`)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-vault-800 bg-vault-900/30 text-vault-400 hover:text-zinc-200 transition"
            title="Cancel Editing"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-serif text-lg font-bold text-zinc-100">Refine Writing</h1>
            <p className="text-[10px] text-vault-500 uppercase tracking-widest">Editing "{writing.title}"</p>
          </div>
        </div>
        <button
          onClick={handleManualSave}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg transition duration-200 hover:brightness-110"
        >
          <Save size={14} />
          <span>Save & Exit</span>
        </button>
      </div>

      {/* Editor Layout Form */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Title and TextArea canvas editor */}
        <div className="space-y-4 lg:col-span-3">
          <input
            type="text"
            placeholder="Title of your piece..."
            value={title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="w-full bg-transparent font-serif text-2xl md:text-3xl font-bold text-zinc-100 placeholder-vault-700 outline-none border-b border-transparent focus:border-vault-800 pb-2 transition"
            style={{ caretColor: '#d4af37' }}
          />

          <div className="h-[62vh]">
            <Editor
              initialValue={writing.content}
              onChange={(val) => handleFieldChange('content', val)}
              onSave={handleManualSave}
              autoSaveStatus={autoSaveStatus}
            />
          </div>
        </div>

        {/* Sidebar Meta Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-vault-800 bg-vault-900/20 p-5 space-y-5 premium-border">
            <h3 className="font-serif text-xs font-bold tracking-wide text-zinc-300">Writings Metadata</h3>

            {/* Type selector */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Writing Format</label>
              <select
                value={contentType}
                onChange={(e) => handleFieldChange('type', e.target.value as WritingType)}
                className="w-full rounded-xl border border-vault-800 bg-vault-950 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-vault-gold"
              >
                <option value="NOTE">Note</option>
                <option value="SHAYARI">Shayari</option>
                <option value="POEM">Poem</option>
                <option value="QUOTE">Quote</option>
                <option value="THOUGHT">Thought</option>
                <option value="JOURNAL">Journal</option>
              </select>
            </div>

            {/* Category selector */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Category Folder</label>
              <select
                value={categoryId}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                className="w-full rounded-xl border border-vault-800 bg-vault-950 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-vault-gold"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Selection */}
            <div className="space-y-2 text-left">
              <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Tags</label>

              {/* Tag Add input */}
              <form onSubmit={handleAddTag} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="New tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 rounded-xl border border-vault-800 bg-vault-950 px-3 py-2 text-xs text-zinc-200 placeholder-vault-600 outline-none focus:border-vault-gold"
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-vault-800 text-vault-400 hover:text-zinc-200 transition"
                  title="Add tag"
                >
                  <Plus size={14} />
                </button>
              </form>

              {/* Tag Selection pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-vault-900 border border-vault-800 px-2 py-1 text-[10px] text-zinc-300"
                    >
                      <Tag size={8} />
                      <span>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tagId)}
                        className="text-vault-500 hover:text-vault-rose transition"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Suggestions folder */}
              {tags.filter(t => !selectedTagIds.includes(t.id)).length > 0 && (
                <div className="pt-2">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-vault-500 mb-1.5">Suggestions</p>
                  <div className="flex flex-wrap gap-1">
                    {tags
                      .filter((t) => !selectedTagIds.includes(t.id))
                      .slice(0, 5)
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setSelectedTagIds([...selectedTagIds, tag.id]);
                            isDirtyRef.current = true;
                          }}
                          className="rounded bg-vault-950 border border-vault-900 px-1.5 py-0.5 text-[9px] text-vault-400 hover:border-vault-800 hover:text-zinc-200 transition"
                        >
                          +{tag.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
