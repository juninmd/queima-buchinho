import axios from 'axios';
import { myInstantsService } from '../../src/services/myinstants.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MyInstantsService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should search and return buttons', async () => {
        const mockHtml = `
            <div class="instants">
                <div class="instant">
                    <a class="instant-link" href="/instant/test-1/">Test 1</a>
                    <button class="small-button" onclick="playButton('/media/sounds/test1.mp3')"></button>
                </div>
                <div class="instant">
                    <a class="instant-link" href="/instant/test-2/">Test 2</a>
                    <button class="small-button" onclick="playButton('/media/sounds/test2.mp3')"></button>
                </div>
            </div>
        `;
        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const results = await myInstantsService.search('test');

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({
            title: 'Test 1',
            url: 'https://www.myinstants.com/instant/test-1/',
            audioUrl: 'https://www.myinstants.com/media/sounds/test1.mp3'
        });
        expect(results[1]).toEqual({
            title: 'Test 2',
            url: 'https://www.myinstants.com/instant/test-2/',
            audioUrl: 'https://www.myinstants.com/media/sounds/test2.mp3'
        });
    });

    it('should return empty array on axios error', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const results = await myInstantsService.search('test');

        expect(results).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('Error searching MyInstants:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should return best match', async () => {
        const mockHtml = `
            <div class="instants">
                <div class="instant">
                    <a class="instant-link" href="/instant/best/">Best Match</a>
                    <button class="small-button" onclick="playButton('/media/sounds/best.mp3')"></button>
                </div>
            </div>
        `;
        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const result = await myInstantsService.getBestMatchAudio('best');

        expect(result).toEqual({
            title: 'Best Match',
            url: 'https://www.myinstants.com/instant/best/',
            audioUrl: 'https://www.myinstants.com/media/sounds/best.mp3'
        });
    });

    it('should return null if no matches found', async () => {
        mockedAxios.get.mockResolvedValue({ data: '<div class="instants"></div>' });

        const result = await myInstantsService.getBestMatchAudio('nothing');

        expect(result).toBeNull();
    });

    it('should handle missing fields in HTML', async () => {
        const mockHtml = `
            <div class="instants">
                <div class="instant">
                    <!-- Missing link and button -->
                </div>
                <div class="instant">
                    <a class="instant-link" href="/instant/partial/">Partial</a>
                    <!-- Missing button -->
                </div>
            </div>
        `;
        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const results = await myInstantsService.search('partial');

        expect(results).toHaveLength(0);
    });
});
