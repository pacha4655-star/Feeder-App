/**
 * Structured Production Monitoring & Audit Logger for Feeder.life
 * Redacts sensitive fields (passwords, tokens, keys) before writing logs.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

interface LogPayload {
  message: string;
  level?: LogLevel;
  context?: Record<string, any>;
  error?: any;
}

const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'secret',
  'token',
  'idToken',
  'service_role',
  'supabase_service_role_key',
  'private_key',
  'client_email',
  'api_key',
  'feeder_session',
]);

function sanitizeLogContext(obj: any, depth = 0): any {
  if (depth > 5 || !obj) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogContext(item, depth + 1));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeLogContext(value, depth + 1);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function logEvent({ message, level = 'INFO', context = {}, error }: LogPayload): void {
  const timestamp = new Date().toISOString();
  const safeContext = sanitizeLogContext(context);
  const logObj = {
    timestamp,
    level,
    message,
    context: safeContext,
    error: error instanceof Error ? { name: error.name, message: error.message } : error,
  };

  const output = JSON.stringify(logObj);

  switch (level) {
    case 'ERROR':
    case 'SECURITY':
      console.error(output);
      break;
    case 'WARN':
      console.warn(output);
      break;
    default:
      console.log(output);
      break;
  }
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => logEvent({ message, level: 'INFO', context }),
  warn: (message: string, context?: Record<string, any>) => logEvent({ message, level: 'WARN', context }),
  error: (message: string, error?: any, context?: Record<string, any>) =>
    logEvent({ message, level: 'ERROR', error, context }),
  security: (message: string, context?: Record<string, any>) =>
    logEvent({ message, level: 'SECURITY', context }),
};

export default logger;
