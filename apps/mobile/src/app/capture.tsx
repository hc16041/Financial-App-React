import { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import {
  createAccount, createTx, listAccounts, listCategories,
  money, type Account, type Category,
} from '@financial/core';
import { todayIso } from '@/lib/date';
import { radius, space, useTheme } from '@/theme/tokens';

const MONEY = /^\d+(\.\d{1,2})?$/;

export default function CaptureScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });

  const [type, setType] = useState<1 | 2>(2);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newAccount, setNewAccount] = useState('');
  const [creating, setCreating] = useState(false);

  // La primera cuenta queda elegida: así registrar un gasto son dos toques
  // además de escribir el monto.
  const selectedAccount = accountId ?? accounts.data?.[0]?.id ?? null;

  const visibleCategories = useMemo(
    () => (categories.data ?? []).filter((k: Category) => k.isActive && k.type === type),
    [categories.data, type],
  );

  const save = useMutation({
    mutationFn: () =>
      createTx(
        {
          accountId: selectedAccount as number,
          categoryId,
          type,
          amount,
          date: todayIso(),
          note: note.trim(),
        },
        // Misma clave si el usuario toca Guardar dos veces: el backend no duplica.
        { idempotencyKey: Crypto.randomUUID() },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['tx'] });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
      setSaved(true);
      setTimeout(() => router.back(), 700);
    },
    onError: (e) => setError((e as Error)?.message ?? 'No se pudo guardar'),
  });

  const submit = () => {
    setError(null);
    if (!MONEY.test(amount.trim())) return setError('Monto inválido: usa hasta 2 decimales.');
    if (!selectedAccount) return setError('Necesitas al menos una cuenta.');
    save.mutate();
  };

  const disabled = save.isPending || !amount.trim() || !selectedAccount;

  const accountsReady = !accounts.isPending;
  const noAccounts = accountsReady && (accounts.data ?? []).length === 0;

  const addAccount = async (type: 1 | 2) => {
    const name = newAccount.trim();
    if (!name || creating) return;
    setError(null);
    setCreating(true);
    try {
      const created = (await createAccount({ name, type })) as Account;
      await accounts.refetch();
      if (created?.id) setAccountId(created.id);
      setNewAccount('');
    } catch (e) {
      setError((e as Error)?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.toggle}>
          {([2, 1] as const).map((t) => {
            const active = type === t;
            const color = t === 2 ? c.danger : c.success;
            return (
              <Pressable
                key={t}
                onPress={() => { setType(t); setCategoryId(null); }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t === 2 ? 'Gasto' : 'Ingreso'}
                style={[
                  s.toggleBtn,
                  { borderColor: active ? color : c.border, backgroundColor: active ? color : c.surface },
                ]}
              >
                <Text style={{ color: active ? '#fff' : c.ink, fontWeight: '600' }}>
                  {t === 2 ? 'Gasto' : 'Ingreso'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[s.label, { color: c.textMuted }]}>MONTO</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0.00"
          placeholderTextColor={c.textMuted}
          accessibilityLabel="Monto"
          autoFocus
          style={[s.amountInput, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.surface }]}
        />

        <Text style={[s.label, { color: c.textMuted }]}>CUENTA</Text>
        {noAccounts ? (
          <View style={[s.newAccount, { borderColor: c.borderStrong, backgroundColor: c.surface }]}>
            <Text style={[s.hint, { color: c.textMuted }]}>
              Necesitas una cuenta para registrar movimientos. Crea la primera:
            </Text>
            <TextInput
              value={newAccount}
              onChangeText={setNewAccount}
              placeholder="Efectivo, Cuenta de ahorro…"
              placeholderTextColor={c.textMuted}
              accessibilityLabel="Nombre de la cuenta"
              maxLength={100}
              style={[s.input, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.surface }]}
            />
            <View style={s.chips}>
              <Pressable
                onPress={() => void addAccount(1)}
                disabled={!newAccount.trim() || creating}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta de efectivo"
                style={[s.chip, { borderColor: c.primary, backgroundColor: newAccount.trim() ? c.primary : c.borderStrong }]}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>Efectivo</Text>
              </Pressable>
              <Pressable
                onPress={() => void addAccount(2)}
                disabled={!newAccount.trim() || creating}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta de banco"
                style={[s.chip, { borderColor: c.borderStrong, backgroundColor: c.surface }]}
              >
                <Text style={{ color: c.ink, fontSize: 14 }}>Banco</Text>
              </Pressable>
              {creating && <ActivityIndicator color={c.primary} />}
            </View>
          </View>
        ) : (
          <View style={s.chips}>
            {(accounts.data ?? []).map((a) => {
              const active = a.id === selectedAccount;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccountId(a.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={a.name}
                  style={[s.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.surface }]}
                >
                  <Text style={{ color: active ? '#fff' : c.ink, fontSize: 14 }}>
                    {a.name} · {money(a.balance)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[s.label, { color: c.textMuted }]}>CATEGORÍA (OPCIONAL)</Text>
        <View style={s.chips}>
          {visibleCategories.map((k) => {
            const active = k.id === categoryId;
            return (
              <Pressable
                key={k.id}
                onPress={() => setCategoryId(active ? null : k.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={k.name}
                style={[s.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.surface }]}
              >
                <Text style={{ color: active ? '#fff' : c.ink, fontSize: 14 }}>{k.name}</Text>
              </Pressable>
            );
          })}
          {visibleCategories.length === 0 && (
            <Text style={[s.hint, { color: c.textMuted }]}>
              No hay categorías de este tipo. Puedes guardar sin categoría.
            </Text>
          )}
        </View>

        <Text style={[s.label, { color: c.textMuted }]}>NOTA (OPCIONAL)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="supermercado, taxi…"
          placeholderTextColor={c.textMuted}
          accessibilityLabel="Nota"
          maxLength={200}
          style={[s.input, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.surface }]}
        />

        {error && <Text style={[s.error, { color: c.danger }]}>{error}</Text>}
        {saved && <Text style={[s.ok, { color: c.success }]}>Movimiento registrado.</Text>}

        <Pressable
          onPress={submit}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Guardar"
          style={({ pressed }) => [
            s.save,
            { backgroundColor: disabled ? c.borderStrong : c.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          {save.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveText}>Guardar</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[1], paddingBottom: space[5] },
  toggle: { flexDirection: 'row', gap: space[2], marginBottom: space[2] },
  toggleBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: space[3] },
  amountInput: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'], minHeight: 60,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 44 },
  newAccount: { borderWidth: 1, borderRadius: radius.md, padding: space[3], gap: space[2] },
  hint: { fontSize: 13 },
  error: { fontSize: 13, marginTop: space[3] },
  ok: { fontSize: 13, marginTop: space[3], fontWeight: '600' },
  save: { marginTop: space[4], minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
