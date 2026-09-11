export default function EmptyState({ onNewNote }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📝</div>
      <h2>No notes yet</h2>
      <p>Create your first note to get started.</p>
      <button className="btn-primary" onClick={onNewNote}>
        New Note
      </button>
    </div>
  );
}
