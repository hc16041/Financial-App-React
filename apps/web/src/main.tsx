import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { configureApi, clearSession, getToken, sessionStore, useAuth } from '@financial/core'
import { cookieStore, onAuthChange } from './lib/cookie-store'
import { router } from './router'
import i18n from './i18n'
import { useToasts } from './components/toast'
import Toaster from './components/Toaster'
import './index.css'

// Única configuración del core para la web: base URL desde Vite y sesión en una
// cookie de sesión (compartida entre pestañas, se borra al cerrar el navegador).
// La sesión dura como máximo 8 h desde el login; después se vuelve a entrar.
const EIGHT_HOURS = 8 * 60 * 60 * 1000
configureApi({
  baseUrl: import.meta.env.VITE_API_URL,
  storage: cookieStore,
  sessionMaxMs: EIGHT_HOURS,
  onUnauthorized: () => {
    if (typeof location === 'undefined' || location.pathname.startsWith('/auth/')) return
    clearSession()
    location.href = '/auth/login'
  },
})

// Migración: versiones anteriores guardaban la sesión en localStorage/sessionStorage.
// Se copia una vez a la cookie para no obligar a loguearse de nuevo.
for (const key of ['fa_token', 'fa_refresh', 'fa_user']) {
  if (cookieStore.getItem(key)) continue
  const value =
    (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null) ??
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null)
  if (value) cookieStore.setItem(key, value)
}
if (typeof localStorage !== 'undefined') {
  for (const key of ['fa_token', 'fa_refresh', 'fa_user']) localStorage.removeItem(key)
}
if (typeof sessionStorage !== 'undefined') {
  for (const key of ['fa_token', 'fa_refresh', 'fa_user']) sessionStorage.removeItem(key)
}
if (cookieStore.getItem('fa_token') && !cookieStore.getItem('fa_login_at')) {
  cookieStore.setItem('fa_login_at', String(Date.now()))
}
useAuth.setState({ token: getToken(), username: sessionStore().getItem('fa_user') })

// Las cookies no disparan `storage`: el adaptador avisa por BroadcastChannel.
onAuthChange(() => {
  const token = getToken()
  useAuth.setState({ token, username: sessionStore().getItem('fa_user') })
  if (!token && !location.pathname.startsWith('/auth/')) location.href = '/auth/login'
})

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
