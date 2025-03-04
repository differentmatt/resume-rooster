import { NextResponse } from "next/server";
import { openai } from "@/lib/server/openai";

export const runtime = "nodejs";

// Create a new thread
export async function POST() {
  try {
    const thread = await openai.beta.threads.create();
    return NextResponse.json({ threadId: thread.id});
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}