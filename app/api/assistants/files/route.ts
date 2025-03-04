import { openai } from "@/lib/server/openai";
import { NextResponse } from "next/server";
import logger from "@/lib/shared/logger";
import { getAllFiles, getFilesByType, deleteAllFiles, deleteAllVectorStoreFiles } from "@/lib/server/file-manager";
import { getOrCreateVectorStore } from "@/lib/server/vector-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('fileType');

    logger.info(`Getting files${fileType ? ` for type: ${fileType}` : ''}`);

    // Get files using the file manager utility
    let files;
    if (fileType) {
      files = await getFilesByType(fileType);
      logger.info(`Filtered to ${files.length} files of type ${fileType}`);
    } else {
      files = await getAllFiles();
    }

    return NextResponse.json(files);
  } catch (error) {
    logger.error('Error retrieving files:', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    let deletedVectorStoreFiles;
    let deletedFiles;

    try {
      deletedVectorStoreFiles = await deleteAllVectorStoreFiles();
    } catch (error) {
      logger.error('Error during vector store file cleanup:', { error });
    }
    try {
      deletedFiles = await deleteAllFiles();
    } catch (error) {
      logger.error('Error during file cleanup:', { error });
    }

    logger.info('Cleanup complete:', { deletedVectorStoreFiles, deletedFiles });
    return NextResponse.json({ success: true, deletedVectorStoreFiles, deletedFiles });
  } catch (error) {
    logger.error('Error deleting file:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store

    const timestamp = Date.now();

    let filename;
    let originalFilename;
    let fileType;
    let file;

    // Handle JSON requests (for text submissions)
    if (contentType.includes('application/json')) {
      const { text, fileType } = await request.json();

      if (!text) {
        return NextResponse.json({ success: false, error: 'No text provided' }, { status: 400 });
      }

      if (!fileType || !['work-experience', 'job-description'].includes(fileType)) {
        return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
      }

      // Generate a unique filename with timestamp
      originalFilename = filename = fileType === 'work-experience'
        ? `${timestamp}-work-experience-rooster-work-experience.txt`
        : `${timestamp}-job-description-rooster-job-description.txt`;

      // Create a file from the text
      const blob = new Blob([text], { type: 'text/plain' });
      file = new File([blob], filename, { type: 'text/plain' });
    } else {
      // Handle form data requests (for file uploads)
      const formData = await request.formData();
      const formFile = formData.get('file') as File;
      const fileType = formData.get('fileType') as string;

      if (!formFile) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      if (!fileType || !['work-experience', 'job-description'].includes(fileType)) {
        return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
      }

      // Generate a unique filename with timestamp at the beginning
      originalFilename = formFile.name;
      filename = fileType === 'work-experience'
        ? `${timestamp}-work-experience-rooster-${originalFilename}`
        : `${timestamp}-job-description-rooster-${originalFilename}`;

      // Convert the ArrayBuffer to a File object
      const fileArrayBuffer = await formFile.arrayBuffer();
      const fileBlob = new Blob([fileArrayBuffer], { type: formFile.type });
      file = new File([fileBlob], filename, { type: formFile.type });
    }

    // Add file to vector store
    await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
      files: [file],
    });


    // Return success response with file details
    return NextResponse.json({
      success: true,
      filename,
      originalFilename,
      fileType,
      createdAt: timestamp,
      message: "File uploaded successfully. It will be processed for vector search when attached to a thread."
    });
  } catch (error) {
    logger.error('Error uploading file:', { error });
    return NextResponse.json(
      { success: false, error: `Error uploading file: ${error}` },
      { status: 500 }
    );
  }
}