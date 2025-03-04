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
        .resume-markdown.markdown-body p,
        .resume-markdown.markdown-body ul,
        .resume-markdown.markdown-body ol,
        .resume-markdown.markdown-body h1,
        .resume-markdown.markdown-body h2,
        .resume-markdown.markdown-body h3 {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .resume-markdown.markdown-body li + li {
          margin-top: 0.1em;
        }
        /* Ensure bullets are visible */
        .resume-markdown.markdown-body ul {
          list-style-type: disc;
          padding-left: 2em;
        }
        .resume-markdown.markdown-body ul ul {
          list-style-type: circle;
        }
        .resume-markdown.markdown-body ul ul ul {
          list-style-type: square;
        }
        /* Ensure numbered lists are visible */
        .resume-markdown.markdown-body ol {
          list-style-type: decimal;
          padding-left: 2em;
        }
      `}</style>
      
      <div
        className="markdown-body resume-markdown"
        style={{
          // existing inline styles, if any
        }}
      >
        {/* rest of the component */}
      </div>
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default ResumeDraft;