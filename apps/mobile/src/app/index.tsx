import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getBalance, normBalance, money, useAuth } from '@financial/core';
import { radius, space, useTheme } from '@/theme/tokens';

export default function HomeScreen() {
  const { c } = useTheme();
  const token = useAuth((s) => s.token);
  const logout = useAuth((s) => s.logout);

  const balance = useQuery({
    queryKey: ['savings', 'balance'],
    queryFn: getBalance,
    enabled: Boolean(token),
  });

  if (!token) return <Redirect href="/login" />;

  const total = balance.data === undefined ? null : normBalance(balance.data);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={balance.isFetching}
          onRefresh={() => { void balance.refetch(); }}
          tintColor={c.textMuted}
        />
      }
    >
      <Text style={[s.section, { color: c.textMuted }]}>AHORROS</Text>

      <View style={[s.strip, { backgroundColor: c.surface, borderColor: c.border, borderTopColor: c.accent }]}>
        {balance.isPending
          ? <ActivityIndicator color={c.primary} />
          : balance.isError
            ? <Text style={[s.error, { color: c.danger }]}>No se pudo cargar el saldo.</Text>
            : <Text style={[s.total, { color: c.ink }]}>{money(total ?? 0)}</Text>}
        <Text style={[s.stripHint, { color: c.textMuted }]}>Saldo actual</Text>
      </View>

      {balance.isError && (
        <Pressable
          onPress={() => balance.refetch()}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={[s.button, { borderColor: c.borderStrong, backgroundColor: c.surface }]}
        >
          <Text style={{ color: c.ink, fontWeight: '600' }}>Reintentar</Text>
        </Pressable>
      )}

      <Text style={[s.note, { color: c.textMuted }]}>
        Fase 1: solo lectura del saldo. La captura rápida y los demás módulos
        llegan en las próximas fases.
      </Text>

      <Pressable
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Salir"
        style={[s.button, { borderColor: c.borderStrong, backgroundColor: c.surface }]}
      >
        <Text style={{ color: c.danger, fontWeight: '600' }}>Salir</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[3] },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  strip: { borderWidth: 1, borderTopWidth: 3, borderRadius: radius.lg, padding: space[4] },
  total: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  stripHint: { fontSize: 13, marginTop: space[1] },
  error: { fontSize: 14 },
  note: { fontSize: 13, lineHeight: 19 },
  button: {
    minHeight: 44, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
