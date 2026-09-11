import ReactMarkdown from 'react-markdown';

export default function MarkdownPreview({ content }) {
  if (!content) {
    return (
      <div className="preview-placeholder">
        <p>Start typing to see a preview…</p>
      </div>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
