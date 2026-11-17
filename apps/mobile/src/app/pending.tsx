import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { shortDate } from '@/lib/date';
import { radius, space, useTheme } from '@/theme/tokens';

// Los envíos que el servidor rechazó no se reintentan solos: reintentar un 409
// en bucle no arregla nada. Aquí el usuario ve qué pasó y decide.
export default function PendingScreen() {
  const { c } = useTheme();
  const queue = useOfflineQueue();

  const confirmDiscard = (key: string, label: string) => {
    Alert.alert('Descartar envío', `Se perderá "${label}" sin registrarse.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => void queue.discard(key) },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.content}>
      {queue.items.length === 0 ? (
        <Text style={[s.empty, { color: c.textMuted }]}>
          No hay envíos pendientes. Todo está sincronizado.
        </Text>
      ) : (
        <>
          <Text style={[s.hint, { color: c.textMuted }]}>
            {queue.pending} por enviar · {queue.failed} con error
          </Text>

          <View style={[s.list, { backgroundColor: c.surface, borderColor: c.border }]}>
            {queue.items.map((item, i) => (
              <View
                key={item.key}
                style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
              >
                <View style={s.rowMain}>
                  <Text style={[s.title, { color: c.ink }]} numberOfLines={1}>{item.label}</Text>
                  <Text style={[s.sub, { color: c.textMuted }]}>
                    {shortDate(item.createdAt)} · intentos: {item.attempts}
                  </Text>
                  {item.failed && (
                    <Text style={[s.error, { color: c.danger }]} numberOfLines={2}>{item.failed}</Text>
                  )}
                </View>
                {item.failed ? (
                  <Pressable
                    onPress={() => confirmDiscard(item.key, item.label)}
                    accessibilityRole="button"
                    accessibilityLabel={`Descartar ${item.label}`}
                    hitSlop={8}
                  >
                    <Text style={{ color: c.danger, fontSize: 13, fontWeight: '600' }}>Descartar</Text>
                  </Pressable>
                ) : (
                  <Text style={[s.badge, { color: c.accent }]}>pendiente</Text>
                )}
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => void queue.sync()}
            disabled={queue.syncing}
            accessibilityRole="button"
            accessibilityLabel="Reintentar envíos"
            style={[s.button, { backgroundColor: c.primary, borderColor: c.primary }]}
          >
            {queue.syncing
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '600' }}>Reintentar ahora</Text>}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[2] },
  hint: { fontSize: 13 },
  empty: { fontSize: 14, lineHeight: 20 },
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[3] },
  rowMain: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500' },
  sub: { fontSize: 12, marginTop: 1 },
  error: { fontSize: 12, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '600' },
  button: { marginTop: space[3], minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
