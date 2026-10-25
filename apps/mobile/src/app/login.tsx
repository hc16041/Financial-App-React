import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@financial/core';
import { radius, space, useTheme } from '@/theme/tokens';

export default function LoginScreen() {
  const { c } = useTheme();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (e) {
      setError((e as Error)?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || !email.trim() || !password;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.screen, { backgroundColor: c.bg }]}
    >
      <View style={s.center}>
        <Text style={[s.brand, { color: c.ink }]}>Libro mayor</Text>
        <Text style={[s.hint, { color: c.textMuted }]}>Finanzas personales</Text>

        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[s.label, { color: c.textMuted }]}>Correo</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="correo"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Correo"
            style={[s.input, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.surface }]}
          />

          <Text style={[s.label, { color: c.textMuted }]}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="contraseña"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Contraseña"
            onSubmitEditing={submit}
            style={[s.input, { color: c.ink, borderColor: c.borderStrong, backgroundColor: c.surface }]}
          />

          {error && <Text style={[s.error, { color: c.danger }]}>{error}</Text>}

          <Pressable
            onPress={submit}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            style={({ pressed }) => [
              s.button,
              { backgroundColor: disabled ? c.borderStrong : c.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.buttonText}>Entrar</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: space[4] },
  brand: { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  hint: { fontSize: 14, textAlign: 'center', marginTop: space[1], marginBottom: space[4] },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space[4], gap: space[1] },
  label: { fontSize: 13, fontWeight: '500', marginTop: space[2] },
  input: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 16, minHeight: 44,
  },
  button: {
    marginTop: space[4], minHeight: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { fontSize: 13, marginTop: space[2] },
});
