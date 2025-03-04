import { openai } from "@/lib/server/openai";
import { RunStep } from "openai/resources/beta/threads/runs/steps";

// In-memory cache for run details to avoid duplicate logging
const loggedRuns = new Set<string>();

// Add interface definitions for tool calls
interface RetrievalDetails {
  query?: string;
  source_ids?: string[];
}

// Type definition for tool calls with a more flexible type
interface ToolCall {
  type: string;
  id: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Log detailed information about a run
 */
export async function logRunDetails(threadId: string, runId: string, event?: string): Promise<void> {
  try {
    console.log(`\n[RUN LOGGER] logRunDetails called for run ${runId} in thread ${threadId} (event: ${event || 'manual_log'})`);

    // Skip if we've already logged this run with the same event
    const runEventKey = `${threadId}:${runId}:${event || 'manual_log'}`;
    if (loggedRuns.has(runEventKey)) {
      console.log(`[RUN LOGGER] Already logged this run event, skipping`);
      return;
    }

    console.log(`\n=== RUN DETAILS (${event || 'manual_log'}) ===`);
    console.log(`Thread ID: ${threadId}`);
    console.log(`Run ID: ${runId}`);

    // Get run details
    try {
      console.log(`[RUN LOGGER] Fetching run details from OpenAI API`);
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);

      // Get run steps
      console.log(`[RUN LOGGER] Fetching run steps from OpenAI API`);
      const stepsResponse = await openai.beta.threads.runs.steps.list(threadId, runId);
      const steps = stepsResponse.data;

      // Sort steps by creation date (oldest first)
      const sortedSteps = [...steps].sort((a, b) => a.created_at - b.created_at);

      // Log run details
      console.log(`Status: ${run.status}`);
      console.log(`Model: ${run.model}`);
      const runStart = new Date(run.created_at * 1000);
      console.log(`Created at: ${runStart.toISOString()}`);
      if (run.completed_at) {
        const runEnd = new Date(run.completed_at * 1000);
        const durationSecs = (run.completed_at - run.created_at).toFixed(2);
        console.log(`Completed at: ${runEnd.toISOString()}`);
        console.log(`Total duration: ${durationSecs}s`);
      }
      console.log(`Total steps: ${sortedSteps.length}`);

      // Count step types
      const stepTypes: Record<string, number> = {};
      sortedSteps.forEach(step => {
        stepTypes[step.type] = (stepTypes[step.type] || 0) + 1;
      });

      console.log('Step type counts:', stepTypes);

      // Create a simple timeline visualization
      if (sortedSteps.length > 0 && run.completed_at) {
        const totalRunTime = run.completed_at - run.created_at;
        console.log('\n--- Run Timeline ---');
        sortedSteps.forEach((step, index) => {
          const startOffset = ((step.created_at - run.created_at) / totalRunTime * 100).toFixed(1);
          const endOffset = step.completed_at
            ? ((step.completed_at - run.created_at) / totalRunTime * 100).toFixed(1)
            : startOffset;
          const duration = step.completed_at
            ? (step.completed_at - step.created_at).toFixed(2)
            : 'incomplete';

          console.log(`[${startOffset}% ${'-'.repeat(Math.floor(Number(endOffset) - Number(startOffset)))}] Step ${index + 1}: ${step.type} (${duration}s)`);
        });
      }

      // Log basic info about each step
      console.log('\n--- Steps Details ---');
      let previousStepEndTime = run.created_at;
      sortedSteps.forEach((step: RunStep, index) => {
        // Calculate time gap from previous step (or run start)
        const timeGapFromPrevious = (step.created_at - previousStepEndTime).toFixed(2);

        console.log(`\nStep ${index + 1}: ${step.type} (${step.status})`);
        console.log(`  Created: ${new Date(step.created_at * 1000).toISOString()} (${timeGapFromPrevious}s after previous step)`);

        if (step.completed_at) {
          const duration = (step.completed_at - step.created_at).toFixed(2);
          console.log(`  Completed: ${new Date(step.completed_at * 1000).toISOString()}`);
          console.log(`  Duration: ${duration}s`);
          previousStepEndTime = step.completed_at;
        } else {
          previousStepEndTime = step.created_at;
        }

        // Add detailed step info based on type
        // This would include tool calls, message creation, etc.
        // The detailed logic is quite extensive and tool-specific
      });

      // Logfile retrieval details
      logFileRetrievals(threadId, runId);

      // Mark this run as logged to avoid duplicate logs
      loggedRuns.add(runEventKey);
    } catch (error) {
      console.error(`[RUN LOGGER] Error fetching run details:`, error);
    }
  } catch (error) {
    console.error(`[RUN LOGGER] Error logging run details:`, error);
  }
}

/**
 * Log file retrieval information for a run
 */
export async function logFileRetrievals(threadId: string, runId: string): Promise<void> {
  try {
    console.log(`\n[RUN LOGGER] logFileRetrievals called for run ${runId} in thread ${threadId}`);

    // Get run steps
    const stepsResponse = await openai.beta.threads.runs.steps.list(threadId, runId);
    const steps = stepsResponse.data;

    // Filter for retrieval steps - use a more flexible approach with any casting
    const retrievalSteps = steps.filter(step => {
      if (step.type !== 'tool_calls' || !('tool_calls' in step.step_details)) {
        return false;
      }

      // Cast to any to work with the data
      const toolCalls = step.step_details.tool_calls as any[];
      return toolCalls.some(call => call.type === 'retrieval');
    });

    if (retrievalSteps.length === 0) {
      console.log('No file retrieval steps found in this run');
      return;
    }

    console.log(`\n=== FILE RETRIEVALS (${retrievalSteps.length} steps) ===`);

    // Log each retrieval step
    retrievalSteps.forEach((step, stepIndex) => {
      if ('tool_calls' in step.step_details) {
        // Cast to any for flexible handling
        const toolCalls = step.step_details.tool_calls as any[];
        const retrievalCalls = toolCalls.filter(call => call.type === 'retrieval');

        retrievalCalls.forEach((call: any, callIndex) => {
          console.log(`\nRetrieval ${stepIndex + 1}.${callIndex + 1}:`);

          if (call.retrieval) {
            // Log retrieval details
            if (call.retrieval.query) {
              console.log(`  Query: "${call.retrieval.query}"`);
            }

            if (call.retrieval.source_ids && call.retrieval.source_ids.length > 0) {
              console.log(`  Sources: ${call.retrieval.source_ids.join(', ')}`);
            }
          }

          // Log output if available
          if (call.output) {
            const outputSample = typeof call.output === 'string'
              ? call.output.substring(0, 100)
              : JSON.stringify(call.output).substring(0, 100);
            console.log(`  Output (preview): ${outputSample}...`);
          }
        });
      }
    });
  } catch (error) {
    console.error('[RUN LOGGER] Error logging file retrievals:', error);
  }
}

/**
 * Get logged runs (simplified version)
 */
export async function getLoggedRuns(): Promise<any[]> {
  console.log('getLoggedRuns called, but logs are not being stored in this simplified version');
  return [];
}