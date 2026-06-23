import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Quote, Type, Sparkles } from 'lucide-react';

interface EditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  autoSaveStatus: 'saved' | 'saving' | 'idle';
}

export const Editor: React.FC<EditorProps> = ({
  initialValue,
  onChange,
  onSave,
  placeholder = 'Write your soul here...',
  autoSaveStatus,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // Initialize value once
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialValue) {
      editorRef.current.innerHTML = initialValue || '<div><br></div>';
      updateCounts();
    }
  }, []);

  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const cleanText = text.trim();
    const words = cleanText === '' ? 0 : cleanText.split(/\s+/).length;
    setWordCount(words);
    setCharCount(text.length);
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const val = editorRef.current.innerHTML;
    onChange(val);
    updateCounts();
  };

  const executeCommand = (command: string, value = '') => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
    handleInput();
  };

  const updateActiveFormats = () => {
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    if (document.queryCommandState('insertUnorderedList')) formats.push('list');
    setActiveFormats(formats);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Basic hotkeys
    if (e.ctrlKey) {
      if (e.key === 'b') {
        e.preventDefault();
        executeCommand('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        executeCommand('italic');
      } else if (e.key === 'u') {
        e.preventDefault();
        executeCommand('underline');
      } else if (e.key === 's') {
        e.preventDefault();
        if (onSave) onSave();
      }
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-vault-800 bg-vault-950 overflow-hidden shadow-xl premium-border">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-vault-800 bg-vault-900/30 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className={`p-1.5 rounded-lg transition hover:bg-vault-800 ${
              activeFormats.includes('bold') ? 'text-vault-gold bg-vault-800' : 'text-vault-400'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className={`p-1.5 rounded-lg transition hover:bg-vault-800 ${
              activeFormats.includes('italic') ? 'text-vault-gold bg-vault-800' : 'text-vault-400'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className={`p-1.5 rounded-lg transition hover:bg-vault-800 ${
              activeFormats.includes('underline') ? 'text-vault-gold bg-vault-800' : 'text-vault-400'
            }`}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>

          <div className="h-4 w-px bg-vault-800 mx-1"></div>

          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-lg text-vault-400 hover:text-vault-200 hover:bg-vault-800 transition"
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-lg text-vault-400 hover:text-vault-200 hover:bg-vault-800 transition"
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-lg text-vault-400 hover:text-vault-200 hover:bg-vault-800 transition"
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>

          <div className="h-4 w-px bg-vault-800 mx-1"></div>

          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className={`p-1.5 rounded-lg transition hover:bg-vault-800 ${
              activeFormats.includes('list') ? 'text-vault-gold bg-vault-800' : 'text-vault-400'
            }`}
            title="Unordered List"
          >
            <List size={16} />
          </button>

          <button
            type="button"
            onClick={() => executeCommand('formatBlock', 'blockquote')}
            className="p-1.5 rounded-lg text-vault-400 hover:text-vault-200 hover:bg-vault-800 transition"
            title="Blockquote"
          >
            <Quote size={14} />
          </button>
        </div>

        {/* Save Status Indicators */}
        <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase">
          {autoSaveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-vault-gold">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-vault-gold"></span>
              Autosaving...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-vault-emerald">
              <Sparkles size={10} />
              Vault Synchronized
            </span>
          )}
          {autoSaveStatus === 'idle' && (
            <span className="text-vault-500">Draft</span>
          )}
        </div>
      </div>

      {/* Editor Editing Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 bg-vault-950/20">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={updateActiveFormats}
          className="editor-textarea prose prose-invert max-w-none min-h-[50vh] focus:outline-none font-serif text-base md:text-lg leading-relaxed text-zinc-200 selection:bg-vault-gold/20"
          data-placeholder={placeholder}
          style={{ caretColor: '#d4af37' }}
        />
      </div>

      {/* Editor Stats Footer */}
      <div className="flex items-center justify-between border-t border-vault-800 bg-vault-900/10 px-4 py-2 text-[10px] text-vault-500 font-mono">
        <div className="flex items-center gap-4">
          <span>Words: <strong className="text-vault-400">{wordCount}</strong></span>
          <span>Characters: <strong className="text-vault-400">{charCount}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Press <kbd className="rounded border border-vault-800 bg-vault-950 px-1 py-0.5">Ctrl+S</kbd> to save</span>
        </div>
      </div>
    </div>
  );
};
