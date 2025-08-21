// Enhanced logging utility for the RAG application
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private component: string;

  constructor(component: string, logLevel: LogLevel = LogLevel.INFO) {
    this.component = component;
    this.logLevel = logLevel;
  }

  private formatLog(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
    duration?: number
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      component: this.component,
      message,
      metadata,
      duration,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private output(logEntry: LogEntry): void {
    if (typeof window !== 'undefined') {
      // Browser environment
      const style = this.getConsoleStyle(logEntry.level);
      console.log(`%c[${logEntry.level}] ${logEntry.component}: ${logEntry.message}`, style, logEntry.metadata || '');
    } else {
      // Node.js environment
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }

  private getConsoleStyle(level: string): string {
    switch (level) {
      case 'DEBUG':
        return 'color: #888; font-size: 11px;';
      case 'INFO':
        return 'color: #2196F3; font-weight: bold;';
      case 'WARN':
        return 'color: #FF9800; font-weight: bold;';
      case 'ERROR':
        return 'color: #F44336; font-weight: bold; background: #ffebee; padding: 2px 4px;';
      default:
        return '';
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog(LogLevel.DEBUG, message, metadata));
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog(LogLevel.INFO, message, metadata));
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog(LogLevel.WARN, message, metadata));
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog(LogLevel.ERROR, message, metadata, error));
    }
  }

  // Performance timing utility
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration: `${duration}ms` });
    };
  }

  // Async operation wrapper with timing
  async timed<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      this.info(`${label} completed successfully`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, error as Error, { duration: `${duration}ms` });
      throw error;
    }
  }

  // Request logging utility
  logRequest(method: string, path: string, ip?: string, userAgent?: string): void {
    this.info(`${method} ${path}`, {
      ip: ip || 'unknown',
      userAgent: userAgent || 'unknown',
    });
  }

  // Response logging utility
  logResponse(method: string, path: string, status: number, duration: number, size?: number): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${path} - ${status}`;

    if (level === LogLevel.WARN) {
      this.warn(message, { status, duration: `${duration}ms`, size });
    } else {
      this.info(message, { status, duration: `${duration}ms`, size });
    }
  }

  // Create child logger with additional context
  child(childComponent: string): Logger {
    return new Logger(`${this.component}:${childComponent}`, this.logLevel);
  }
}

// Factory function to create loggers
export function createLogger(component: string): Logger {
  const logLevelEnv = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
  const logLevel = LogLevel[logLevelEnv as keyof typeof LogLevel] ?? LogLevel.INFO;
  return new Logger(component, logLevel);
}

// Default logger instances
export const logger = createLogger('app');
export const apiLogger = createLogger('api');
export const uploadLogger = createLogger('upload');
export const chatLogger = createLogger('chat');
export const ragLogger = createLogger('rag');

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  static getMetricStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  static getAllMetrics(): Record<string, ReturnType<typeof PerformanceMonitor.getMetricStats>> {
    const result: Record<string, any> = {};
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }
    return result;
  }

  static logMetricsSummary(): void {
    const metrics = this.getAllMetrics();
    logger.info('Performance metrics summary', metrics);
  }
}

// Middleware helper for API route logging
export function withLogging<T extends (...args: any[]) => any>(handler: T, component: string): T {
  const log = createLogger(component);

  return (async (...args: Parameters<T>) => {
    const start = Date.now();
    try {
      const result = await handler(...args);
      const duration = Date.now() - start;
      PerformanceMonitor.recordMetric(`${component}_duration`, duration);
      log.info('Handler completed', { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      log.error('Handler failed', error as Error, { duration: `${duration}ms` });
      throw error;
    }
  }) as T;
}
