import { useState } from 'react';

// Monto decimal como string (contrato decimal(18,2)): solo dígitos y
// hasta 2 decimales mientras se escribe; el valor siempre es string.
export default function MoneyInput({ value, onChange, name, placeholder }: {
  value: string; onChange: (v: string) => void; name?: string; placeholder?: string;
}) {
  const [raw, setRaw] = useState(value);
  const clean = (v: string) => {
    const s = v.replace(/[^0-9.]/g, '');
    const [i, ...rest] = s.split('.');
    return rest.length ? `${i}.${rest.join('').slice(0, 2)}` : i;
  };
  return (
    <input
      value={raw} name={name} placeholder={placeholder ?? '0.00'} inputMode="decimal"
      onChange={(e) => { const v = clean(e.target.value); setRaw(v); onChange(v); }}
      onBlur={() => { if (raw && !Number.isNaN(Number(raw))) { const v = Number(raw).toFixed(2); setRaw(v); onChange(v); } }}
    />
  );
}
