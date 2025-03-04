import { NextResponse } from "next/server";
import { openai } from "@/lib/server/openai";

export const runtime = "nodejs";

// Create a new thread
export async function POST() {
  const thread = await openai.beta.threads.create();
  return NextResponse.json({ threadId: thread.id});
}