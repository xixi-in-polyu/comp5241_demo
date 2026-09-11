const STORAGE_KEY = 'notes-app-data';

export function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createNote() {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
