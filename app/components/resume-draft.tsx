"use client";  // Add this since ReactMarkdown is a client component
import Markdown from 'react-markdown';
import 'github-markdown-css';
import { FiDownload } from 'react-icons/fi';

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

  const handleDownload = () => {
    // Create a blob with the markdown content
    const blob = new Blob([content], { type: 'text/markdown' });
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume.md';
    // Append the link to the document
    document.body.appendChild(link);
    // Trigger the download
    link.click();
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Download as Markdown"
        >
          <FiDownload size={16} />
          <span>Download</span>
        </button>
      </div>
      <div
        className="markdown-body resume-markdown pt-10"
        style={{
          fontSize: '0.85rem',
          '--markdown-spacing': '0.5em',
          backgroundColor: 'white',  // Force light background
          color: '#24292e',          // Force dark text color
        } as React.CSSProperties}
      >
        <style jsx global>{`
          .resume-markdown.markdown-body {
            background-color: white !important; /* Force light background */
            color: #24292e !important; /* Force dark text */
          }
          .resume-markdown.markdown-body a {
            color: #0366d6 !important; /* Force link color */
          }
          .resume-markdown.markdown-body p,
          .resume-markdown.markdown-body ul,
          .resume-markdown.markdown-body ol,
          .resume-markdown.markdown-body h1,
          .resume-markdown.markdown-body h2,
          .resume-markdown.markdown-body h3 {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            color: #24292e !important; /* Force dark text */
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
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
};

export default ResumeDraft;