import { useQuery } from '@tanstack/react-query';
import { listCategories, type Category } from '@financial/core';

// Selector de categorías activas con fallback "legado" (SPEC-09 §6).
export default function CategorySelect({ value, onChange, name, allowLegacy }: {
  value: string; onChange: (v: string) => void; name?: string; allowLegacy?: string;
}) {
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const active = ((cats.data ?? []) as Category[]).filter((c) => c.isActive);
  const legacy = value && !active.some((c) => c.name === value) ? value : null;

  return (
    <select value={value} name={name} onChange={(e) => onChange(e.target.value)} disabled={cats.isPending}>
      {allowLegacy && legacy && <option value={legacy}>{allowLegacy}: {legacy}</option>}
      {active.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
    </select>
  );
}
