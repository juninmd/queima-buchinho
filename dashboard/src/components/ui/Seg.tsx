import { Tabs } from '@juninmd/sonido';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

/** Controle segmentado do app. Teclado, foco e ARIA de tablist vêm do `Tabs` do Sonido. */
export function Seg<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <Tabs
      label={label}
      variant="pill"
      value={value}
      onChange={onChange}
      items={options.map(o => ({ key: o.value, label: o.label }))}
      className="seg-sonido"
    />
  );
}
