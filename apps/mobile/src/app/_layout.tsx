import { useEffect } from 'react';
import { Stack, router, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { setToken, getToken, sessionStore, useAuth } from '@financial/core';
import { configureMobileApi } from '@/lib/api';
import { useTheme } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Se configura antes de montar pantallas: el core no conoce el router.
configureMobileApi(() => {
  setToken(null);
  useAuth.setState({ token: null, username: null });
  router.replace('/login');
});

// El store de auth se crea al importar el módulo, antes de esta configuración,
// así que en arranque en frío hay que rehidratarlo desde SecureStore.
useAuth.setState({ token: getToken(), username: sessionStore().getItem('fa_user') });

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const { c, isDark } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={qc}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.surface },
            headerTintColor: c.ink,
            contentStyle: { backgroundColor: c.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: "Libro mayor" }} />
          <Stack.Screen name="login" options={{ title: 'Acceso', headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
