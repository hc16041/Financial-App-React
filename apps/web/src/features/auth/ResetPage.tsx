import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { resetPassword } from '@financial/core';

const schema = z.object({
  email: z.string().email('err.email'),
  token: z.string().min(1, 'err.required'),
  newPassword: z.string().min(6, 'err.min6'),
  confirmPassword: z.string().min(1, 'err.required'),
}).refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'err.mismatch' });
type Form = z.infer<typeof schema>;

export default function ResetPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodT(schema),
    defaultValues: { token: search?.token ?? '' },
  });

  const onSubmit = async (f: Form) => {
    setError(null);
    try {
      await resetPassword(f);
      nav({ to: '/auth/login' });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'var(--fp-font-family)' }}>
      <h1>{t('auth.reset')}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('email')} type="email" placeholder={t('auth.email')} style={{ width: '100%', margin: '4px 0' }} />
        {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
        <input {...register('token')} placeholder={t('auth.token')} style={{ width: '100%', margin: '4px 0' }} />
        {errors.token && <p style={{ color: 'red' }}>{errors.token.message}</p>}
        <input {...register('newPassword')} type="password" placeholder={t('auth.password')} style={{ width: '100%', margin: '4px 0' }} />
        {errors.newPassword && <p style={{ color: 'red' }}>{errors.newPassword.message}</p>}
        <input {...register('confirmPassword')} type="password" placeholder={t('auth.password')} style={{ width: '100%', margin: '4px 0' }} />
        {errors.confirmPassword && <p style={{ color: 'red' }}>{errors.confirmPassword.message}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button disabled={isSubmitting} type="submit">{t('common.save')}</button>
      </form>
      <p><Link to="/auth/login">{t('nav.login')}</Link></p>
    </main>
  );
}
