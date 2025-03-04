"use client";

import { useState, useEffect, useRef } from "react";
import logger from "@/lib/shared/logger";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";

// TODO: user message input UI needs to be multi-line

type MessageProps = {
  role: "user" | "assistant";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    default:
      return null;
  }
};


type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

const Chat = ({ functionCallHandler = async (toolCall: any) => { return ""; } }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [threadId, setThreadId] = useState("");
  const hasInitializedRef = useRef(false);

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load or create a new threadId when chat component created
  useEffect(() => {
    if (hasInitializedRef.current) return;
    setInputDisabled(true);

    const loadThreadId = async () => {
      hasInitializedRef.current = true;
      const savedThreadId = localStorage.getItem("resumeBuilder_threadId");
      if (savedThreadId !== null && savedThreadId !== undefined) {
        console.log(`Existing thread ${savedThreadId} found, cancelling existing runs and loading messages`);
        await cancelExistingRuns(savedThreadId);
        await loadThreadMessages(savedThreadId);
        setThreadId(savedThreadId);
        const savedResumeContent = localStorage.getItem("resumeBuilder_resumeContent");
        if (savedResumeContent !== null && savedResumeContent !== undefined) {
          console.log(`Found saved resume content, updating resume`);
          functionCallHandler({
            id: "update_resume",
            type: "function",
            function: {
              name: "update_resume",
              arguments: JSON.stringify({ content: savedResumeContent })
            }
          });
        }
        setInputDisabled(false);
      } else {
        console.log('No existing thread found, creating new thread');
        const createThread = async () => {
          const res = await fetch(`/api/assistants/threads`, {
            method: "POST",
          });
          const data = await res.json();
          setThreadId(data.threadId);
          console.log(`New thread ${data.threadId} created`);
          localStorage.setItem("resumeBuilder_threadId", data.threadId);
          // Do not enable input here, need to wait for initial messages run to finish
        };
        createThread();
      }
    };
    loadThreadId();
  }, []);

  useEffect(() => {
    if (threadId && messages.length === 0) {
      const msg = "I've uploaded files for resume creation.";
      sendMessage(msg);
      appendMessage("user", msg);
  }
  }, [threadId]);

  const cancelExistingRuns = async (threadId: string) => {
    try {
      const response = await fetch(`/api/assistants/threads/${threadId}/cancel-runs`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        logger.info(`Cancelled ${result.cancelledCount} existing runs for thread ${threadId}`);
      } else {
        logger.warn(`Failed to cancel runs for thread ${threadId}`);
      }
    } catch (error) {
      logger.error("Error when cancelling runs", { error, threadId });
    }
  }

  const loadThreadMessages = async (threadId: string) => {
    try {
      logger.info(`Fetching messages from API for thread ${threadId}`);
      const response = await fetch(`/api/assistants/threads/${threadId}/messages`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        // Convert OpenAI messages to our format
        const formattedMessages = data.messages.map((msg: any) => {
          // Extract content text from different message formats
          let contentText = "";

          // Handle string content
          if (typeof msg.content === 'string') {
            contentText = msg.content;
          }
          // Handle array content (OpenAI API v2 format)
          else if (Array.isArray(msg.content)) {
            const textParts: string[] = [];

            msg.content.forEach((contentItem: any) => {
              // Text content
              if (contentItem.type === 'text' && contentItem.text) {
                textParts.push(contentItem.text.value || '');
              }
              // File attachment content
              else if (contentItem.type === 'image_file' || contentItem.type === 'file_attachment') {
                textParts.push(`[Attached file: ${contentItem.file_id || 'File'}]`);
              }
            });

            contentText = textParts.join('\n');
          }

          // If after processing, we still have empty content, add a placeholder
          if (!contentText.trim() && msg.role === 'user') {
            contentText = "Files were uploaded for analysis.";
          }

          return {
            // id: `${msg.role}-${msg.created_at || Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            role: msg.role as "user" | "assistant",
            text: contentText//,
            // isLoading: false,
          };
        });

        logger.info(`Received ${formattedMessages.length} messages from API for thread ${threadId}`);

        // Set messages and save to localStorage
        setMessages(formattedMessages);
        // localStorage.setItem("resumeBuilder_messages", JSON.stringify(formattedMessages));
        // localStorage.setItem("resumeBuilder_threadId", threadId);
      } else {
        // Add welcome message if no messages found
        logger.info(`No messages found in API response for thread ${threadId}, adding welcome message`);
        appendMessage("assistant", "Hello! I'll help you create a resume based on your work experience and the job description you provided. What would you like me to focus on in your resume?");
      }
    } catch (error) {
      logger.error("Error fetching messages from API", { error, threadId });
      // Add welcome message if couldn't fetch messages
      appendMessage("assistant", "Hello! I'll help you create a resume based on your work experience and the job description you provided. What would you like me to focus on in your resume?");
    }
  };

  const sendMessage = async (text: string) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body as ReadableStream<Uint8Array<ArrayBufferLike>>);
    handleReadableStream(stream);
  };

  const submitActionResult = async (runId: string, toolCallOutputs: any) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body as ReadableStream<Uint8Array<ArrayBufferLike>>);
    handleReadableStream(stream);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput);
    setMessages((prevMessages: MessageProps[]) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta : any) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall: any) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

    const appendToLastMessage = (text: string) => {
      setMessages((prevMessages: MessageProps[]) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const updatedLastMessage = {
          ...lastMessage,
          text: lastMessage.text + text,
        };
        return [...prevMessages.slice(0, -1), updatedLastMessage];
      });
    };

    const appendMessage = (role: "user" | "assistant", text: string) => {
      setMessages((prevMessages: MessageProps[]) => {
        // Check if this appears to be a duplicate of the last message (within last 500ms)
        if (prevMessages.length > 0) {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage.role === role && lastMessage.text === text) {
            // This is likely a duplicate from StrictMode double-invocation
            return prevMessages;
          }
        }

        return [...prevMessages, { role, text }];
      });
    };

    const annotateLastMessage = (annotations: any) => {
      setMessages((prevMessages: MessageProps[]) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const updatedLastMessage = {
          ...lastMessage,
        };
        annotations.forEach((annotation: any) => {
          if (annotation.type === 'file_path') {
            updatedLastMessage.text = updatedLastMessage.text.replaceAll(
              annotation.text,
              `/api/files/${annotation.file_path.file_id}`
            );
          }
        })
        return [...prevMessages.slice(0, -1), updatedLastMessage];
      });

    }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          {inputDisabled ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chat;
