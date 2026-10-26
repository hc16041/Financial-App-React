import { StyleSheet, Text, View } from 'react-native';
import { money } from '@financial/core';
import { radius, space, useTheme } from '@/theme/tokens';

export type KpiTone = 'in' | 'out' | 'warn' | 'neutral';

// La regla superior codifica el tono, igual que en la web: verde entra,
// rojo debe, cobre avisa.
export default function KpiCard({
  label, value, tone = 'neutral', hint,
}: { label: string; value: number; tone?: KpiTone; hint?: string }) {
  const { c } = useTheme();
  const top = tone === 'in' ? c.success : tone === 'out' ? c.danger : tone === 'warn' ? c.accent : c.border;

  return (
    <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border, borderTopColor: top }]}>
      <Text style={[s.label, { color: c.textMuted }]}>{label}</Text>
      <Text style={[s.value, { color: c.ink }]}>{money(value)}</Text>
      {hint ? <Text style={[s.hint, { color: c.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, minWidth: 140, borderWidth: 1, borderTopWidth: 3, borderRadius: radius.lg, padding: space[3] },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  value: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: space[1], letterSpacing: -0.5 },
  hint: { fontSize: 12, marginTop: 2 },
});
