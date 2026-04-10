import { workoutService } from '../src/services/workout.service';

jest.mock('pg', () => {
    const query = jest.fn();
    return { Pool: jest.fn(() => ({ query })) };
});

import { Pool } from 'pg';
const mockQuery = (new (Pool as any)()).query as jest.Mock;

beforeEach(() => mockQuery.mockReset());

describe('WorkoutService', () => {
    it('logWorkout insere registro no banco', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await workoutService.logWorkout(123, true, 'eu treinei hoje');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO workout_logs'),
            expect.arrayContaining([123, true])
        );
    });

    it('logWorkout usa ON CONFLICT para evitar duplicatas', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await workoutService.logWorkout(123, true, 'eu treinei');
        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toContain('ON CONFLICT');
    });

    it('resetWorkout deleta registro do dia', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await workoutService.resetWorkout(123);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM workout_logs'),
            expect.arrayContaining([123])
        );
    });
});
