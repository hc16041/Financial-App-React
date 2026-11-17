import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MAINTENANCES } from '@/maintenance/configs';
import { radius, space, useTheme } from '@/theme/tokens';

// Índice de mantenimientos: cada catálogo es una fila que abre el CRUD genérico.
export default function MaintenanceIndex() {
  const { c } = useTheme();

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.content}>
      <Text style={[s.intro, { color: c.textMuted }]}>
        Los catálogos que alimentan la app. Toca uno para listar, crear, editar o borrar.
      </Text>

      <View style={[s.list, { backgroundColor: c.surface, borderColor: c.border }]}>
        {MAINTENANCES.map((m, i) => (
          <Pressable
            key={m.slug}
            onPress={() => router.push({ pathname: '/maintenance/[slug]', params: { slug: m.slug } })}
            accessibilityRole="button"
            accessibilityLabel={m.title}
            style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: c.ink }]}>{m.title}</Text>
              <Text style={[s.desc, { color: c.textMuted }]} numberOfLines={2}>{m.description}</Text>
            </View>
            <Text style={{ color: c.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: space[4], gap: space[2] },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: space[2] },
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[3] },
  title: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 2 },
});
