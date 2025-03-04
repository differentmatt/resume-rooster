import { openai } from "@/lib/server/openai";
import logger from "@/lib/shared/logger";
import { getOrCreateVectorStore } from "@/lib/server/vector-store";
// Helper function to extract file type and display name from filename
export const getFileInfo = (filename: string) => {
  let fileType = 'unknown';
  let displayName = filename;

  // Extract timestamp from the beginning of the filename
  const timestampMatch = filename.match(/^(\d+)-/);

  if (timestampMatch) {
    const timestamp = timestampMatch[1];
    const filenameWithoutTimestamp = filename.substring(timestamp.length + 1); // +1 for the hyphen

    // Check for exact prefixes
    if (filenameWithoutTimestamp.startsWith('work-experience-rooster-')) {
      fileType = 'work-experience';
      displayName = filenameWithoutTimestamp.substring('work-experience-rooster-'.length);
    }
    else if (filenameWithoutTimestamp.startsWith('job-description-rooster-')) {
      fileType = 'job-description';
      displayName = filenameWithoutTimestamp.substring('job-description-rooster-'.length);
    }
  }

  return { fileType, displayName };
};

/**
 * Retrieves all files with purpose 'assistants'
 * @returns Array of file objects with metadata
 */
export const getAllFiles = async () => {
  try {
    // Get all files with purpose 'assistants'
    const filesList = await openai.files.list({ purpose: 'assistants' });

    // Process files to extract metadata
    return filesList.data.map(file => {
      const fileInfo = getFileInfo(file.filename);

      return {
        fileId: file.id,
        filename: file.filename,
        fileType: fileInfo.fileType,
        displayName: fileInfo.displayName,
        createdAt: file.created_at,
      };
    });

  } catch (error) {
    logger.error('Error retrieving files:', { error });
    throw error;
  }
};

export const getAllVectorStoreFiles = async () => {
  try {
    const vectorStoreId = await getOrCreateVectorStore();
    const filesList = await openai.beta.vectorStores.files.list(vectorStoreId);
    return filesList.data.map(file => ({
      fileId: file.id,
      createdAt: file.created_at,
    }));
  } catch (error) {
    logger.error('Error retrieving vector store files:', { error });
    throw error;
  }
}

/**
 * Retrieves files of a specific type
 * @param fileType The type of files to retrieve
 * @returns Array of file objects with metadata
 */
export const getFilesByType = async (fileType: string) => {
  try {
    const files = await getAllFiles();
    return files.filter(file => file.fileType === fileType);
  } catch (error) {
    logger.error(`Error retrieving files by type ${fileType}:`, { error });
    throw error;
  }
};

/**
 * Deletes all files with purpose 'assistants'
 * @returns Number of files deleted
 */
export const deleteAllFiles = async () => {
  try {
    const files = await getAllFiles();
    for (const file of files) {
      await openai.files.del(file.fileId);
    }
    return files.length;
  } catch (error) {
    logger.error('Error deleting all files:', { error });
  }
  return 0;
};

/**
 * Deletes all files from the vector store
 * @returns Number of files deleted
 */
export const deleteAllVectorStoreFiles = async () => {
  try {
    const vectorStoreId = await getOrCreateVectorStore();
    const files = await getAllVectorStoreFiles();
    for (const file of files) {
      await openai.beta.vectorStores.files.del(vectorStoreId, file.fileId);
    }
    return files.length;
  } catch (error) {
    logger.error('Error deleting all vector store files:', { error });
  }
  return 0;
};
