import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary, listBudgets, listTx,
  money, useAuth, type PersonalTx,
} from '@financial/core';
import KpiCard from '@/components/KpiCard';
import { shortDate } from '@/lib/date';
import { radius, space, useTheme } from '@/theme/tokens';

export default function HomeScreen() {
  const { c } = useTheme();
  const token = useAuth((s) => s.token);

  const summary = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardSummary,
    enabled: Boolean(token),
  });
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: listBudgets, enabled: Boolean(token) });
  const tx = useQuery({ queryKey: ['tx', 'recent'], queryFn: () => listTx({}), enabled: Boolean(token) });

  if (!token) return <Redirect href="/login" />;

  const now = new Date();
  const monthBudgets = (budgets.data ?? []).filter(
    (b) => b.month === now.getMonth() + 1 && b.year === now.getFullYear(),
  );
  const budgetLimit = monthBudgets.reduce((a, b) => a + Number(b.limit), 0);
  const budgetSpent = monthBudgets.reduce((a, b) => a + Number(b.spent), 0);

  const recent = [...(tx.data ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const loading = summary.isPending;
  const failed = summary.isError;
  const refresh = () => {
    void summary.refetch();
    void budgets.refetch();
    void tx.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={summary.isFetching} onRefresh={refresh} tintColor={c.textMuted} />
        }
      >
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: space[5] }} />
        ) : failed ? (
          <>
            <Text style={[s.error, { color: c.danger }]}>No se pudo cargar el resumen.</Text>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
              style={[s.retry, { borderColor: c.borderStrong, backgroundColor: c.surface }]}
            >
              <Text style={{ color: c.ink, fontWeight: '600' }}>Reintentar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[s.section, { color: c.textMuted }]}>SALDOS</Text>
            <View style={s.grid}>
              <KpiCard label="Ahorros" value={summary.data.savings} tone="in" />
              <KpiCard label="Deuda tarjetas" value={summary.data.cardDebt} tone="out" />
            </View>
            <View style={s.grid}>
              <KpiCard label="Deuda préstamos" value={summary.data.loanDebt} tone="out" />
              <KpiCard
                label="Presupuesto del mes"
                value={budgetSpent}
                tone={budgetLimit > 0 && budgetSpent > budgetLimit ? 'out' : 'warn'}
                hint={budgetLimit > 0 ? `de ${money(budgetLimit)}` : 'sin presupuestos'}
              />
            </View>

            <View style={[s.balance, { backgroundColor: c.surface, borderColor: c.border, borderTopColor: c.accent }]}>
              <Text style={[s.balanceLabel, { color: c.textMuted }]}>BALANCE TOTAL</Text>
              <Text style={[s.balanceValue, { color: c.ink }]}>{money(summary.data.totalBalance)}</Text>
              <Text style={[s.balanceHint, { color: c.textMuted }]}>
                ahorros + inversiones − deudas
              </Text>
            </View>

            <Text style={[s.section, { color: c.textMuted }]}>ÚLTIMOS MOVIMIENTOS</Text>
            {tx.isPending ? (
              <ActivityIndicator color={c.primary} />
            ) : recent.length === 0 ? (
              <Text style={[s.empty, { color: c.textMuted }]}>
                Sin movimientos todavía. Usa el botón + para registrar el primero.
              </Text>
            ) : (
              <View style={[s.list, { backgroundColor: c.surface, borderColor: c.border }]}>
                {recent.map((t: PersonalTx, i) => (
                  <View
                    key={t.id}
                    style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
                  >
                    <View style={s.rowMain}>
                      <Text style={[s.rowTitle, { color: c.ink }]} numberOfLines={1}>
                        {t.note || (t.type === 1 ? 'Ingreso' : 'Gasto')}
                      </Text>
                      <Text style={[s.rowSub, { color: c.textMuted }]}>{shortDate(t.date)}</Text>
                    </View>
                    <Text
                      style={[
                        s.rowAmount,
                        { color: t.type === 1 ? c.success : c.danger },
                      ]}
                    >
                      {t.type === 1 ? '+' : '−'}{money(t.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Pressable
          onPress={() => useAuth.getState().logout()}
          accessibilityRole="button"
          accessibilityLabel="Salir"
          style={[s.retry, { borderColor: c.borderStrong, backgroundColor: c.surface, marginTop: space[2] }]}
        >
          <Text style={{ color: c.danger, fontWeight: '600' }}>Salir</Text>
        </Pressable>
      </ScrollView>

      <Pressable
        onPress={() => router.push('/capture')}
        accessibilityRole="button"
        accessibilityLabel="Registrar movimiento"
        style={({ pressed }) => [s.fab, { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 }]}
      >
        <Text style={s.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[2], paddingBottom: 100 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: space[3] },
  grid: { flexDirection: 'row', gap: space[2] },
  balance: { borderWidth: 1, borderTopWidth: 3, borderRadius: radius.lg, padding: space[4], marginTop: space[2] },
  balanceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  balanceValue: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1, marginTop: 2 },
  balanceHint: { fontSize: 12, marginTop: 2 },
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], paddingVertical: space[3], gap: space[2] },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 1 },
  rowAmount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, lineHeight: 19 },
  error: { fontSize: 14 },
  retry: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', right: space[4], bottom: space[5], width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabPlus: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '600' },
});
