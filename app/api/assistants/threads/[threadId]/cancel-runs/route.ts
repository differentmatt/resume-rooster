import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/server/openai";
import logger from "@/lib/shared/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const threadId = params.threadId;

  try {
    // List active runs
    const activeRuns = await openai.beta.threads.runs.list(threadId, { limit: 10 });

    // Cancel any runs that are still active
    let cancelledCount = 0;
    // Cancel any runs that are still active
    let cancelledCount = 0;
    let failedCount = 0;
    for (const run of activeRuns.data) {
      if (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
        try {
          await openai.beta.threads.runs.cancel(threadId, run.id);
          cancelledCount++;
          logger.info(`Cancelled run ${run.id} in thread ${threadId}`);
        } catch (err) {
          failedCount++;
          logger.error(`Failed to cancel run ${run.id} in thread ${threadId}`, { error: err });
        }
      }
    }

    return NextResponse.json({
      message: `Cancelled ${cancelledCount} active runs${failedCount > 0 ? `, failed to cancel ${failedCount} runs` : ''}`,
      cancelledCount,
      failedCount
    });

    return NextResponse.json({
      message: `Cancelled ${cancelledCount} active runs`,
      cancelledCount
    });
  } catch (error) {
    logger.error("Error cancelling runs:", { error: error as Error });
    return NextResponse.json(
      { error: "Failed to cancel runs" },
      { status: 500 }
    );
  }
}