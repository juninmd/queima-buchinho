interface Props<T extends string | number> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

export function Seg<T extends string | number>({ value, options, onChange, label }: Props<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
