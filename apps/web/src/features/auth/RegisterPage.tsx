import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { setToken } from '@financial/core';

const schema = z.object({
  email: z.string().email('err.email'),
  password: z.string().min(6, 'err.min6'),
  confirmPassword: z.string().min(1, 'err.required'),
  firstName: z.string().min(1, 'err.required'),
  lastName: z.string().min(1, 'err.required'),
}).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'err.mismatch' });
type Form = z.infer<typeof schema>;
const API = 'http://localhost:5063';

export default function RegisterPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodT(schema) });

  const onSubmit = async (f: Form) => {
    const res = await fetch(`${API}/api/Auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, phoneNumber: '' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const token = body.token ?? body.accessToken ?? body.data?.token;
    if (token) setToken(token);
    nav({ to: '/' });
  };

  const field = (name: 'email' | 'password' | 'confirmPassword' | 'firstName' | 'lastName', type = 'text', placeholder?: string) => (
    <>
      <input {...register(name)} type={type} placeholder={placeholder ?? name} style={{ width: '100%', margin: '4px 0' }} />
      {errors[name] && <p style={{ color: 'red' }}>{errors[name]?.message}</p>}
    </>
  );

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'var(--fp-font-family)' }}>
      <h1>{t('auth.register')}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        {field('firstName', 'text', t('auth.firstName'))}
        {field('lastName', 'text', t('auth.lastName'))}
        {field('email', 'email', t('auth.email'))}
        {field('password', 'password', t('auth.password'))}
        {field('confirmPassword', 'password', t('auth.password'))}
        <button disabled={isSubmitting} type="submit">{t('auth.register')}</button>
      </form>
      <p><Link to="/auth/login">{t('auth.haveAccount')}</Link></p>
    </main>
  );
}
