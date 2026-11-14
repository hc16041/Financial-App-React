import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { configureApi, setToken, getToken, sessionStore, useAuth } from '@financial/core'
import { router } from './router'
import i18n from './i18n'
import { useToasts } from './components/toast'
import Toaster from './components/Toaster'
import './index.css'

// Única configuración del core para la web: base URL desde Vite, la sesión vive
// en localStorage (compartida entre pestañas) y un 401 fuera de /auth redirige al login.
configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
  onUnauthorized: () => {
    if (typeof location === 'undefined' || location.pathname.startsWith('/auth/')) return
    setToken(null)
    location.href = '/auth/login'
  },
})

// Migración: la versión anterior guardaba la sesión en sessionStorage (por pestaña).
// Se copia una vez a localStorage para no obligar a loguearse de nuevo y para que
// una pestaña nueva comparta la sesión.
if (typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined') {
  for (const key of ['fa_token', 'fa_refresh', 'fa_user']) {
    const value = sessionStorage.getItem(key)
    if (value && !localStorage.getItem(key)) localStorage.setItem(key, value)
    sessionStorage.removeItem(key)
  }
}
useAuth.setState({ token: getToken(), username: sessionStore().getItem('fa_user') })

// Si otra pestaña inicia o cierra sesión, esta se mantiene alineada.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'fa_token') {
      useAuth.setState({ token: e.newValue })
      if (!e.newValue && !location.pathname.startsWith('/auth/')) location.href = '/auth/login'
    }
    if (e.key === 'fa_user') useAuth.setState({ username: e.newValue })
  })
}

// Un solo punto de aviso: cualquier mutación que falle o tenga éxito notifica.
const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  mutationCache: new MutationCache({
    onSuccess: () => useToasts.getState().push('ok', i18n.t('common.saved')),
    onError: (err) => {
      // Los errores de dominio del core llegan como código (err.*): se traduce aquí,
      // en el propio objeto, para que también los mensajes inline queden traducidos.
      const e = err as Error;
      if (typeof e?.message === 'string' && e.message.startsWith('err.')) e.message = i18n.t(e.message);
      useToasts.getState().push('error', e?.message || i18n.t('common.error'));
    },
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
