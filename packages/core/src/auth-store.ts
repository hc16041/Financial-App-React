import { create } from 'zustand';
import { apiGet, apiPost, setToken } from './api-client';

type AuthState = {
  token: string | null;
  username: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('fa_token') : null,
  username: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('fa_user') : null,
  login: async (email, password) => {
    const r = await apiPost<{ token: string }>(`/api/Auth/login`, { email, password });
    setToken(r.token);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('fa_user', email);
    set({ token: r.token, username: email });
  },
  logout: () => {
    setToken(null);
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('fa_user');
    set({ token: null, username: null });
  },
}));

export const fetchBiometricStatus = () =>
  apiGet<{ isEnabled: boolean; registeredAt?: string }>(`/api/Auth/biometric-status`);
export const disableBiometric = () =>
  apiPost<{ isEnabled: boolean }>(`/api/Auth/disable-biometric`, {});
export const forgotPassword = (email: string) =>
  apiPost<void>(`/api/Auth/forgot-password`, { email });
export const resetPassword = (b: { token: string; email: string; newPassword: string; confirmPassword: string }) =>
  apiPost<void>(`/api/Auth/reset-password`, b);
