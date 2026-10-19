import { create } from 'zustand';

export type ToastKind = 'ok' | 'error';
type Toast = { id: number; kind: ToastKind; message: string };

let seq = 0;
// Cola de avisos global. Fuera de React se usa useToasts.getState().push(...)
// (por ejemplo desde el MutationCache de React Query, que cubre todas las mutaciones).
export const useToasts = create<{ items: Toast[]; push: (kind: ToastKind, message: string) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (kind, message) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
