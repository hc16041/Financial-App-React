import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteTx, listAccounts, listTx, money, type PersonalTx } from '@financial/core';
import { shortDate } from '@/lib/date';
import { radius, space, useTheme } from '@/theme/tokens';

type Period = 'month' | 'prev' | 'all';

const inPeriod = (iso: string, period: Period): boolean => {
  if (period === 'all') return true;
  const d = new Date(iso);
  const now = new Date();
  const target = period === 'month'
    ? { y: now.getFullYear(), m: now.getMonth() }
    : { y: new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear(), m: new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() };
  return d.getFullYear() === target.y && d.getMonth() === target.m;
};

export default function MovementsScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>('month');
  const [accountId, setAccountId] = useState<number | 'all'>('all');

  const tx = useQuery({ queryKey: ['tx', 'all'], queryFn: () => listTx({}) });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });

  const remove = useMutation({
    mutationFn: deleteTx,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tx'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const items = useMemo(() => {
    return (tx.data ?? [])
      .filter((t) => inPeriod(t.date, period))
      .filter((t) => accountId === 'all' || t.accountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [tx.data, period, accountId]);

  const confirmDelete = (t: PersonalTx) => {
    Alert.alert(
      'Borrar movimiento',
      `Se eliminará ${money(t.amount)} y se ajustará el saldo de la cuenta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () =>
            remove.mutate(t.id, {
              onError: (e) => Alert.alert('No se pudo borrar', (e as Error)?.message ?? ''),
            }),
        },
      ],
    );
  };

  const refresh = () => { void tx.refetch(); void accounts.refetch(); };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={tx.isFetching} onRefresh={refresh} tintColor={c.textMuted} />}
    >
      <View style={s.chips}>
        {([['month', 'Este mes'], ['prev', 'Mes anterior'], ['all', 'Todo']] as const).map(([k, label]) => {
          const active = period === k;
          return (
            <Pressable
              key={k}
              onPress={() => setPeriod(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={[s.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.surface }]}
            >
              <Text style={{ color: active ? '#fff' : c.ink, fontSize: 13 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.chips}>
        <Pressable
          onPress={() => setAccountId('all')}
          accessibilityRole="button"
          accessibilityState={{ selected: accountId === 'all' }}
          accessibilityLabel="Todas las cuentas"
          style={[s.chip, { borderColor: accountId === 'all' ? c.accent : c.border, backgroundColor: accountId === 'all' ? c.accent : c.surface }]}
        >
          <Text style={{ color: accountId === 'all' ? '#fff' : c.ink, fontSize: 13 }}>Todas</Text>
        </Pressable>
        {(accounts.data ?? []).map((a) => {
          const active = accountId === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => setAccountId(a.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={a.name}
              style={[s.chip, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : c.surface }]}
            >
              <Text style={{ color: active ? '#fff' : c.ink, fontSize: 13 }}>{a.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {tx.isPending ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: space[4] }} />
      ) : tx.isError ? (
        <>
          <Text style={[s.error, { color: c.danger }]}>No se pudieron cargar los movimientos.</Text>
          <Pressable
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
            style={[s.retry, { borderColor: c.borderStrong, backgroundColor: c.surface }]}
          >
            <Text style={{ color: c.ink, fontWeight: '600' }}>Reintentar</Text>
          </Pressable>
        </>
      ) : items.length === 0 ? (
        <Text style={[s.empty, { color: c.textMuted }]}>
          Sin movimientos en este filtro. Cambia el período o registra uno con el botón +.
        </Text>
      ) : (
        <>
          <Text style={[s.hint, { color: c.textMuted }]}>
            Toca para editar, mantén presionado para borrar.
          </Text>
          <View style={[s.list, { backgroundColor: c.surface, borderColor: c.border }]}>
            {items.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/capture', params: { id: String(t.id) } })}
                onLongPress={() => confirmDelete(t)}
                accessibilityRole="button"
                accessibilityLabel={`${t.note || 'Movimiento'} ${money(t.amount)}`}
                style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
              >
                <View style={s.rowMain}>
                  <Text style={[s.rowTitle, { color: c.ink }]} numberOfLines={1}>
                    {t.note || (t.type === 1 ? 'Ingreso' : 'Gasto')}
                  </Text>
                  <Text style={[s.rowSub, { color: c.textMuted }]}>
                    {shortDate(t.date)}{t.accountName ? ` · ${t.accountName}` : ''}
                  </Text>
                </View>
                <Text style={[s.rowAmount, { color: t.type === 1 ? c.success : c.danger }]}>
                  {t.type === 1 ? '+' : '−'}{money(t.amount)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Pressable
        onPress={() => router.push('/capture')}
        accessibilityRole="button"
        accessibilityLabel="Nuevo movimiento"
        style={[s.retry, { marginTop: space[4], backgroundColor: c.primary, borderColor: c.primary }]}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Nuevo movimiento</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, minHeight: 34, justifyContent: 'center' },
  hint: { fontSize: 12, marginTop: space[2] },
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], paddingVertical: space[3], gap: space[2] },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 1 },
  rowAmount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, lineHeight: 19, marginTop: space[3] },
  error: { fontSize: 14 },
  retry: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
