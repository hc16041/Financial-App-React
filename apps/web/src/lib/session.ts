// Lectura de la sesión actual: correo guardado al entrar + claims del JWT.
// El token es la única fuente; no se guardan datos de usuario duplicados.
export type Session = { email: string | null; name: string | null; role: string | null; expires: number | null };

const ROLE = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export function session(): Session {
  if (typeof sessionStorage === 'undefined') return { email: null, name: null, role: null, expires: null };
  const email = sessionStorage.getItem('fa_user');
  const token = sessionStorage.getItem('fa_token');
  let name: string | null = null;
  let role: string | null = null;
  let expires: number | null = null;
  if (token && token.split('.').length === 3) {
    try {
      const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const p = JSON.parse(atob(part));
      name = p.name ?? p.unique_name ?? p.given_name ?? null;
      role = p.role ?? p[ROLE] ?? null;
      expires = typeof p.exp === 'number' ? p.exp : null;
    } catch {
      // token no-JWT (p. ej. valor de demo): se ignora.
    }
  }
  return { email, name, role, expires };
}

export const initial = (s: Session) => (s.name ?? s.email ?? '?').trim().charAt(0).toUpperCase();
