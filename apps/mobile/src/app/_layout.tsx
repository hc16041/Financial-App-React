import { useEffect } from 'react';
import { Stack, router, usePathname, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { setToken, getToken, sessionStore, useAuth, listAccounts, listCategories } from '@financial/core';
import { configureMobileApi } from '@/lib/api';
import { saveCache } from '@/lib/cache';
import { useTheme } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Ruta actual, para que el callback de 401 no se dispare sobre el propio login:
// un 401 del endpoint de login es "credenciales inválidas", no "sesión vencida".
let currentPath = '';

// Se configura antes de montar pantallas: el core no conoce el router.
configureMobileApi(() => {
  setToken(null);
  useAuth.setState({ token: null, username: null });
  if (currentPath.startsWith('/login')) return;
  router.replace('/login');
});

// El store de auth se crea al importar el módulo, antes de esta configuración,
// así que en arranque en frío hay que rehidratarlo desde SecureStore.
useAuth.setState({ token: getToken(), username: sessionStore().getItem('fa_user') });

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Sin red, la captura necesita al menos los catálogos: cuentas y categorías.
// Se persisten solo esas consultas; el resto del cache vive en memoria.

export default function RootLayout() {
  const { c, isDark } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    currentPath = pathname;
  }, [pathname]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Con sesión activa se precalientan los catálogos: sin ellos la captura no
  // puede funcionar sin red. Además se guardan en disco para ese caso.
  useEffect(() => {
    if (!getToken()) return;
    void qc.prefetchQuery({ queryKey: ['accounts'], queryFn: listAccounts }).then(() => {
      const data = qc.getQueryData(['accounts']);
      if (data) void saveCache('accounts', data);
    });
    void qc.prefetchQuery({ queryKey: ['categories'], queryFn: () => listCategories() }).then(() => {
      const data = qc.getQueryData(['categories']);
      if (data) void saveCache('categories', data);
    });
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
          <Stack.Screen name="capture" options={{ title: 'Nuevo movimiento', presentation: 'modal' }} />
          <Stack.Screen name="movements" options={{ title: 'Movimientos' }} />
        </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
