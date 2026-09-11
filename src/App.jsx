import { useState, useEffect, useCallback, useRef } from 'react';
import { loadNotes, saveNotes, createNote } from './utils/storage';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import EmptyState from './components/EmptyState';
import './App.css';

function sortNotes(notes) {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

function filterNotes(notes, query) {
  if (!query) return notes;
  const q = query.toLowerCase();
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );
}

export default function App() {
  const [notes, setNotes] = useState(() => sortNotes(loadNotes()));
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [toast, setToast] = useState(null);
  const deletedRef = useRef(null);
  const toastTimer = useRef(null);
  const searchRef = useRef(null);

  const activeNote = notes.find((n) => n.id === activeId) || null;
  const displayed = sortNotes(filterNotes(notes, search));

  // Debounced autosave
  const saveTimer = useRef(null);
  const save = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNotes(next), 400);
  }, []);

  const saveNow = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveNotes(next);
    clearTimeout(toastTimer.current);
    setToast({ message: 'Saved', canUndo: false });
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    save(notes);
  }, [notes, save]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      if (mod && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [notes]);

  function handleNewNote() {
    const note = createNote();
    setNotes((prev) => sortNotes([note, ...prev]));
    setActiveId(note.id);
    setPreviewMode(false);
  }

  function handleSelect(id) {
    setActiveId(id);
    setPreviewMode(false);
  }

  function handleUpdate(updated) {
    const patched = { ...updated, updatedAt: Date.now() };
    setNotes((prev) =>
      sortNotes(prev.map((n) => (n.id === patched.id ? patched : n)))
    );
  }

  function handleExport(note) {
    const title = note.title.trim() || 'untitled';
    const filename = `${title.replace(/[\\/:*?"<>|]/g, '-').trim() || 'untitled'}.md`;
    const markdown = note.title.trim()
      ? `# ${note.title.trim()}\n\n${note.content}`
      : note.content;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDelete(id) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    deletedRef.current = {
      note,
      index: notes.findIndex((n) => n.id === id),
      wasActive: activeId === id,
    };
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);

    clearTimeout(toastTimer.current);
    setToast({ message: 'Note deleted', canUndo: true });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      deletedRef.current = null;
    }, 5000);
  }

  function handleUndo() {
    const deleted = deletedRef.current;
    if (!deleted) return;

    setNotes((prev) => {
      if (prev.some((note) => note.id === deleted.note.id)) return prev;
      const restored = [...prev];
      restored.splice(Math.min(deleted.index, restored.length), 0, deleted.note);
      return sortNotes(restored);
    });
    if (deleted.wasActive) setActiveId(deleted.note.id);
    setToast(null);
    clearTimeout(toastTimer.current);
    deletedRef.current = null;
  }

  return (
    <div className="app">
      <Sidebar
        notes={displayed}
        activeId={activeId}
        search={search}
        onSearch={setSearch}
        onSelect={handleSelect}
        onNewNote={handleNewNote}
        onDelete={handleDelete}
      />

      <main className="main">
        {activeNote ? (
          <NoteEditor
            note={activeNote}
            onUpdate={handleUpdate}
            onSave={() => saveNow(notes)}
            onExport={() => handleExport(activeNote)}
            previewMode={previewMode}
            onTogglePreview={() => setPreviewMode((p) => !p)}
          />
        ) : (
          <EmptyState onNewNote={handleNewNote} />
        )}
      </main>

      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
          {toast.canUndo && (
            <button className="toast-undo" onClick={handleUndo}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
