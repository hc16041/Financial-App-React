import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodT } from '../../lib/errors';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { forgotPassword } from '@financial/core';

const schema = z.object({ email: z.string().email('err.email') });

export default function ForgotPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodT(schema) });

  const onSubmit = async (f: { email: string }) => {
    setError(null);
    try {
      await forgotPassword(f.email);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'var(--fp-font-family)' }}>
      <h1>{t('auth.forgot')}</h1>
      {sent ? <p>{t('auth.forgotSent')}</p> : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input {...register('email')} type="email" placeholder={t('auth.email')} style={{ width: '100%', margin: '4px 0' }} />
          {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button disabled={isSubmitting} type="submit">{t('common.save')}</button>
        </form>
      )}
      <p><Link to="/auth/login">{t('nav.login')}</Link></p>
    </main>
  );
}
