import * as fs from 'fs';
import * as path from 'path';
import { workoutService } from '../src/services/workout.service';

const HISTORY_FILE = path.join(__dirname, '../data/workout-history.json');

describe('WorkoutService history detection', () => {
    const originalHistory = fs.existsSync(HISTORY_FILE) ? fs.readFileSync(HISTORY_FILE, 'utf8') : null;

    beforeEach(() => {
        const dataDir = path.dirname(HISTORY_FILE);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
    });

    afterAll(() => {
        if (originalHistory === null) {
            if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
            return;
        }

        fs.writeFileSync(HISTORY_FILE, originalHistory);
    });

    it('should save only one workout per user per day', () => {
        workoutService.logWorkout(123, true, 'eu treinei hoje');
        workoutService.logWorkout(123, true, 'eu treinei de novo');

        const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        expect(history).toHaveLength(1);
        expect(history[0].userMessage).toBe('eu treinei hoje');
        expect(history[0].brasiliaDate).toBeDefined();
    });

    it('should detect workout from history without checking telegram updates', async () => {
        workoutService.logWorkout(777, true, 'ta pago');

        const bot = {
            getUpdates: jest.fn().mockResolvedValue([]),
        } as any;

        const result = await workoutService.checkDailyMessages(bot);

        expect(result.trained).toBe(true);
        expect(bot.getUpdates).not.toHaveBeenCalled();
    });
});
