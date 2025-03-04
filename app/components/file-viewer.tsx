import React, { useState, useEffect, useCallback } from "react";
import styles from "./file-viewer.module.css";

// TODO: filename prefixes are pretty sketchy, is there a better way to keep track of different types of files? Separate db independent of OpenAI?

// TODO: the uploading status is super weird, next to an enabled upload document button.

export type FileData = {
  fileId: string;
  filename: string;
  status?: string;
  fileType?: string;
  displayName?: string;
  createdAt?: number;
}

type InputMethod = 'text' | 'file';

type FileViewerProps = {
  fileType: string;
  title?: string;
  acceptTypes?: string;
  allowTextInput?: boolean;
  onFilesChanged?: (files: FileData[]) => void;
  refetchTrigger?: number | null;
  maxFiles?: number;
}

const FileViewer = ({
  fileType,
  title = "Upload Document",
  acceptTypes = ".pdf,.docx,.txt",
  allowTextInput = false,
  onFilesChanged,
  refetchTrigger,
  maxFiles = 1
}: FileViewerProps) => {
  const instanceId = React.useId();
  const fileInputId = `file-upload-${instanceId}`; // Use instanceId instead of fileType

  const [files, setFiles] = useState<FileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>('file');
  const [textInput, setTextInput] = useState('');
  const [hasNotifiedParent, setHasNotifiedParent] = useState(false);
  const [isFetchingFiles, setIsFetchingFiles] = useState(true);


  // Notify parent component when files change
  useEffect(() => {
    if (onFilesChanged && !hasNotifiedParent && files.length > 0) {
      onFilesChanged(files);
      setHasNotifiedParent(true);
    }
  }, [files, onFilesChanged, hasNotifiedParent]);

  const fetchFiles = useCallback(async () => {
    try {
      setIsFetchingFiles(true);
      const resp = await fetch(`/api/assistants/files?fileType=${fileType}`, {
        method: "GET",
      });
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      const data = await resp.json();
      const filteredFiles = data.filter((file: FileData) => file.fileType === fileType);

      setFiles(filteredFiles);
      setHasNotifiedParent(false); // Reset notification flag when files change from fetch

      return filteredFiles;
    } catch (error) {
      console.error('Failed to fetch files:', { instanceId, fileType, error });
      setUploadError('Failed to load files');
      return [];
    } finally {
      setIsFetchingFiles(false);
    }
  }, [fileType, instanceId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Refetch files when refetchTrigger changes
  useEffect(() => {
    if (refetchTrigger !== undefined && refetchTrigger !== null) {
      fetchFiles();
    }
  }, [refetchTrigger, fetchFiles]);

  const handleFileDelete = async (fileId: string) => {
    try {
      setIsDeletingId(fileId);

      // Find the file to delete for optimistic UI update
      const fileToDelete = files.find(file => file.fileId === fileId);
      if (!fileToDelete) return;

      // Remove the file from the list immediately for better UX
      const updatedFiles = files.filter(file => file.fileId !== fileId);
      setFiles(updatedFiles);
      setHasNotifiedParent(false); // Reset notification flag when files change

      // Perform the actual deletion
      const response = await fetch(`/api/assistants/files`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        console.error('Error deleting file from server:', fileId);
        // If deletion fails, add the file back to the list
        setFiles(prev => [...prev, fileToDelete]);
        setHasNotifiedParent(false); // Reset notification flag when files change
        throw new Error('Failed to delete file');
      }

      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      setUploadError('Failed to delete file');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    setUploadError(null);

    try {
      setIsUploading(true);

      // Get the new files to upload
      const newFiles = Array.from(event.target.files);

      // Check if adding new files would exceed maxFiles
      if (files.length + newFiles.length > maxFiles) {
        // Delete oldest files if needed to make room for new ones
        const filesToDelete = files.slice(0, (files.length + newFiles.length) - maxFiles);

        if (filesToDelete.length > 0) {
          await Promise.all(filesToDelete.map(f => handleFileDelete(f.fileId)));
        }
      }

      // Limit the number of files we'll actually upload based on available slots
      const remainingSlots = maxFiles - files.length;
      const filesToUpload = newFiles.slice(0, remainingSlots);

      for (const file of filesToUpload) {
        const data = new FormData();
        data.append("file", file);
        data.append("fileType", fileType);

        const response = await fetch("/api/assistants/files", {
          method: "POST",
          body: data,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }
      }

      await fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setUploadError(null);

    try {
      setIsUploading(true);

      // Check if adding a new file would exceed maxFiles
      if (files.length >= maxFiles) {
        // Delete oldest file to make room
        const fileToDelete = files[0];
        await handleFileDelete(fileToDelete.fileId);
      }

      const response = await fetch('/api/assistants/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textInput,
          fileType: fileType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit text');
      }

      setTextInput(''); // Clear the input after successful submission
      await fetchFiles();
    } catch (error) {
      console.error('Error submitting text:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to submit text');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.fileViewer}>
      {/* Files List */}
      <div
        className={`${styles.filesList} ${
          files.length !== 0 ? styles.grow : ""
        }`}
      >
        {isFetchingFiles ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : files.length === 0 ? (
          <p className="text-gray-500 py-2">No {fileType.replace('-', ' ')} documents uploaded yet</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.fileId} className="py-3 flex justify-between items-center">
                <span className={styles.fileName}>{file.displayName || file.filename}</span>
                <button
                  onClick={() => handleFileDelete(file.fileId)}
                  disabled={isDeletingId === file.fileId}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  {isDeletingId === file.fileId ? "..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Input Method Selection (only show if allowTextInput is true and no files exist and not loading) */}
      {allowTextInput && files.length === 0 && !isFetchingFiles && (
        <div className="flex space-x-4 mb-2">
          <button
            className={`px-3 py-1 text-sm rounded-full ${
              inputMethod === 'text'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setInputMethod('text')}
          >
            Paste Text
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full ${
              inputMethod === 'file'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setInputMethod('file')}
          >
            Upload File
          </button>
        </div>
      )}

      {/* Text Input (only show if not loading) */}
      {allowTextInput && inputMethod === 'text' && files.length === 0 && !isFetchingFiles && (
        <div className="mb-4">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Paste the ${fileType.replace('-', ' ')} here...`}
            className="w-full border border-gray-300 rounded-lg p-3 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isUploading}
            className={`mt-2 px-4 py-2 rounded-lg ${
              !textInput.trim() || isUploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isUploading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}

      {/* File Upload Button (only show if in file mode or text input is not allowed) */}
      {(!allowTextInput || inputMethod === 'file' || files.length > 0) && (
        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <div className="border border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50">
              <span className="text-blue-600">{title}</span>
              <input
                id={fileInputId}
                type="file"
                accept={acceptTypes}
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading || isFetchingFiles}
              />
            </div>
          </label>

          {isUploading && (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          )}
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="mt-2 text-sm text-red-600">
          {uploadError}
        </div>
      )}
    </div>
  );
};

export default FileViewer;
