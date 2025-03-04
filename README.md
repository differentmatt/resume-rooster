# Resume Rooster

Trying out [OpenAI's Assistants API](https://platform.openai.com/docs/assistants/overview) by building a resumed generator.  Used [Assistants API Quickstart](https://github.com/openai/openai-assistants-quickstart) as a starting point.

High-level app steps:

1. Upload work experience docs (e.g. old resumes)
2. Upload a job description
3. AI Assistant generates a new resume targeting given job description
4. Chat interface for clarifying and requesting changes

What is going well:

- Assistants API automatically manages context: files and message history
- Easy to use API
- Can quickly improve a generated resume by provide guidance or asking questions via chat

Room for improvement:

- ChatGPT provides much better results given the same model + files + instructions

Next steps:

- What can we do to improve the resume generation quality?
- What can we instrument to see how the Assistant is making decisions?
- Do we need multiple assistants with different instructions?  E.g. gather job requirements, generate new resume content, format resume to match previous ones.

## Basic Architecture / User flows

- Assistant created manually
- The same assistant is used for every user
- Set of uploaded files is per-user
- Vector stores are per-user
- Message threads are per-user

When a user adds a new file:
2. File added to vector store via openai.beta.vectorStores.fileBatches.uploadAndPoll

When a user deletes a file:

1. Removed from vector store via openai.beta.vectorStores.files.del
2. Removed from openai via openai.files.del

When a user selects delete all files

1. Delete all vector files via openai.beta.vectorStores.files.list and openai.beta.vectorStores.files.del
2. Delete all openai via openai.files.list and openai.files.del

When user clicks Create Resume

1. Show chat component
2. If threadId in localstorage
    1. Load messages via openai.beta.threads.messages.list
3. else
    1. Create new thread via openai.beta.threads.create
    2. Save threadId to localstorage

When user clicks back to Upload

1. Cancel existing runs
2. Hide chat component and show upload files UI

On user send message:

1. [Server] Create user message via openai.beta.threads.messages.create
2. [Server] Create streaming run via openai.beta.threads.runs.stream
3. [Server] return stream to client for handling
4. [Client] handle stream events via stream.on(‘blah’)
    1. For requires_action:
        1. [Client] Handle tool calls, event.data.required_action.submit_tool_outputs.tool_calls
        2. [Server] Submit tool outputs via openai.beta.threads.runs.submitToolOutputsStream
        3. [Server] Recursively return stream to client for handling

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes (serverless)
- **AI**: OpenAI Assistants API with function calling
- **Styling**: TailwindCSS
- **Markdown**: React-Markdown for rendering

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- OpenAI API key with access to Assistants API

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/resume-builder.git
   cd resume-builder
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Run the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```typescript
OPENAI_API_KEY=your_openai_api_key
OPENAI_ASSISTANT_ID=optional_existing_assistant_id
```

Note: If you don't provide an `OPENAI_ASSISTANT_ID`, the application will create a new Assistant on first run. You should then copy the generated Assistant ID to your environment variables for future use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
