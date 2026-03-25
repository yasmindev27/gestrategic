/**
 * Centralized Logger for Production-Safe Error Handling
 * 
 * - Development: Logs to console
 * - Production: Sends to Sentry (or silent)
 * 
 * NEVER expose sensitive information in logs!
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  context?: string;
  data?: Record<string, any>;
  error?: Error;
  userId?: string;
  timestamp?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Debug logs - only in development
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context?.data || '');
    }
    // In production: silently drop debug logs
  }

  /**
   * Info logs - only in development
   */
  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context?.data || '');
    }
  }

  /**
   * Warn logs - always capture, but different handling
   */
  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context?.data || '');
    }

    if (this.isProduction) {
      // In production: send to monitoring service (e.g., Sentry)
      this.captureWarning(message, context);
    }
  }

  /**
   * Error logs - CRITICAL
   * Always captured, never expose sensitive data
   */
  error(message: string, context?: LogContext) {
    const sanitizedContext = this.sanitizeContext(context);

    if (this.isDevelopment) {
      console.error(
        `[ERROR] ${message}`,
        sanitizedContext?.data,
        context?.error
      );
    }

    if (this.isProduction) {
      // In production: send to monitoring service
      this.captureError(message, sanitizedContext);
    }
  }

  /**
   * Remove sensitive data before logging
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized: LogContext = {
      context: context.context,
      timestamp: context.timestamp,
    };

    // Keep only safe data fields
    if (context.data) {
      sanitized.data = {
        ...context.data,
        // Remove any fields that might contain PII
        cpf: context.data.cpf ? '[REDACTED]' : undefined,
        email: context.data.email ? '[REDACTED]' : undefined,
        phone: context.data.phone ? '[REDACTED]' : undefined,
        password: context.data.password ? '[REDACTED]' : undefined,
        token: context.data.token ? '[REDACTED]' : undefined,
      };
    }

    // Only include error message, not full stack in production
    if (context.error && this.isProduction) {
      sanitized.error = {
        message: context.error.message,
        name: context.error.name,
        // Never include stack trace in production
      };
    }

    return sanitized;
  }

  /**
   * Send warning to monitoring service
   * TODO: Implement with Sentry or similar
   */
  private captureWarning(message: string, context?: LogContext) {
    // TODO: Integrate with Sentry
    // Sentry.captureMessage(message, 'warning');
  }

  /**
   * Send error to monitoring service
   * TODO: Implement with Sentry or similar
   */
  private captureError(message: string, context?: LogContext) {
    // TODO: Integrate with Sentry
    // Sentry.captureException(new Error(message), { contexts: { custom: context } });
  }
}

export const logger = new Logger();
