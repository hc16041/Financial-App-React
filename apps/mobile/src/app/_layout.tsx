import { useEffect } from 'react';
import { View, AppState } from 'react-native';
import { Stack, router, usePathname, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { setToken, getToken, sessionStore, useAuth, listAccounts, listCategories } from '@financial/core';
import { configureMobileApi } from '@/lib/api';
import { saveCache } from '@/lib/cache';
import { useLock } from '@/lib/lock';
import UnlockScreen from '@/components/UnlockScreen';
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
  const token = useAuth((s) => s.token);
  const { enabled: lockEnabled, locked, hydrated: lockHydrated, hydrate } = useLock();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Volver de segundo plano exige desbloquear de nuevo.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') useLock.getState().lock();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    currentPath = pathname;
  }, [pathname]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Con sesión activa se precalientan los catálogos: sin ellos la captura no
  // puede funcionar sin red. Además se guardan en disco para ese caso.
  // Depende del token: al loguearse la pantalla no se remonta, así que sin esta
  // dependencia el prefetch nunca corría hasta reiniciar la app.
  useEffect(() => {
    if (!token) return;
    void qc.prefetchQuery({ queryKey: ['accounts'], queryFn: listAccounts }).then(() => {
      const data = qc.getQueryData(['accounts']);
      if (data) void saveCache('accounts', data);
    });
    void qc.prefetchQuery({ queryKey: ['categories'], queryFn: () => listCategories() }).then(() => {
      const data = qc.getQueryData(['categories']);
      if (data) void saveCache('categories', data);
    });
  }, [token]);

  // Mientras se hidrata la preferencia no se muestra nada: si no, se vería
  // un parpadeo de los datos antes de bloquear.
  if (!lockHydrated) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  // Con sesión y bloqueo activo, la app no muestra contenido hasta autenticarse.
  if (lockEnabled && locked && token) {
    return (
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <UnlockScreen />
      </ThemeProvider>
    );
  }

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
          <Stack.Screen name="pending" options={{ title: 'Envíos pendientes' }} />
        </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
