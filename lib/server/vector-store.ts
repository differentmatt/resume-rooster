import { openai } from "./openai";
import { assistantId } from "./assistant-config";

export async function getOrCreateVectorStore() {
  if (!assistantId) {
    throw new Error('Assistant ID is not configured. Please set OPENAI_ASSISTANT_ID in your environment.');
  }

  try {
    // If the assistant already has a vector store, return it
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    if (assistant?.tool_resources?.file_search?.vector_store_ids?.length && assistant.tool_resources.file_search.vector_store_ids.length > 0) {
      return assistant.tool_resources.file_search.vector_store_ids[0];
    }

    // Otherwise, create a new vector store and attach it to the assistant
    const vectorStore = await openai.beta.vectorStores.create({
      name: "resume-rooster-vector-store",
    });
    await openai.beta.assistants.update(assistantId, {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    });
    return vectorStore.id;
  } catch (error) {
    console.error('Error in getOrCreateVectorStore:', error);
    throw new Error('Failed to get or create vector store');
  }
};
