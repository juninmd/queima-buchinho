import { getBrasiliaDateString, getBrasiliaDayStart, formatBrasiliaTime, getSurpriseMessage, isTodayBirthday, getBirthdayAge, getMikaContext } from '../../src/utils/time';

describe('Time Utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getBrasiliaDateString', () => {
    it('should return yesterday if current hour is between 00:00 and 03:59 (BRT)', () => {
      // Mock Date to be 2023-10-27T02:00:00-03:00 (which is 05:00 UTC)
      const mockDate = new Date('2023-10-27T05:00:00Z');
      jest.setSystemTime(mockDate);

      // 02:00 BRT -> should return 2023-10-26
      expect(getBrasiliaDateString()).toBe('2023-10-26');
    });

    it('should return today if current hour is 04:00 or later (BRT)', () => {
      // Mock Date to be 2023-10-27T04:00:00-03:00 (which is 07:00 UTC)
      const mockDate = new Date('2023-10-27T07:00:00Z');
      jest.setSystemTime(mockDate);

      // 04:00 BRT -> should return 2023-10-27
      expect(getBrasiliaDateString()).toBe('2023-10-27');
    });
  });

  describe('getBrasiliaDayStart', () => {
    it('should return a Date object for 00:00:00 BRT of the current (or adjusted) day', () => {
      const mockDate = new Date('2023-10-27T07:00:00Z'); // 04:00 BRT
      jest.setSystemTime(mockDate);

      const dayStart = getBrasiliaDayStart();
      expect(dayStart.toISOString()).toBe(new Date('2023-10-27T03:00:00Z').toISOString()); // 00:00 BRT is 03:00 UTC
    });
  });

  describe('formatBrasiliaTime', () => {
    it('should return formatted time HH:mm', () => {
      const mockDate = new Date('2023-10-27T15:30:00Z'); // 12:30 BRT
      jest.setSystemTime(mockDate);

      // Depending on environment, pt-BR might use different separators or spaces
      // but we expect something like "12:30"
      expect(formatBrasiliaTime()).toMatch(/^\d{2}:\d{2}$/);
      expect(formatBrasiliaTime()).toBe('12:30');
    });
  });

  describe('getSurpriseMessage', () => {
    const testCases = [
      { hour: 7, expected: "🌅 Acorda pra cuspir, bora treinar!" },
      { hour: 10, expected: "🐓 O sol já nasceu lá na fazendinha..." },
      { hour: 13, expected: "🥗 Hora do almoço, mas foca na dieta!" },
      { hour: 15, expected: "💪 Ainda dá tempo de pagar o treino!" },
      { hour: 20, expected: "🌙 Sem desculpas, a noite é uma criança (musculosa)!" },
      { hour: 3, expected: "💤 Vá dormir, o músculo cresce no descanso!" },
    ];

    testCases.forEach(({ hour, expected }) => {
      it(`should return correct message for hour ${hour}`, () => {
        // hour is BRT. 07:00 BRT is 10:00 UTC
        const utcHour = (hour + 3) % 24;
        const mockDate = new Date(`2023-10-27T${utcHour.toString().padStart(2, '0')}:00:00Z`);
        jest.setSystemTime(mockDate);

        expect(getSurpriseMessage()).toBe(expected);
      });
    });
  });

  // Birthday is a calendar fact: the 00:00-03:59 "reporting day" rule is for workout records only.
  describe('birthday uses the calendar date in Brasília', () => {
    const saved = process.env.USER_BIRTHDAY;
    afterEach(() => { process.env.USER_BIRTHDAY = saved; });

    it('is the birthday at 01:00 on the day itself', () => {
      process.env.USER_BIRTHDAY = '22/11';
      jest.setSystemTime(new Date('2026-11-22T01:00:00-03:00'));
      expect(isTodayBirthday()).toBe(true);
      expect(getMikaContext()).toContain('ANIVERSÁRIO');
    });

    it('is no longer the birthday at 01:00 on the next day', () => {
      process.env.USER_BIRTHDAY = '22/11';
      jest.setSystemTime(new Date('2026-11-23T01:00:00-03:00'));
      expect(isTodayBirthday()).toBe(false);
    });

    it('counts the new age from midnight on 1 January', () => {
      process.env.USER_BIRTHDAY = '01/01/1990';
      jest.setSystemTime(new Date('2027-01-01T02:00:00-03:00'));
      expect(getBirthdayAge()).toBe(37);
    });
  });
});
