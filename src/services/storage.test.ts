import { StorageService } from './storage';
import * as fs from 'fs';
import * as path from 'path';

const tempFile = path.join(__dirname, 'test-storage.json');

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(async () => {
    // Clean up before each test
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    storage = new StorageService(tempFile);
    // Initial load (empty file)
    await storage.load();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should save and load data', async () => {
    const userId = 123;
    await storage.markWorkout(userId);
    expect(storage.hasTrainedToday(userId)).toBe(true);

    // Create new instance to test persistence
    const storage2 = new StorageService(tempFile);
    await storage2.load();
    expect(storage2.hasTrainedToday(userId)).toBe(true);
  });

  it('should reset workout', async () => {
    const userId = 456;
    await storage.markWorkout(userId);
    expect(storage.hasTrainedToday(userId)).toBe(true);

    await storage.resetWorkout(userId);
    expect(storage.hasTrainedToday(userId)).toBe(false);
  });
});
