import Redis from 'ioredis';

class RedisService {
  private client: Redis | null = null;

  public connect(): void {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.warn('⚠️ REDIS_URL não definida, cache desabilitado');
      return;
    }
    this.client = new Redis(url);
    this.client.on('error', (err) => console.error('❌ Redis error:', err));
    this.client.on('connect', () => console.log('✅ Redis conectado'));
  }

  public async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      console.error('Redis GET error:', err);
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      console.error('Redis SET error:', err);
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis DEL error:', err);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

export const redisService = new RedisService();
