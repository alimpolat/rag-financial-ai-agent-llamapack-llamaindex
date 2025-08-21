// Enhanced error handling utilities for the RAG application
import { logger } from './logger';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  FILE_UPLOAD = 'FILE_UPLOAD',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
}

export interface AppError extends Error {
  type: ErrorType;
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;
  userMessage?: string;
}

export class BaseError extends Error implements AppError {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly userMessage?: string;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    userMessage?: string,
    context?: Record<string, any>
  ) {
    super(message);

    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Please log in to continue.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorType.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please try again later.';
      case ErrorType.FILE_UPLOAD:
        return 'There was a problem with your file upload.';
      case ErrorType.EXTERNAL_SERVICE:
        return 'An external service is currently unavailable. Please try again later.';
      case ErrorType.NETWORK:
        return 'Network error. Please check your connection and try again.';
      case ErrorType.TIMEOUT:
        return 'The request took too long to complete. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Specific error classes
export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, any>, userMessage?: string) {
    super(message, ErrorType.VALIDATION, 400, true, userMessage, context);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.AUTHENTICATION, 401, true, undefined, context);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.AUTHORIZATION, 403, true, undefined, context);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.NOT_FOUND, 404, true, undefined, context);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.RATE_LIMIT, 429, true, undefined, context);
  }
}

export class FileUploadError extends BaseError {
  constructor(message: string, context?: Record<string, any>, userMessage?: string) {
    super(message, ErrorType.FILE_UPLOAD, 400, true, userMessage, context);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.EXTERNAL_SERVICE, 502, true, undefined, context);
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.NETWORK, 503, true, undefined, context);
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.TIMEOUT, 504, true, undefined, context);
  }
}

// Error handling utilities
export function isAppError(error: any): error is AppError {
  return (
    error instanceof BaseError || (error && typeof error.type === 'string' && typeof error.statusCode === 'number')
  );
}

export function handleApiError(error: unknown, component: string = 'api'): Response {
  const log = logger.child(component);

  if (isAppError(error)) {
    log.warn(`${error.type} error: ${error.message}`, error.context);
    return new Response(
      JSON.stringify({
        error: error.userMessage || error.message,
        type: error.type,
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  log.error('Unhandled error', error as Error);

  return new Response(
    JSON.stringify({
      error: 'An unexpected error occurred. Please try again.',
      type: ErrorType.INTERNAL_SERVER,
      ...(process.env.NODE_ENV === 'development' && { details: message }),
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Client-side error handling
export class ClientErrorHandler {
  private static instance: ClientErrorHandler;
  private errorQueue: AppError[] = [];
  private maxQueueSize = 50;

  static getInstance(): ClientErrorHandler {
    if (!ClientErrorHandler.instance) {
      ClientErrorHandler.instance = new ClientErrorHandler();
    }
    return ClientErrorHandler.instance;
  }

  handleError(error: unknown, context?: Record<string, any>): void {
    const appError = this.normalizeError(error, context);
    this.addToQueue(appError);
    this.logError(appError);
    this.notifyUser(appError);
  }

  private normalizeError(error: unknown, context?: Record<string, any>): AppError {
    if (isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new BaseError(error.message, ErrorType.INTERNAL_SERVER, 500, true, undefined, context);
    }

    return new BaseError('An unexpected error occurred', ErrorType.INTERNAL_SERVER, 500, true, undefined, {
      originalError: error,
      ...context,
    });
  }

  private addToQueue(error: AppError): void {
    this.errorQueue.push(error);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private logError(error: AppError): void {
    logger.error(`Client error: ${error.message}`, error, error.context);
  }

  private notifyUser(error: AppError): void {
    // In a real application, you might want to show a toast notification
    // or update a global error state instead of using alert
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('Application Error:', error.userMessage || error.message);
    }
  }

  getRecentErrors(): AppError[] {
    return [...this.errorQueue];
  }

  clearErrors(): void {
    this.errorQueue = [];
  }
}

// React error boundary utility
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
}

export function createErrorBoundaryState(): ErrorBoundaryState {
  return { hasError: false };
}

export function handleErrorBoundary(error: Error, errorInfo: any): ErrorBoundaryState {
  const appError = new BaseError(
    error.message,
    ErrorType.INTERNAL_SERVER,
    500,
    false,
    'Something went wrong. Please refresh the page and try again.',
    { stack: error.stack, componentStack: errorInfo.componentStack }
  );

  ClientErrorHandler.getInstance().handleError(appError);

  return {
    hasError: true,
    error: appError,
  };
}

// Async operation wrapper with error handling
export async function withErrorHandling<T>(operation: () => Promise<T>, context?: Record<string, any>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    ClientErrorHandler.getInstance().handleError(error, context);
    throw error;
  }
}

// Retry utility with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on certain error types
      if (
        isAppError(error) &&
        [ErrorType.VALIDATION, ErrorType.AUTHENTICATION, ErrorType.AUTHORIZATION, ErrorType.NOT_FOUND].includes(
          error.type
        )
      ) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

export const errorHandler = ClientErrorHandler.getInstance();
