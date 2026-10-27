import { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary, listBudgets, listTx, listLoans, listCards,
  money, useAuth, type PersonalTx, type DashboardSummary,
} from '@financial/core';
import KpiCard from '@/components/KpiCard';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useCachedQuery } from '@/hooks/useCachedList';
import { authenticate, biometricsAvailable } from '@/lib/biometrics';
import { useLock } from '@/lib/lock';
import { rescheduleReminders } from '@/lib/notifications';
import { shortDate } from '@/lib/date';
import { radius, space, useTheme } from '@/theme/tokens';

export default function HomeScreen() {
  const { c } = useTheme();
  const token = useAuth((s) => s.token);
  const queue = useOfflineQueue();
  const lockEnabled = useLock((s) => s.enabled);
  const enableLock = useLock((s) => s.enable);
  const disableLock = useLock((s) => s.disable);

  const summary = useCachedQuery<DashboardSummary>('dashboard', ['dashboard'], getDashboardSummary, {
    enabled: Boolean(token),
  });
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: listBudgets, enabled: Boolean(token) });
  const tx = useQuery({ queryKey: ['tx', 'recent'], queryFn: () => listTx({}), enabled: Boolean(token) });

  // Recordatorios locales de cuota y vencimiento. Se recalculan al abrir la app,
  // así reflejan el estado más reciente sin depender de un servidor de push.
  const loans = useQuery({ queryKey: ['loans', 'reminders'], queryFn: listLoans, enabled: Boolean(token) });
  const cards = useQuery({ queryKey: ['cards', 'reminders'], queryFn: listCards, enabled: Boolean(token) });

  useEffect(() => {
    if (!loans.data || !cards.data) return;
    void rescheduleReminders(loans.data, cards.data).catch(() => {});
  }, [loans.data, cards.data]);

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

  const data = summary.value;
  const loading = summary.isPending && !data;
  const failed = summary.isError && !data;
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
        {queue.pending + queue.failed > 0 && (
          <Pressable
            onPress={() => router.push('/pending')}
            accessibilityRole="button"
            accessibilityLabel="Ver envíos pendientes"
            style={[s.banner, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
          >
            <Text style={[s.bannerText, { color: c.ink }]}>
              {queue.pending} sin enviar{queue.failed > 0 ? ` · ${queue.failed} con error` : ''}
            </Text>
            <Text style={[s.link, { color: c.primary }]}>
              {queue.syncing ? 'Enviando…' : 'Ver'}
            </Text>
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: space[5] }} />
        ) : failed || !data ? (
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
              <KpiCard label="Ahorros" value={data.savings} tone="in" />
              <KpiCard label="Deuda tarjetas" value={data.cardDebt} tone="out" />
            </View>
            <View style={s.grid}>
              <KpiCard label="Deuda préstamos" value={data.loanDebt} tone="out" />
              <KpiCard
                label="Presupuesto del mes"
                value={budgetSpent}
                tone={budgetLimit > 0 && budgetSpent > budgetLimit ? 'out' : 'warn'}
                hint={budgetLimit > 0 ? `de ${money(budgetLimit)}` : 'sin presupuestos'}
              />
            </View>

            <View style={[s.balance, { backgroundColor: c.surface, borderColor: c.border, borderTopColor: c.accent }]}>
              <Text style={[s.balanceLabel, { color: c.textMuted }]}>BALANCE TOTAL</Text>
              <Text style={[s.balanceValue, { color: c.ink }]}>{money(data.totalBalance)}</Text>
              <Text style={[s.balanceHint, { color: c.textMuted }]}>
                ahorros + inversiones − deudas
              </Text>
            </View>

            <View style={s.sectionRow}>
              <Text style={[s.section, { color: c.textMuted }]}>ÚLTIMOS MOVIMIENTOS</Text>
              <Pressable
                onPress={() => router.push('/movements')}
                accessibilityRole="button"
                accessibilityLabel="Ver todos los movimientos"
                hitSlop={8}
              >
                <Text style={[s.link, { color: c.primary }]}>Ver todos</Text>
              </Pressable>
            </View>
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

        <View style={[s.setting, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingTitle, { color: c.ink }]}>Bloqueo biométrico</Text>
            <Text style={[s.settingHint, { color: c.textMuted }]}>
              Pide huella o rostro al abrir la app
            </Text>
          </View>
          <Switch
            value={lockEnabled}
            accessibilityLabel="Bloqueo biométrico"
            onValueChange={(next) => {
              void (async () => {
                if (!next) return disableLock();
                if (!(await biometricsAvailable())) {
                  Alert.alert('Sin biometría', 'Configura huella o rostro en el teléfono primero.');
                  return;
                }
                if (await authenticate('Confirma tu identidad para activar el bloqueo')) {
                  await enableLock();
                }
              })();
            }}
          />
        </View>

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
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[3] },
  link: { fontSize: 13, fontWeight: '600' },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[2],
    marginBottom: space[2],
  },
  bannerText: { fontSize: 13, fontWeight: '500' },
  setting: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderWidth: 1, borderRadius: radius.lg, padding: space[3], marginTop: space[3],
  },
  settingTitle: { fontSize: 15, fontWeight: '500' },
  settingHint: { fontSize: 12, marginTop: 1 },
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
