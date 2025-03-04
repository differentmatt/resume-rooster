import { assistantId } from "@/lib/server/assistant-config";
import { openai } from "@/lib/server/openai";
import { logFileRetrievals, logRunDetails } from "@/lib/server/run-logger";
import logger from "@/lib/shared/logger";

export const runtime = "nodejs";

// Get messages from a thread
export async function GET(_request: Request, context: { params: { threadId: string } }) {
  const { threadId } = context.params;
  try {
    logger.info(`Fetching messages from thread: ${threadId}`);

    // Get messages from the thread
    // By default, the API returns messages in reverse chronological order (newest first)
    const messagesResponse = await openai.beta.threads.messages.list(threadId, {
      order: "asc", // Change to ascending order (oldest first)
      limit: 100 // Increase limit to ensure we get all messages
    });

    // Return the messages
    return Response.json({
      messages: messagesResponse.data
    });
  } catch (error) {
    logger.error("Error fetching messages:", { error: JSON.stringify(error) });
    return Response.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// Send a new message to a thread
export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { params } = context;
    const { threadId } = await params;
    const { content } = await request.json();

    if (!threadId || !content) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    // Create user message
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content,
    });

    // Create the assistant run and get a stream
    const stream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantId,
    });

    // @ts-ignore - The TypeScript types are out of date with the SDK
    stream.on('run.completed', (run: any) => {
      logger.info(`Run ${run.id} completed successfully.`);
      logRunDetails(threadId, run.id, 'run_completed');
      logFileRetrievals(threadId, run.id);
    });

    // Return the OpenAI stream directly to client
    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    logger.error('Failed to send message or initiate run', { error });
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

