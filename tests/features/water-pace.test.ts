import { getBrasiliaHour, isBehindWaterPace, waterTargetAt } from '../../src/features/reminders/water-pace';

describe('water pace', () => {
  it('ramps the target from 0 at 07h to the full goal at 19h', () => {
    expect(waterTargetAt(6, 2000)).toBe(0);
    expect(waterTargetAt(7, 2000)).toBe(0);
    expect(waterTargetAt(13, 2000)).toBe(1000);
    expect(waterTargetAt(19, 2000)).toBe(2000);
    expect(waterTargetAt(23, 2000)).toBe(2000);
  });

  it('only nags when behind the pace for the hour', () => {
    expect(isBehindWaterPace(400, 9, 2000)).toBe(false); // meta 333ml às 9h
    expect(isBehindWaterPace(300, 9, 2000)).toBe(true);
    expect(isBehindWaterPace(2000, 17, 2000)).toBe(false);
    expect(isBehindWaterPace(0, 7, 2000)).toBe(false);
  });

  it('reads the hour in Brasília, not UTC', () => {
    expect(getBrasiliaHour(new Date('2026-09-26T02:30:00Z'))).toBe(23);
    expect(getBrasiliaHour(new Date('2026-09-26T03:00:00Z'))).toBe(0);
  });
});
