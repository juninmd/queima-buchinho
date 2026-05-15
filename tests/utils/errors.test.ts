import { BotError, DatabaseError, ExternalServiceError, RedisError, toError } from '../../src/utils/errors';

describe('BotError hierarchy', () => {
    it('BotError sets name, code and message', () => {
        const err = new BotError('msg', 'CODE', { foo: 1 });
        expect(err.name).toBe('BotError');
        expect(err.code).toBe('CODE');
        expect(err.message).toBe('msg');
        expect(err.context).toEqual({ foo: 1 });
        expect(err instanceof Error).toBe(true);
    });

    it('DatabaseError has correct name and code', () => {
        const err = new DatabaseError('db fail');
        expect(err.name).toBe('DatabaseError');
        expect(err.code).toBe('DATABASE_ERROR');
        expect(err instanceof BotError).toBe(true);
    });

    it('ExternalServiceError prefixes service name', () => {
        const err = new ExternalServiceError('OpenRouter', 'timeout');
        expect(err.name).toBe('ExternalServiceError');
        expect(err.message).toBe('[OpenRouter] timeout');
        expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('RedisError has correct name and code', () => {
        const err = new RedisError('connection lost');
        expect(err.name).toBe('RedisError');
        expect(err.code).toBe('REDIS_ERROR');
    });
});

describe('toError', () => {
    it('returns Error as-is', () => {
        const original = new Error('original');
        expect(toError(original)).toBe(original);
    });

    it('wraps string in Error', () => {
        const result = toError('something bad');
        expect(result instanceof Error).toBe(true);
        expect(result.message).toBe('something bad');
    });

    it('wraps unknown object in Error', () => {
        const result = toError({ code: 42 });
        expect(result instanceof Error).toBe(true);
    });
});
