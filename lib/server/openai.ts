import OpenAI from 'openai'

// Initialize the OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Export a function to check if the API key is configured
export function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}