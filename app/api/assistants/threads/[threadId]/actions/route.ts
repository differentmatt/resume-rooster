import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/server/openai";
import { logRunDetails, logFileRetrievals } from "@/lib/server/run-logger";
import logger from "@/lib/shared/logger";
import { getAllFiles } from "@/lib/server/file-manager";
import { getOrCreateVectorStore } from "@/lib/server/vector-store";


async function updateResumeInVectorStore(threadId: string, runId: string, toolCallOutputs: any) {
  console.log('Updating resume in vector store');
  try {
    const vectorStoreId = await getOrCreateVectorStore();
    const filename = 'resume-draft.txt';
    const resumeContent = toolCallOutputs.find((output: any) => output.name === 'update_resume').content;
    if (!resumeContent) {
      logger.error('No resume content found');
      return;
    }

    // Delete the existing resume from the vector store if it exists
    const files = await getAllFiles()
    const resumeFile = files.find((file: any) => file.filename === filename);
    if (resumeFile) {
      await openai.files.del(resumeFile.fileId);
      await openai.beta.vectorStores.files.del(vectorStoreId, resumeFile.fileId);
    }

    // Create a new resume file
    const blob = new Blob([resumeContent], { type: 'text/plain' });
    const newFile = new File([blob], filename, { type: 'text/plain' });

    await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
      files: [newFile],
    });
  } catch (error) {
    logger.error('Error updating resume in vector store:', { error });
    throw error;
  }
}

// Submit tool outputs to a run
export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;

  try {
    const body = await request.json();
    const { runId, toolCallOutputs } = body;

    if (!threadId || !runId || !toolCallOutputs) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    logger.info(`Submitting ${toolCallOutputs.length} tool outputs to run ${runId}`, {
      threadId,
      runId,
      toolCallCount: toolCallOutputs.length
    });

    // Log run details before submitting tool outputs
    console.log(`[RUN LOGGER] About to log run details before tool outputs for run ${runId}`);
    await logRunDetails(threadId, runId, 'before_tool_outputs');

    // Also log immediately after submitting tool outputs to ensure we capture the data
    console.log(`[RUN LOGGER] Setting up immediate logging after tool submission`);
    setTimeout(async () => {
      try {
        console.log(`[RUN LOGGER] Running delayed log after tool submission for ${runId}`);
        await logRunDetails(threadId, runId, 'after_tool_outputs');
      } catch (error) {
        console.error(`[RUN LOGGER] Error in delayed logging:`, error);
      }
    }, 3000);

    // If update_resume, update in vector store
    console.log('toolCallOutputs', toolCallOutputs);
    if (toolCallOutputs.some((output: any) => output.name === 'update_resume')) {
      console.log('Updating resume in vector store');
      await updateResumeInVectorStore(threadId, runId, toolCallOutputs);
    }

    // Submit the tool outputs to the OpenAI API
    const stream = await openai.beta.threads.runs.submitToolOutputsStream(
      threadId,
      runId,
      {
        tool_outputs: toolCallOutputs,
      }
    );

    console.log(`[RUN LOGGER] Created tool outputs stream for run ${runId} in thread ${threadId}`);

    // Log when the run completes after tool outputs
    // @ts-ignore - The TypeScript types are out of date with the SDK
    stream.on('run.completed', (run: any) => {
      console.log(`[STREAM] Run completed after tool outputs: ${runId} for thread ${threadId}`);

      logger.info(`Run completed after tool outputs for thread ${threadId}`, {
        runId,
        threadId,
        status: 'completed'
      });

      // Log detailed run information including file retrievals
      logRunDetails(threadId, runId, 'run_completed_after_tools');
      logFileRetrievals(threadId, runId);
    });

    // Add error event handler
    stream.on('error', (error: any) => {
      console.error('[STREAM] Error in tool outputs stream:', error);
    });

    // Return the stream to the client
    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error("Error submitting tool outputs:", error);
    return NextResponse.json(
      { error: "Failed to submit tool outputs" },
      { status: 500 }
    );
  }
}
