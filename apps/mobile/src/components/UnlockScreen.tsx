import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@financial/core';
import { authenticate, biometricsAvailable } from '@/lib/biometrics';
import { useLock } from '@/lib/lock';
import { radius, space, useTheme } from '@/theme/tokens';

// Pantalla de bloqueo: con el bloqueo activo no se muestra nada hasta
// autenticarse. "Usar contraseña" cierra la sesión y manda al login.
export default function UnlockScreen() {
  const { c } = useTheme();
  const unlock = useLock((s) => s.unlock);
  const logout = useAuth((s) => s.logout);
  const [trying, setTrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryUnlock = async () => {
    if (trying) return;
    setError(null);
    setTrying(true);
    try {
      if (!(await biometricsAvailable())) {
        setError('Este dispositivo no tiene biometría configurada.');
        return;
      }
      if (await authenticate('Desbloquea Libro mayor')) unlock();
    } finally {
      setTrying(false);
    }
  };

  // Se intenta solo al abrir: si falla, el usuario decide reintentar.
  useEffect(() => { void tryUnlock(); }, []);

  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <Text style={[s.brand, { color: c.ink }]}>Libro mayor</Text>
      <Text style={[s.hint, { color: c.textMuted }]}>Aplicación bloqueada</Text>

      {trying ? <ActivityIndicator color={c.primary} style={{ marginTop: space[4] }} /> : null}
      {error && <Text style={[s.error, { color: c.danger }]}>{error}</Text>}

      <Pressable
        onPress={() => void tryUnlock()}
        disabled={trying}
        accessibilityRole="button"
        accessibilityLabel="Desbloquear"
        style={[s.button, { backgroundColor: c.primary, marginTop: space[5] }]}
      >
        <Text style={s.buttonText}>Desbloquear</Text>
      </Pressable>

      <Pressable
        onPress={() => { logout(); unlock(); router.replace('/login'); }}
        accessibilityRole="button"
        accessibilityLabel="Usar contraseña"
        style={{ marginTop: space[3] }}
      >
        <Text style={{ color: c.textMuted, fontSize: 14 }}>Usar contraseña</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[5] },
  brand: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  hint: { fontSize: 14, marginTop: space[1] },
  error: { fontSize: 13, marginTop: space[3], textAlign: 'center' },
  button: { minHeight: 48, minWidth: 200, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
