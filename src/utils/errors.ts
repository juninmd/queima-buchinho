export class BotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class DatabaseError extends BotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', context);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends BotError {
  constructor(service: string, message: string, context?: Record<string, unknown>) {
    super(`[${service}] ${message}`, 'EXTERNAL_SERVICE_ERROR', context);
    this.name = 'ExternalServiceError';
  }
}

export class RedisError extends BotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'REDIS_ERROR', context);
    this.name = 'RedisError';
  }
}

export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(String(e));
}
