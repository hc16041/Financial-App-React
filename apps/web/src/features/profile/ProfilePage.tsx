import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Globe, LogOut, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '@financial/core';
import { setLang } from '../../i18n';
import { session, initial } from '../../lib/session';
import PageHead from '../../components/PageHead';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const signOut = useAuth((s) => s.logout);
  const s = session();

  const logout = () => { signOut(); nav({ to: '/auth/login' }); };
  const expires = s.expires ? new Date(s.expires * 1000).toLocaleString() : null;

  return (
    <section>
      <PageHead title={t('nav.profile')} />
      <div className="card" style={{ maxWidth: '34rem' }}>
        <div className="row-between" style={{ justifyContent: 'flex-start', gap: 'var(--fp-space-3)' }}>
          <span className="avatar avatar--lg" aria-hidden="true">{initial(s)}</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{s.name ?? t('nav.guest')}</p>
            <p style={{ margin: 0, color: 'var(--fp-text-muted)', fontSize: '0.875rem' }}>{s.email ?? '—'}</p>
          </div>
        </div>

        <dl className="kv">
          <dt>{t('common.name')}</dt><dd>{s.name ?? '—'}</dd>
          <dt>{t('profile.role')}</dt><dd>{s.role ?? '—'}</dd>
          <dt>{t('profile.expires')}</dt><dd>{expires ?? '—'}</dd>
        </dl>

        <div className="row-between" style={{ marginTop: 'var(--fp-space-4)' }}>
          <button className="btn" onClick={() => setLang(i18n.language === 'es' ? 'en' : 'es')}>
            <Globe size={16} aria-hidden="true" />{i18n.language === 'es' ? 'English' : 'Español'}
          </button>
          <button
            className="btn"
            onClick={() => {
              const el = document.documentElement;
              const next = !el.classList.contains('dark');
              el.classList.toggle('dark', next);
              el.setAttribute('data-bs-theme', next ? 'dark' : 'light');
              localStorage.setItem('fa_theme', next ? 'dark' : 'light');
            }}
          >
            {typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
              ? <><Sun size={16} aria-hidden="true" />{t('profile.light')}</>
              : <><Moon size={16} aria-hidden="true" />{t('profile.dark')}</>}
          </button>
          <button className="btn btn--danger" onClick={logout}><LogOut size={16} aria-hidden="true" />{t('nav.logout')}</button>
        </div>
        <p className="form-note" style={{ marginTop: 'var(--fp-space-3)', display: 'flex', alignItems: 'center', gap: 'var(--fp-space-2)' }}>
          <User size={15} aria-hidden="true" />{t('profile.note')}
        </p>
      </div>
    </section>
  );
}
