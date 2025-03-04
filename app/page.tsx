"use client";
import { FileData } from "./components/file-viewer";
import { useState } from "react";
import Chat from './components/chat'
import ResumeDraft from './components/resume-draft'
import FileViewer from './components/file-viewer'
import logger from '@/lib/shared/logger';
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";

// TODO: disable create resume button if files are being uploaded

// app/page.tsx
export default function Home() {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(true);
  const [workExperienceFiles, setWorkExperienceFiles] = useState<FileData[]>([]);
  const [jobDescriptionFiles, setJobDescriptionFiles] = useState<FileData[]>([]);

  const functionCallHandler = async (call: RequiredActionFunctionToolCall) => {
    console.log('Function call received:', call);
    // If update_resume, update the resume content
    if (call.function.name === 'update_resume') {
      let args;
      try {
        args = JSON.parse(call.function.arguments);
      } catch (e) {
        console.error("Invalid JSON in function arguments:", e);
        return "Parsing error: Invalid JSON format";
      }

      setResumeContent(args.content);
      localStorage.setItem("resumeBuilder_resumeContent", args.content);
      return 'Resume updated successfully';
    }
    return 'Function call received, no action taken';
  }

  // Show chat and resume UI
  const handleCreateResume = async () => {
    setShowChat(true);
    setShowUploadArea(false);
  };

  // Return to upload area
  const returnToUpload = () => {
    setShowUploadArea(true);
    setShowChat(false);
  };

  // Clear conversation history and resume draft
  const clearConversation = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('resumeBuilder_threadId');
      localStorage.removeItem('resumeBuilder_resumeContent');
    }
    setResumeContent(null);
    window.location.reload();
  };

  // Add a function to handle file cleanup
  const handleCleanupFiles = async () => {
    if (window.confirm('This will delete ALL files from your OpenAI account used by this application. Continue?')) {
      setIsCleaningUp(true);
      try {
        setWorkExperienceFiles([]);
        setJobDescriptionFiles([]);
        await fetch('/api/assistants/files', {
          method: 'DELETE',
        });
        window.location.reload();
      } catch (error) {
        logger.error('Error during cleanup:', { error });
      } finally {
        setIsCleaningUp(false);
      }
    }
  };

  // Main UI
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Resume Rooster Logo"
              className="h-10 w-10 mr-3"
            />
            <h1 className="text-xl font-bold">Resume Rooster</h1>
          </div>
          {showUploadArea && (
            <button
              onClick={handleCleanupFiles}
              disabled={isCleaningUp}
              className="px-3 py-1 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCleaningUp ? 'Deleting files...' : 'Delete All Files'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Input Sections - Only show when not generating resume */}
        {showUploadArea && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Upload Your Information</h2>

            <div className="space-y-8">
              {/* Work Experience Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-3">Work Experience Documents</h3>
                <FileViewer
                  fileType="work-experience"
                  title="Upload Document"
                  acceptTypes=".pdf,.docx,.txt"
                  maxFiles={10}
                  onFilesChanged={(files : FileData[]) => setWorkExperienceFiles(files)}
                />
              </div>

              {/* Job Description Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-3">Job Description</h3>
                <FileViewer
                  fileType="job-description"
                  title="Upload Job Description"
                  allowTextInput={true}
                  acceptTypes=".pdf,.docx,.txt"
                  maxFiles={1}
                  onFilesChanged={(files : FileData[]) => setJobDescriptionFiles(files)}
                />
              </div>
            </div>

            {/* Create Resume Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleCreateResume}
                disabled={
                  workExperienceFiles.length === 0 ||
                  jobDescriptionFiles.length === 0
                }
                className={`px-6 py-3 rounded-lg ${
                  workExperienceFiles.length === 0 ||
                  jobDescriptionFiles.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Create Resume
              </button>
            </div>
          </div>
        )}

        {/* Chat and Resume UI */}
        {showChat && (
          <div className="flex flex-col md:flex-row gap-4 w-full h-[calc(100vh-200px)]">
            <div className="flex-1 bg-white rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <button
                    onClick={returnToUpload}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 mr-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Upload
                  </button>
                </div>
                <button
                  onClick={clearConversation}
                  className="flex items-center text-sm text-red-600 hover:text-red-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Start Fresh
                </button>
              </div>
              <div className="flex-grow overflow-hidden">
                <Chat functionCallHandler={functionCallHandler} />
              </div>
            </div>
            <div className="flex-1 bg-white rounded-lg shadow-md p-4 flex flex-col">
              <div className="flex-grow overflow-auto">
                {resumeContent ? (
                  <div className="prose max-w-none">
                    <ResumeDraft content={resumeContent} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    Chat with the AI to generate your resume
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
