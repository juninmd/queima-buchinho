import * as fs from 'fs/promises';
import * as path from 'path';

// Define the data structure
interface WorkoutData {
  [userId: string]: string; // userId -> date string
}

export class StorageService {
  private dataFile: string;
  private data: Map<number, string>;

  constructor(dataFilePath?: string) {
    // If running from src (ts-node), __dirname is src/services
    // If running from dist (node), __dirname is dist/services
    // In both cases, we want to go up two levels to reach the root, then into data
    this.dataFile = dataFilePath || path.join(__dirname, '../../data/workout-status.json');
    this.data = new Map();
  }

  /**
   * Loads data from the file system.
   * Only keeps data for the current day.
   */
  async load(): Promise<void> {
    try {
      // Check if file exists
      try {
        await fs.access(this.dataFile);
      } catch {
        // File does not exist, start with empty data
        this.data = new Map();
        return;
      }

      const fileContent = await fs.readFile(this.dataFile, 'utf8');
      const parsed: WorkoutData = JSON.parse(fileContent);
      const today = new Date().toDateString();

      this.data.clear();

      // Load only today's data
      Object.entries(parsed).forEach(([userId, date]) => {
        if (date === today) {
          this.data.set(Number(userId), date);
        }
      });

      console.log(`✅ Dados carregados: ${this.data.size} usuários`);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Initialize empty on error to keep running
      this.data = new Map();
    }
  }

  /**
   * Saves the current data to the file system.
   */
  async save(): Promise<void> {
    try {
      const dataDir = path.dirname(this.dataFile);

      // Ensure directory exists
      await fs.mkdir(dataDir, { recursive: true });

      const exportData: WorkoutData = {};
      this.data.forEach((date, userId) => {
        exportData[userId.toString()] = date;
      });

      await fs.writeFile(this.dataFile, JSON.stringify(exportData, null, 2), 'utf8');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  /**
   * Checks if a user has trained today.
   */
  hasTrainedToday(userId: number): boolean {
    const lastWorkoutDate = this.data.get(userId);
    const today = new Date().toDateString();
    return lastWorkoutDate === today;
  }

  /**
   * Marks a user as having trained today.
   */
  async markWorkout(userId: number): Promise<void> {
    const today = new Date().toDateString();
    this.data.set(userId, today);
    await this.save();
  }

  /**
   * Resets the workout status for a user.
   */
  async resetWorkout(userId: number): Promise<void> {
    this.data.delete(userId);
    await this.save();
  }
}
