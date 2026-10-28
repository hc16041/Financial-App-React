import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@financial/core';
import { findMaintenance, rowSummary } from '@/maintenance/configs';
import type { MaintenanceField } from '@/maintenance/types';
import { radius, space, useTheme } from '@/theme/tokens';

export default function MaintenanceScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const config = findMaintenance(String(slug));

  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const list = useQuery({
    queryKey: ['maint', config?.slug],
    queryFn: () => config!.fetch(),
    enabled: Boolean(config),
  });

  // Opciones de los selectores que dependen de otra consulta.
  const optionsQueries = (config?.fields ?? []).map((f) => ({
    key: f.key,
    query: useQuery({
      queryKey: ['maint-opts', config?.slug, f.key],
      queryFn: () => f.loadOptions!(),
      enabled: Boolean(f.loadOptions) && showForm,
    }),
  }));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['maint', config?.slug] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    void qc.invalidateQueries({ queryKey: ['accounts'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const clean: Record<string, string> = {};
      for (const f of config!.fields) clean[f.key] = (values[f.key] ?? '').trim();
      return editingId === null
        ? config!.create?.(clean)
        : config!.update?.(editingId, clean);
    },
    onSuccess: () => { invalidate(); close(); },
    onError: (e) => setError((e as Error)?.message ?? 'No se pudo guardar'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => config!.remove!(id),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('No se pudo borrar', (e as Error)?.message ?? ''),
  });

  if (!config) {
    return <Text style={[s.empty, { color: c.textMuted }]}>Mantenimiento desconocido.</Text>;
  }

  const close = () => { setShowForm(false); setEditingId(null); setValues({}); setError(null); };

  const openCreate = () => {
    const initial: Record<string, string> = {};
    for (const f of config.fields) initial[f.key] = f.options?.[0]?.value ?? '';
    setValues(initial);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    const initial: Record<string, string> = {};
    for (const f of config.fields) {
      const raw = row[f.key];
      initial[f.key] = raw === null || raw === undefined ? '' : String(raw);
    }
    setValues(initial);
    setEditingId(Number(row.id));
    setShowForm(true);
  };

  const submit = () => {
    setError(null);
    const missing = config.fields.find((f) => f.required && !(values[f.key] ?? '').trim());
    if (missing) return setError(`${missing.label} es obligatorio.`);
    save.mutate();
  };

  const rows = (list.data ?? []).filter((r) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return config.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(needle));
  });

  const optionsFor = (field: MaintenanceField): Array<{ value: string; label: string }> => {
    if (field.options) return field.options;
    const found = optionsQueries.find((q) => q.key === field.key);
    return (found?.query.data ?? []) as Array<{ value: string; label: string }>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: config.title }} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={[s.desc, { color: c.textMuted }]}>{config.description}</Text>

        <View style={s.toolbar}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar…"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Buscar"
            style={[s.search, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.surface }]}
          />
          {config.create && (
            <Pressable
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel={`Crear ${config.title}`}
              style={[s.newBtn, { backgroundColor: c.primary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>+ Nuevo</Text>
            </Pressable>
          )}
        </View>

        {list.isPending ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: space[4] }} />
        ) : list.isError ? (
          <>
            <Text style={[s.error, { color: c.danger }]}>No se pudo cargar.</Text>
            <Pressable
              onPress={() => list.refetch()}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
              style={[s.btn, { borderColor: c.borderStrong, backgroundColor: c.surface }]}
            >
              <Text style={{ color: c.ink, fontWeight: '600' }}>Reintentar</Text>
            </Pressable>
          </>
        ) : rows.length === 0 ? (
          <Text style={[s.empty, { color: c.textMuted }]}>
            Sin registros. {config.create ? 'Usa + Nuevo para agregar el primero.' : ''}
          </Text>
        ) : (
          <>
            <Text style={[s.hint, { color: c.textMuted }]}>Toca para editar{config.remove ? ', mantén presionado para borrar' : ''}.</Text>
            <View style={[s.list, { backgroundColor: c.surface, borderColor: c.border }]}>
              {rows.map((row, i) => (
                <Pressable
                  key={String(row.id)}
                  onPress={() => openEdit(row)}
                  onLongPress={() => {
                    if (!config.remove) return;
                    Alert.alert('Borrar registro', 'Esta acción no se puede deshacer.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate(Number(row.id)) },
                    ]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={String(row[config.columns[0].key] ?? 'registro')}
                  style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, { color: c.ink }]} numberOfLines={1}>
                      {String(row[config.columns[0].key] ?? '—')}
                    </Text>
                    <Text style={[s.rowSub, { color: c.textMuted }]} numberOfLines={1}>
                      {rowSummary(config, row)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {showForm && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.sheet}
        >
          <View style={[s.sheetBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.sheetTitle, { color: c.ink }]}>
              {editingId === null ? `Nuevo · ${config.title}` : 'Editar'}
            </Text>
            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {config.fields.map((f) => (
                <View key={f.key} style={{ marginTop: space[2] }}>
                  <Text style={[s.label, { color: c.textMuted }]}>{f.label}</Text>

                  {f.kind === 'select' ? (
                    <View style={s.chips}>
                      {optionsFor(f).map((o) => {
                        const active = (values[f.key] ?? '') === o.value;
                        return (
                          <Pressable
                            key={o.value}
                            onPress={() => setValues((v) => ({ ...v, [f.key]: o.value }))}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={o.label}
                            style={[s.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.bg }]}
                          >
                            <Text style={{ color: active ? '#fff' : c.ink, fontSize: 13 }}>{o.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : f.kind === 'checkbox' ? (
                    <Switch
                      value={(values[f.key] ?? '') === '1'}
                      onValueChange={(on) => setValues((v) => ({ ...v, [f.key]: on ? '1' : '0' }))}
                      accessibilityLabel={f.label}
                    />
                  ) : (
                    <TextInput
                      value={values[f.key] ?? ''}
                      onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={c.textMuted}
                      accessibilityLabel={f.label}
                      keyboardType={f.kind === 'money' ? 'decimal-pad' : f.kind === 'number' ? 'number-pad' : 'default'}
                      style={[s.input, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.bg }]}
                    />
                  )}
                </View>
              ))}
            </ScrollView>

            {error && <Text style={[s.error, { color: c.danger }]}>{error}</Text>}

            <View style={s.actions}>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cancelar" style={[s.btn, { borderColor: c.borderStrong, backgroundColor: c.surface }]}>
                <Text style={{ color: c.ink, fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={save.isPending}
                accessibilityRole="button"
                accessibilityLabel="Guardar"
                style={[s.btn, { backgroundColor: c.primary, borderColor: c.primary }]}
              >
                {save.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '600' }}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[2] },
  desc: { fontSize: 13, lineHeight: 19 },
  toolbar: { flexDirection: 'row', gap: space[2], alignItems: 'center', marginTop: space[2] },
  search: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, minHeight: 42 },
  newBtn: { minHeight: 42, paddingHorizontal: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, marginTop: space[2] },
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], paddingVertical: space[3] },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 2 },
  empty: { fontSize: 13, lineHeight: 19, marginTop: space[3] },
  error: { fontSize: 13, marginTop: space[2] },
  btn: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetBox: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, padding: space[4], paddingBottom: space[5] },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, minHeight: 42 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, minHeight: 34, justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2], marginTop: space[4] },
});
