import { openai } from "@/lib/server/openai";
import { assistantId } from "@/lib/server/assistant-config";
import logger from "@/lib/shared/logger";

/**
 * Creates a new thread with files attached and polls to ensure files are indexed
 * @param fileIds Array of file IDs to attach to the thread
 * @returns The created thread ID
 */
export const createThread = async (fileIds: string[], message: string): Promise<string> => {
  if (!fileIds.length) {
    throw new Error("No file IDs provided to attach to thread");
  }

  try {
    logger.info(`Creating thread with ${fileIds.length} files`);

    // Create thread with initial message containing file attachments
    const stream = await openai.beta.threads.createAndRun({
      assistant_id: assistantId,
      thread: {
        messages: [
          {
            role: "user",
            content: message,
            attachments: fileIds.map(fileId => ({
              file_id: fileId,
              tools: [{ type: "file_search" as const }]
            }))
          }
        ],
      },
      stream: true
    });

    logger.info(`Thread created with ID: ${thread.id}, initiating run to index files`);

    // // Create a run to initiate indexing
    // const run = await openai.beta.threads.runs.create(thread.id, {
    //   assistant_id: assistantId,
    // });

    // // Poll run status until indexing is complete
    // let runStatus = run.status;
    // let indexingSucceeded = false;
    // let checkCount = 0;
    // const maxChecks = 20;
    // let delayBetweenChecks = 2000;

    // logger.info(`Initial run status: ${runStatus}, polling for completion`);

    // // Poll until run completes or fails
    // while (checkCount < maxChecks &&
    //        (runStatus === "queued" || runStatus === "in_progress" || runStatus === "requires_action")) {
    //   await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));

    //   const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    //   runStatus = updatedRun.status;
    //   checkCount++;

    //   logger.info(`Check ${checkCount}/${maxChecks}: Run status ${runStatus} for thread ${thread.id}`);

    //   // If completed, indexing succeeded
    //   if (runStatus === "completed") {
    //     indexingSucceeded = true;
    //     break;
    //   }

    //   // If failed/cancelled/expired, indexing may have failed
    //   if (runStatus === "failed" || runStatus === "cancelled" || runStatus === "expired") {
    //     // Check the run for specific error about file processing
    //     const runDetails = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    //     // Check if the error message contains any reference to file processing
    //     if (runDetails.last_error &&
    //         typeof runDetails.last_error.message === 'string' &&
    //         runDetails.last_error.message.toLowerCase().includes('file')) {
    //       logger.error(`Run failed due to file processing issue: ${runDetails.last_error.message}`);
    //     } else {
    //       logger.error(`Run failed with status ${runStatus}: ${runDetails.last_error?.message || "Unknown error"}`);
    //     }
    //     break;
    //   }

    //   // Exponential backoff
    //   delayBetweenChecks = Math.min(delayBetweenChecks * 1.5, 5000); // Cap delay at 5 seconds
    // }

    // // Cancel the run if we're done checking but it's still running
    // if (!indexingSucceeded &&
    //     (runStatus === "queued" || runStatus === "in_progress" || runStatus === "requires_action")) {
    //   try {
    //     await openai.beta.threads.runs.cancel(thread.id, run.id);
    //     logger.info(`Cancelled run ${run.id} after ${maxChecks} checks`);
    //   } catch (error) {
    //     logger.error(`Error cancelling run: ${error}`);
    //   }
    // }

    // if (!indexingSucceeded) {
    //   logger.warn(`Files may not be fully indexed for thread ${thread.id}, but proceeding anyway`);
    // } else {
    //   logger.info(`All files successfully indexed for thread ${thread.id}`);
    // }

    return thread.id;
  } catch (error) {
    logger.error('Error creating thread:', { error });
    throw new Error(`Failed to create thread: ${error}`);
  }
};

/**
 * Creates a run with the assistant on a specific thread
 * @param threadId The thread ID to run the assistant on
 * @returns The created run ID
 */
export const createRun = async (threadId: string): Promise<string> => {
  try {
    logger.info(`Creating run on thread ${threadId} with assistant ${assistantId}`);

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: "Please review the user's work experience and job description documents. Help them create a tailored resume that highlights their relevant skills and experience for the job they're applying to."
    });

    logger.info(`Run created with ID: ${run.id}`);

    return run.id;
  } catch (error) {
    logger.error('Error creating run:', { error });
    throw new Error(`Failed to create run: ${error}`);
  }
};