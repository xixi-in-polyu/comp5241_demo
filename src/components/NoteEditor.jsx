import MarkdownPreview from './MarkdownPreview';
import { Download, Save } from 'lucide-react';

export default function NoteEditor({
  note,
  onUpdate,
  onSave,
  onExport,
  previewMode,
  onTogglePreview,
}) {
  if (!note) return null;

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button className="toolbar-btn toolbar-save" onClick={onSave} title="Save notes">
          <Save size={15} aria-hidden="true" />
          <span>Save</span>
        </button>
        <button className="toolbar-btn toolbar-export" onClick={onExport} title="Download Markdown file">
          <Download size={15} aria-hidden="true" />
          <span>Export .md</span>
        </button>
        <button
          className={`toolbar-btn ${!previewMode ? 'active' : ''}`}
          onClick={() => previewMode && onTogglePreview()}
        >
          Edit
        </button>
        <button
          className={`toolbar-btn ${previewMode ? 'active' : ''}`}
          onClick={() => !previewMode && onTogglePreview()}
        >
          Preview
        </button>
      </div>

      <div className={`editor-panes ${previewMode ? 'preview-only' : ''}`}>
        <div className="editor-pane edit-pane">
          <input
            className="editor-title"
            type="text"
            placeholder="Note title"
            value={note.title}
            onChange={(e) => onUpdate({ ...note, title: e.target.value })}
          />
          <textarea
            className="editor-content"
            placeholder="# Start writing in Markdown…"
            value={note.content}
            onChange={(e) => onUpdate({ ...note, content: e.target.value })}
          />
        </div>
        <div className="editor-pane preview-pane">
          <h1 className="preview-title">{note.title || 'Untitled'}</h1>
          <MarkdownPreview content={note.content} />
        </div>
      </div>
    </div>
  );
}
