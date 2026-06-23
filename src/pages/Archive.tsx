import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../context/VaultContext';
import { Archive, Calendar, Undo2, Trash2 } from 'lucide-react';

export const ArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const { writings, categories, updateWriting, deleteWriting } = useVault();

  // Filter archived writings
  const archivedWritings = writings.filter((w) => w.is_archived);

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await updateWriting(id, { is_archived: false });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Permanently delete this archived piece? This is irreversible.')) {
      await deleteWriting(id);
    }
  };

  const getCategoryDetails = (catId?: string) => {
    return categories.find((c) => c.id === catId);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-6xl mx-auto text-left">
      {/* Head */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl text-zinc-100">
          Archive
        </h1>
        <p className="text-xs text-vault-500 font-sans tracking-wide">
          Your archived writings, hidden away from the main library view.
        </p>
      </div>

      {archivedWritings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-vault-800 py-20 text-center">
          <Archive className="mb-4 text-vault-600" size={36} />
          <h3 className="font-serif text-lg font-bold text-zinc-300">Archive Vault Empty</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-vault-500 font-sans">
            No entries have been archived. You can clean up your main library by archiving older or finished drafts.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 rounded-xl border border-vault-800 bg-vault-900/30 px-4 py-2 text-xs font-semibold text-vault-400 hover:bg-vault-900/60 hover:text-zinc-200 transition"
          >
            Explore Dashboard
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {archivedWritings.map((writing) => {
            const cat = getCategoryDetails(writing.category_id);
            return (
              <div
                key={writing.id}
                onClick={() => navigate(`/view/${writing.id}`)}
                className="group relative flex flex-col justify-between rounded-2xl border border-vault-800 bg-vault-950 p-6 transition duration-300 hover:border-vault-700 cursor-pointer premium-border-hover animate-slide-up"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
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
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleRestore(e, writing.id)}
                        className="rounded-lg p-1 text-vault-400 hover:text-vault-gold hover:bg-vault-900 transition"
                        title="Restore to Library"
                      >
                        <Undo2 size={15} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, writing.id)}
                        className="rounded-lg p-1 text-vault-600 hover:text-vault-rose hover:bg-vault-900 transition"
                        title="Delete Permanently"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif text-base font-bold text-zinc-100 group-hover:text-vault-gold transition duration-200">
                    {writing.title}
                  </h3>
                  <div
                    className="mt-2.5 line-clamp-4 font-serif text-sm leading-relaxed text-vault-400"
                    dangerouslySetInnerHTML={{ __html: writing.content }}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-vault-900 pt-4 text-[10px] text-vault-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span>{formatDate(writing.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-vault-900 px-1.5 py-0.5 text-[8px] tracking-wider uppercase text-vault-400">
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
    </div>
  );
};
