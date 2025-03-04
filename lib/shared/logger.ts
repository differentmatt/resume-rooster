import { NextRequest } from 'next/server';

// Configure log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Define types for log data
export type LogData = Record<string, unknown>;
export type CircularReplacerFn = (key: string, value: unknown) => unknown;

// Default to INFO in production, DEBUG in development
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
const rawLogLevel = Number(process.env.LOG_LEVEL);
const CURRENT_LOG_LEVEL = isNaN(rawLogLevel) ? DEFAULT_LOG_LEVEL : rawLogLevel;

/**
 * Format a log message with timestamp and level
 */
function formatLogMessage(level: string, message: string, data?: LogData): string {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    if (typeof data === 'object') {
      try {
        // Handle circular references and format JSON
        logMessage += `\n${JSON.stringify(data, getCircularReplacer(), 2)}`;
      } catch (error) {
        logMessage += `\n[Error serializing data: ${error}]`;
      }
    } else {
      logMessage += ` ${data}`;
    }
  }

  return logMessage;
}

/**
 * Handle circular references in JSON.stringify
 */
function getCircularReplacer(): CircularReplacerFn {
  const seen = new WeakSet();
  return (key: string, value: unknown): unknown => {
    // Skip large arrays or buffers
    if (Array.isArray(value) && value.length > 100) {
      return `[Array with ${value.length} items]`;
    }
    if (Buffer.isBuffer(value)) {
      return `[Buffer of size ${value.length}]`;
    }
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Log a debug message
 */
export function debug(message: string, data?: LogData): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
    const logMessage = formatLogMessage('DEBUG', message, data);
    console.debug(logMessage);
  }
}

/**
 * Log an info message
 */
export function info(message: string, data?: LogData): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
    const logMessage = formatLogMessage('INFO', message, data);
    console.info(logMessage);
  }
}

/**
 * Log a warning message
 */
export function warn(message: string, data?: LogData): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
    const logMessage = formatLogMessage('WARN', message, data);
    console.warn(logMessage);
  }
}

/**
 * Log an error message
 */
export function error(message: string, data?: LogData): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
    const logMessage = formatLogMessage('ERROR', message, data);
    console.error(logMessage);
  }
}

/**
 * Log an API request
 */
export function logRequest(req: NextRequest, routeName: string): void {
  const url = new URL(req.url);
  info(`API Request: ${routeName}`, {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: {
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent'),
    }
  });
}

/**
 * Log an OpenAI API call
 */
export function logOpenAICall(action: string, params: LogData, result?: LogData): void {
  debug(`OpenAI API Call: ${action}`, { params });
  if (result) {
    debug(`OpenAI API Result: ${action}`, { result });
  }
}

/**
 * Log an assistant run status change
 */
export function logRunStatus(threadId: string, runId: string, status: string, details?: LogData): void {
  info(`Assistant Run Status: ${status}`, {
    threadId,
    runId,
    details
  });
}

export default {
  debug,
  info,
  warn,
  error,
  logRequest,
  logOpenAICall,
  logRunStatus
};