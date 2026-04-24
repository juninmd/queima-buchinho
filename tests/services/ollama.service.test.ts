import { generateObject } from 'ai';
import { ollamaService } from '../../src/services/ollama.service';

jest.mock('ai');
jest.mock('ai-sdk-ollama', () => ({
    createOllama: jest.fn(() => jest.fn(() => ({ modelId: 'mock-model' })))
}));

describe('OllamaService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate dynamic response successfully', async () => {
        const mockResponse = {
            object: {
                message: "Test message",
                audioSearchTerm: "test audio"
            }
        };
        (generateObject as jest.Mock).mockResolvedValue(mockResponse);

        const result = await ollamaService.generateDynamicResponse('test prompt');

        expect(result).toEqual({
            message: "Test message",
            audioSearchTerm: "test audio"
        });
        expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
            model: expect.anything(),
            schema: expect.anything()
        }));
    });

    it('should handle ollama chat error', async () => {
        (generateObject as jest.Mock).mockRejectedValue(new Error('Ollama error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await ollamaService.generateDynamicResponse('test prompt');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ [AI SDK] Erro na geração:'), 'Ollama error');
        consoleSpy.mockRestore();
    });

    it('should call generateDynamicResponse for dynamic roast', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'roast', audioSearchTerm: 'roast' });
        await ollamaService.getDynamicRoast();
        expect(spy).toHaveBeenCalledWith(expect.any(String));
    });

    it('should call generateDynamicResponse for dynamic congrats', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'congrats', audioSearchTerm: 'congrats' });
        await ollamaService.getDynamicCongrats();
        expect(spy).toHaveBeenCalledWith(expect.any(String));
    });

    it('should call generateDynamicResponse for morning reminder', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'morning', audioSearchTerm: 'morning' });
        await ollamaService.getMorningReminder('Segunda-feira');
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Segunda-feira'));
    });

    it('should call generateDynamicResponse for conditional reminder', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'conditional', audioSearchTerm: 'conditional' });
        await ollamaService.getConditionalReminder('15:00');
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('15:00'));
    });

    it('should call generateDynamicResponse for water reminder', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'water', audioSearchTerm: 'water' });
        await ollamaService.getWaterReminder();
        expect(spy).toHaveBeenCalledWith(expect.any(String));
    });

    it('should call generateDynamicResponse for food reminder', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'food', audioSearchTerm: 'food' });
        await ollamaService.getFoodReminder('cafe');
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('café da manhã'));
    });

    it('should call generateDynamicResponse for water success', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'water success', audioSearchTerm: 'water success' });
        await ollamaService.getWaterSuccess(2000);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('2000ml'));
    });

    it('should call generateDynamicResponse for weight update', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'weight', audioSearchTerm: 'weight' });
        await ollamaService.getWeightUpdate(80, -2);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('80kg'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('perdeu 2kg'));
    });

    it('should call generateDynamicResponse for weight update (gain)', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'weight', audioSearchTerm: 'weight' });
        await ollamaService.getWeightUpdate(80, 2);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('ganhou 2kg'));
    });

    it('should call generateDynamicResponse for weekly report', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'report', audioSearchTerm: 'report' });
        await ollamaService.getWeeklyReport({
            current: { workouts: 3, metrics: { water: 2000 } },
            previous: { metrics: { water: 1500 } }
        });
        expect(spy).toHaveBeenCalledWith(expect.any(String));
    });

    it('should call generateDynamicResponse for habit response', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'habit', audioSearchTerm: 'habit' });
        await ollamaService.getHabitResponse('treino');
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('treino'));
    });

    it('should call generateDynamicResponse for habits check reminder', async () => {
        const spy = jest.spyOn(ollamaService, 'generateDynamicResponse').mockResolvedValue({ message: 'check', audioSearchTerm: 'check' });
        await ollamaService.getHabitsCheckReminder(['leitura', 'água']);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('leitura, água'));
    });
});
