import Redis from 'ioredis';
import { redisService } from '../../src/services/redis.service';

jest.mock('ioredis');

describe('RedisService', () => {
    let mockRedisInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.REDIS_URL = 'redis://localhost:6379';
        mockRedisInstance = {
            on: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            quit: jest.fn().mockResolvedValue('OK'),
        };
        (Redis as unknown as jest.Mock).mockReturnValue(mockRedisInstance);
    });

    afterEach(async () => {
        await redisService.disconnect();
        delete process.env.REDIS_URL;
    });

    it('should not connect if REDIS_URL is not defined', () => {
        delete process.env.REDIS_URL;
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        redisService.connect();
        expect(consoleSpy).toHaveBeenCalledWith('⚠️ REDIS_URL não definida, cache desabilitado');
        consoleSpy.mockRestore();
    });

    it('should connect and register event listeners', () => {
        redisService.connect();
        expect(Redis).toHaveBeenCalledWith('redis://localhost:6379');
        expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should log errors and connection', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        
        redisService.connect();
        
        const errorCallback = mockRedisInstance.on.mock.calls.find((call: any) => call[0] === 'error')[1];
        const connectCallback = mockRedisInstance.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
        
        errorCallback(new Error('test error'));
        connectCallback();
        
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Redis error:', expect.any(Error));
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Redis conectado');
        
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    it('should return null on get if not connected', async () => {
        // Force client to null by not calling connect
        const result = await redisService.get('key');
        expect(result).toBeNull();
    });

    it('should get value if connected', async () => {
        redisService.connect();
        mockRedisInstance.get.mockResolvedValue('value');
        const result = await redisService.get('key');
        expect(result).toBe('value');
        expect(mockRedisInstance.get).toHaveBeenCalledWith('key');
    });

    it('should handle get error', async () => {
        redisService.connect();
        mockRedisInstance.get.mockRejectedValue(new Error('get error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const result = await redisService.get('key');
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Redis GET error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should set value without TTL', async () => {
        redisService.connect();
        await redisService.set('key', 'value');
        expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set value with TTL', async () => {
        redisService.connect();
        await redisService.set('key', 'value', 10);
        expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value', 'EX', 10);
    });

    it('should handle set error', async () => {
        redisService.connect();
        mockRedisInstance.set.mockRejectedValue(new Error('set error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        await redisService.set('key', 'value');
        expect(consoleSpy).toHaveBeenCalledWith('Redis SET error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should delete key', async () => {
        redisService.connect();
        await redisService.del('key');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('key');
    });

    it('should handle del error', async () => {
        redisService.connect();
        mockRedisInstance.del.mockRejectedValue(new Error('del error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        await redisService.del('key');
        expect(consoleSpy).toHaveBeenCalledWith('Redis DEL error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should do nothing on set/del if not connected', async () => {
        await redisService.set('key', 'value');
        await redisService.del('key');
        expect(mockRedisInstance.set).not.toHaveBeenCalled();
        expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
});
