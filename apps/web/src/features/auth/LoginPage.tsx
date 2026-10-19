import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from '@tanstack/react-router';
import { BookMarked } from 'lucide-react';
import { useAuth, ApiError } from '@financial/core';

const schema = z.object({
  email: z.string().email('err.email'),
  password: z.string().min(1, 'err.required'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodT(schema) });

  const onSubmit = async (f: Form) => {
    setError('');
    try {
      await login(f.email, f.password);
      nav({ to: '/' });
    } catch (e) {
      // El backend devuelve 500 con "Credenciales inválidas" en vez de 401.
      const bad = e instanceof ApiError && (e.status === 401 || e.status === 400 || e.status === 500);
      setError(bad ? t('auth.badCredentials') : (e as Error)?.message ?? t('common.error'));
    }
  };

  return (
    <main className="auth">
      <div className="card auth__card">
        <div className="auth__brand">
          <span className="brand__mark" aria-hidden="true"><BookMarked /></span>
          {t('nav.brand')}
        </div>
        <h1 className="auth__title">{t('auth.title')}</h1>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fp-space-3)' }}>
          <div className="field">
            <label htmlFor="email">{t('auth.email')}</label>
            <input id="email" {...register('email')} placeholder={t('auth.email')} autoComplete="email" />
            {errors.email && <p className="field__error">{errors.email.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="password">{t('auth.password')}</label>
            <input id="password" {...register('password')} type="password" placeholder={t('auth.password')} autoComplete="current-password" />
            {errors.password && <p className="field__error">{errors.password.message}</p>}
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('common.loading') : t('nav.login')}
          </button>
        </form>
        <p className="form-note" style={{ marginTop: 'var(--fp-space-3)', textAlign: 'center' }}>
          <Link to="/auth/register">{t('auth.register')}</Link> · <Link to="/auth/forgot">{t('auth.forgot')}</Link>
        </p>
      </div>
    </main>
  );
}
