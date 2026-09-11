function formatTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Sidebar({
  notes,
  activeId,
  search,
  onSearch,
  onSelect,
  onNewNote,
  onDelete,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Notes</h1>
        <button className="btn-icon" onClick={onNewNote} title="New note (Cmd+N)">
          +
        </button>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search… (Cmd+K)"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <ul className="sidebar-list">
        {notes.length === 0 && search && (
          <li className="sidebar-empty">No matching notes</li>
        )}
        {notes.map((note) => {
          const displayTitle =
            note.title || note.content.split('\n')[0] || 'Untitled';
          return (
            <li
              key={note.id}
              className={`sidebar-item ${note.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(note.id)}
            >
              <div className="sidebar-item-title">{displayTitle}</div>
              <div className="sidebar-item-meta">
                <span className="sidebar-item-time">
                  {formatTime(note.updatedAt)}
                </span>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  title="Delete note"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
