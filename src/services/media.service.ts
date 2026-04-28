import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1';

export interface GiphyResult {
    id: string;
    title: string;
    url: string;
    preview: string;
}

export type MediaCategory =
    | 'celebration'
    | 'workout'
    | 'motivation'
    | 'meme'
    | 'water'
    | 'morning'
    | 'roast'
    | 'cardio'
    | 'trophy'
    | 'fail'
    | 'happy'
    | 'fire';

const CATEGORY_SEARCH_TERMS: Record<MediaCategory, string[]> = {
    celebration: ['celebration dance', 'party dance', 'firework'],
    workout: ['gym workout', 'fitness motivation', ' lifting weights'],
    motivation: ['fitness motivation', 'workout hard', 'gym life'],
    meme: ['funny meme', 'LOL funny', 'laughing hard'],
    water: ['drinking water', 'water hydrate', 'water bottle'],
    morning: ['good morning fitness', 'morning workout motivation', 'sunrise gym'],
    roast: ['fail meme', 'crying meme', 'you tried'],
    cardio: ['running excited', 'cardio workout', 'jumping jack'],
    trophy: ['trophy winner', 'champion', 'gold medal'],
    fail: ['epic fail', 'facepalm', 'wrong choice'],
    happy: ['happy dance', 'smile', 'thumbs up'],
    fire: ['fire flames', 'on fire', 'lit']
};

const LOCAL_STICKERS: Record<MediaCategory, string[]> = {
    celebration: ['celebration.gif', 'party.gif'],
    workout: ['flex.gif', 'gym.gif'],
    motivation: ['lets_go.gif', 'pump_up.gif'],
    meme: ['lol.gif', 'laugh.gif'],
    water: ['water_drop.gif'],
    morning: ['sun.gif', 'coffee.gif'],
    roast: ['bruh.gif', 'facepalm.gif', 'disappointed.gif'],
    cardio: ['running.gif', 'cardio.gif'],
    trophy: ['trophy.gif', 'winner.gif'],
    fail: ['fail.gif', 'wrong.gif'],
    happy: ['happy.gif', 'thumbs_up.gif'],
    fire: ['fire.gif']
};

const LOCAL_IMAGES: Record<MediaCategory, string[]> = {
    celebration: ['celebration.jpg'],
    workout: ['workout_motivation.jpg'],
    motivation: ['fitness_meme.jpg'],
    meme: ['funny_meme.jpg'],
    water: ['hydrate.jpg'],
    morning: ['morning_motivation.jpg'],
    roast: ['roast_meme.jpg'],
    cardio: ['cardio.jpg'],
    trophy: ['trophy.jpg'],
    fail: ['fail_meme.jpg'],
    happy: ['happy.jpg'],
    fire: ['fire_motivation.jpg']
};

export class MediaService {
    private assetsPath: string;
    private stickersPath: string;
    private imagesPath: string;
    private cache: Map<string, { url: string; timestamp: number }> = new Map();
    private readonly CACHE_TTL_MS = 10 * 60 * 1000;

    constructor() {
        this.assetsPath = path.join(__dirname, '../../../assets');
        this.stickersPath = path.join(this.assetsPath, 'stickers');
        this.imagesPath = path.join(this.assetsPath, 'images');
        this.ensureDirectories();
    }

    private ensureDirectories() {
        if (!fs.existsSync(this.stickersPath)) {
            fs.mkdirSync(this.stickersPath, { recursive: true });
        }
        if (!fs.existsSync(this.imagesPath)) {
            fs.mkdirSync(this.imagesPath, { recursive: true });
        }
    }

    public async searchGifs(query: string, limit = 5): Promise<GiphyResult[]> {
        try {
            const { data } = await axios.get(`${GIPHY_BASE_URL}/gifs/search`, {
                params: {
                    api_key: GIPHY_API_KEY,
                    q: query,
                    limit,
                    rating: 'pg-13'
                },
                timeout: 5000
            });

            const results: GiphyResult[] = (data.data || []).map((gif: any) => ({
                id: gif.id,
                title: gif.title || 'GIF',
                url: gif.images?.original?.url || gif.url,
                preview: gif.images?.fixed_height?.url || gif.url
            }));

            logger.info(`[MediaService] Found ${results.length} GIFs for query: "${query}"`);
            return results;
        } catch (error) {
            logger.error('[MediaService] Giphy API error:', error);
            return [];
        }
    }

    public async searchStickers(query: string, limit = 5): Promise<GiphyResult[]> {
        try {
            const { data } = await axios.get(`${GIPHY_BASE_URL}/stickers/search`, {
                params: {
                    api_key: GIPHY_API_KEY,
                    q: query,
                    limit,
                    rating: 'pg-13'
                },
                timeout: 5000
            });

            const results: GiphyResult[] = (data.data || []).map((sticker: any) => ({
                id: sticker.id,
                title: sticker.title || 'Sticker',
                url: sticker.images?.original?.url || sticker.url,
                preview: sticker.images?.fixed_height?.url || sticker.url
            }));

            logger.info(`[MediaService] Found ${results.length} stickers for query: "${query}"`);
            return results;
        } catch (error) {
            logger.error('[MediaService] Giphy Sticker API error:', error);
            return [];
        }
    }

    public async getRandomGif(category: MediaCategory): Promise<string | null> {
        const cacheKey = `gif_${category}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            logger.info(`[MediaService] Using cached GIF for category: ${category}`);
            return cached.url;
        }

        const searchTerms = CATEGORY_SEARCH_TERMS[category];
        const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

        const results = await this.searchGifs(randomTerm, 10);
        if (results.length === 0) {
            return this.getLocalGif(category);
        }

        const randomResult = results[Math.floor(Math.random() * results.length)];
        this.cache.set(cacheKey, { url: randomResult.url, timestamp: Date.now() });

        return randomResult.url;
    }

    public async getRandomSticker(category: MediaCategory): Promise<string | null> {
        const cacheKey = `sticker_${category}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            logger.info(`[MediaService] Using cached sticker for category: ${category}`);
            return cached.url;
        }

        const searchTerms = CATEGORY_SEARCH_TERMS[category];
        const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

        const results = await this.searchStickers(randomTerm, 10);
        if (results.length === 0) {
            return this.getLocalSticker(category);
        }

        const randomResult = results[Math.floor(Math.random() * results.length)];
        this.cache.set(cacheKey, { url: randomResult.url, timestamp: Date.now() });

        return randomResult.url;
    }

    public getLocalSticker(category: MediaCategory): string | null {
        const stickers = LOCAL_STICKERS[category];
        if (!stickers || stickers.length === 0) return null;

        const sticker = stickers[Math.floor(Math.random() * stickers.length)];
        const stickerPath = path.join(this.stickersPath, sticker);

        if (fs.existsSync(stickerPath)) {
            return stickerPath;
        }

        const gifPath = sticker.replace('.gif', '.webp');
        const webpPath = path.join(this.stickersPath, gifPath);
        if (fs.existsSync(webpPath)) {
            return webpPath;
        }

        return null;
    }

    public getLocalImage(category: MediaCategory): string | null {
        const images = LOCAL_IMAGES[category];
        if (!images || images.length === 0) return null;

        const image = images[Math.floor(Math.random() * images.length)];
        const imagePath = path.join(this.imagesPath, image);

        if (fs.existsSync(imagePath)) {
            return imagePath;
        }

        for (const ext of ['.jpg', '.jpeg', '.png', '.gif', '.webp']) {
            const altPath = path.join(this.imagesPath, image.replace(/\.[^.]+$/, '') + ext);
            if (fs.existsSync(altPath)) {
                return altPath;
            }
        }

        return null;
    }

    public async sendGif(category: MediaCategory): Promise<string | null> {
        const gifUrl = await this.getRandomGif(category);
        if (gifUrl) {
            logger.info(`[MediaService] Sending GIF for category: ${category}`);
        }
        return gifUrl;
    }

    public async sendSticker(category: MediaCategory): Promise<string | null> {
        const stickerUrl = await this.getRandomSticker(category);
        if (stickerUrl) {
            logger.info(`[MediaService] Sending sticker for category: ${category}`);
        }
        return stickerUrl;
    }

    public getLocalGif(category: MediaCategory): string | null {
        return this.getLocalSticker(category);
    }

    public clearCache() {
        this.cache.clear();
        logger.info('[MediaService] Cache cleared');
    }
}

export const mediaService = new MediaService();
