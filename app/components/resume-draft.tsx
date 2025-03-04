"use client";  // Add this since ReactMarkdown is a client component
import Markdown from 'react-markdown';
import 'github-markdown-css';

type ResumeDraftProps = {
  content: string;
};

const ResumeDraft = ({ content }: ResumeDraftProps) => {
  if (!content) {
    return (
      <div className="text-gray-500 italic">
        Upload a job description to generate a resume draft
      </div>
    );
  }

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: '0.85rem',
        '--markdown-spacing': '0.5em',
      } as React.CSSProperties}
    >
      <style jsx global>{`
        .markdown-body p,
        .markdown-body ul,
        .markdown-body ol,
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3 {
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .markdown-body li + li {
          margin-top: 0.1em !important;
        }
        /* Ensure bullets are visible */
        .markdown-body ul {
          list-style-type: disc !important;
          padding-left: 2em !important;
        }
        .markdown-body ul ul {
          list-style-type: circle !important;
        }
        .markdown-body ul ul ul {
          list-style-type: square !important;
        }
        /* Ensure numbered lists are visible */
        .markdown-body ol {
          list-style-type: decimal !important;
          padding-left: 2em !important;
        }
      `}</style>
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default ResumeDraft;