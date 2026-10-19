import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightLeft, BarChart3, BookMarked, Briefcase, ChevronDown, CreditCard, Fingerprint,
  Globe, KeyRound, Landmark, LayoutDashboard, LogOut, Maximize2, Menu, Minimize2, Moon,
  PiggyBank, ScrollText, ShieldCheck, Store, Sun, Tags, Target, TrendingUp, User,
  Users, UserX, Wallet, type LucideIcon,
} from 'lucide-react';
import { setLang } from '../i18n';
import { useAuth } from '@financial/core';
import { session, initial } from '../lib/session';

type Item = { to: string; key: string; icon: LucideIcon };
const SECTIONS: { key: string; items: Item[] }[] = [
  { key: 'finance', items: [
    { to: '/', key: 'dashboard', icon: LayoutDashboard },
    { to: '/savings', key: 'savings', icon: PiggyBank },
    { to: '/accounts', key: 'accounts', icon: Landmark },
    { to: '/cards', key: 'cards', icon: CreditCard },
    { to: '/invest', key: 'invest', icon: TrendingUp },
  ] },
  { key: 'order', items: [
    { to: '/categories', key: 'categories', icon: Tags },
    { to: '/budgets', key: 'budgets', icon: Wallet },
    { to: '/goals', key: 'goals', icon: Target },
  ] },
  { key: 'record', items: [
    { to: '/merchants', key: 'merchants', icon: Store },
    { to: '/tx', key: 'tx', icon: ArrowRightLeft },
    { to: '/reports', key: 'reports', icon: BarChart3 },
  ] },
  { key: 'security', items: [
    { to: '/centries/users', key: 'centriesUsers', icon: Users },
    { to: '/centries/inactive', key: 'centriesInactive', icon: UserX },
    { to: '/centries/profiles', key: 'centriesProfiles', icon: ShieldCheck },
    { to: '/centries/positions', key: 'centriesPositions', icon: Briefcase },
    { to: '/centries/permissions', key: 'centriesPermissions', icon: KeyRound },
    { to: '/centries/audit', key: 'centriesAudit', icon: ScrollText },
  ] },
  { key: 'settings', items: [{ to: '/settings/biometric', key: 'biometric', icon: Fingerprint }] },
];

export default function Shell() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const signOut = useAuth((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const [full, setFull] = useState(false);
  const me = session();
  const here = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleTheme = () => {
    const el = document.documentElement;
    const next = !dark;
    el.classList.toggle('dark', next);
    el.setAttribute('data-bs-theme', next ? 'dark' : 'light');
    localStorage.setItem('fa_theme', next ? 'dark' : 'light');
    setDark(next);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  const logout = () => { signOut(); nav({ to: '/auth/login' }); };

  // Las rutas de auth no usan el cromo de la app (sidebar/topbar).
  if (pathname.startsWith('/auth')) return <Outlet />;

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' is-open' : ''}`}>
        <p className="brand"><span className="brand__mark" aria-hidden="true"><BookMarked /></span>{t('nav.brand')}</p>
        {SECTIONS.map((s) => (
          <div key={s.key}>
            <p className="sidebar__section">{t(`sections.${s.key}`)}</p>
            <ul>
              {s.items.map((i) => (
                <li key={i.to}>
                  <Link to={i.to} data-active={here(i.to) || undefined} onClick={() => setOpen(false)}>
                    <i.icon size={16} aria-hidden="true" />
                    {t(`nav.${i.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button className="topbar__menu icon-btn" onClick={() => setOpen((v) => !v)} aria-label={t('nav.menu')}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="topbar__brand"><span className="brand__mark" aria-hidden="true"><BookMarked /></span>{t('nav.brand')}</span>
          <span className="topbar__spacer" />
          <div className="topbar__actions">
            <button className="btn btn--ghost btn--sm icon-btn" onClick={toggleTheme} aria-label={t('nav.theme')}>
              {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button className="btn btn--ghost btn--sm icon-btn topbar__full" onClick={toggleFull} aria-label={t('nav.fullscreen')}>
              {full ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setLang(i18n.language === 'es' ? 'en' : 'es')} aria-label={t('nav.language')}>
              <Globe size={16} aria-hidden="true" />
              {i18n.language === 'es' ? 'ES' : 'EN'}
            </button>
            <details className="user-menu">
              <summary>
                <span className="avatar" aria-hidden="true">{initial(me)}</span>
                <span className="user-chip__id">
                  <span className="user-chip__name">{me.name ?? me.email ?? t('nav.guest')}</span>
                  <span className="user-chip__sub">{me.role ?? t('nav.profile')}</span>
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div className="user-menu__pop">
                <Link className="btn btn--ghost btn--sm user-menu__item" to="/profile">
                  <User size={16} aria-hidden="true" />{t('nav.profile')}
                </Link>
                <button className="btn btn--ghost btn--sm" onClick={logout}>
                  <LogOut size={16} aria-hidden="true" />{t('nav.logout')}
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
        <footer className="footer">
          {t('nav.brand')} · {t('footer.note')}
        </footer>
      </div>
    </div>
  );
}
