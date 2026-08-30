import type { DayPoint } from '../types';

function dayLabel(iso: string): string {
  return iso.slice(8, 10);
}

export function WorkoutCalendar({ days }: { days: DayPoint[] }) {
  return (
    <div className="workout-calendar">
      {days.map(d => (
        <div
          key={d.date}
          className={`workout-calendar__cell ${d.trained ? 'is-trained' : 'is-rest'}`}
          title={`${d.date}: ${d.trained ? 'treinou' : 'sem treino'}`}
        >
          {dayLabel(d.date)}
        </div>
      ))}
    </div>
  );
}
