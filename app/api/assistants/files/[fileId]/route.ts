import { openai } from "@/lib/server/openai";
import logger from "@/lib/shared/logger";
import { NextResponse } from "next/server";
import { getOrCreateVectorStore } from "@/lib/server/vector-store";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { params } = context;
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'No file ID provided' },
        { status: 400 }
      );
    }

    logger.info(`Deleting file: ${fileId}`);

    // Delete the file from the vector store
    const vectorStoreId = await getOrCreateVectorStore();
    await openai.beta.vectorStores.files.del(vectorStoreId, fileId);
    logger.info(`File deleted from vector store: ${fileId}`);

    // Delete the file from OpenAI
    await openai.files.del(fileId);
    logger.info(`File deleted from OpenAI: ${fileId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting file:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}