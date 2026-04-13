import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

export interface InstantButton {
    title: string;
    url: string;
    audioUrl?: string;
}

export class MyInstantsService {
    private readonly baseUrl = 'https://www.myinstants.com';

    /**
     * Searches for buttons on MyInstants and returns the top matches.
     */
    public async search(query: string): Promise<InstantButton[]> {
        try {
            const searchUrl = `${this.baseUrl}/search/?name=${encodeURIComponent(query)}`;
            const { data } = await axios.get(searchUrl);
            const $ = cheerio.load(data);
            const buttons: InstantButton[] = [];

            $('.instants .instant').each((_, element) => {
                const title = $(element).find('.instant-link').text().trim();
                const path = $(element).find('.instant-link').attr('href');
                const audioShortPath = $(element).find('button.small-button').attr('onclick');

                if (title && path && audioShortPath) {
                    // Extract partial path from playButton('path')
                    const match = audioShortPath.match(/playButton\('(.+)'\)/);
                    if (match) {
                        buttons.push({
                            title,
                            url: `${this.baseUrl}${path}`,
                            audioUrl: `${this.baseUrl}${match[1]}`
                        });
                    }
                }
            });

            return buttons.slice(0, 5);
        } catch (error) {
            logger.error('Error searching MyInstants:', error);
            return [];
        }
    }

    /**
     * Gets the audio URL for a specific button title (best match).
     */
    public async getBestMatchAudio(query: string): Promise<InstantButton | null> {
        const results = await this.search(query);
        return results.length > 0 ? results[0] : null;
    }
}

export const myInstantsService = new MyInstantsService();
