import { createRootRoute, createRoute, createRouter, redirect, lazyRouteComponent } from '@tanstack/react-router';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import Shell from './components/Shell';

const authed = () => {
  if (typeof sessionStorage === 'undefined') return true;
  if (!sessionStorage.getItem('fa_token')) throw redirect({ to: '/auth/login' });
};

const root = createRootRoute({ component: Shell });

const loginRoute = createRoute({ getParentRoute: () => root, path: '/auth/login', component: LoginPage });
const regRoute = createRoute({ getParentRoute: () => root, path: '/auth/register', component: lazyRouteComponent(() => import('./features/auth/RegisterPage')) });
const forRoute = createRoute({ getParentRoute: () => root, path: '/auth/forgot', component: lazyRouteComponent(() => import('./features/auth/ForgotPage')) });
const resRoute = createRoute({ getParentRoute: () => root, path: '/auth/reset', component: lazyRouteComponent(() => import('./features/auth/ResetPage')) });
const bioRoute = createRoute({ getParentRoute: () => root, path: '/settings/biometric', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/auth/BiometricPage')) });
const profRoute = createRoute({ getParentRoute: () => root, path: '/profile', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/profile/ProfilePage')) });
const dashRoute = createRoute({ getParentRoute: () => root, path: '/', beforeLoad: authed, component: DashboardPage });
// Rutas pesadas en chunks separados: el bundle inicial queda solo con shell+dashboard.
const savRoute = createRoute({ getParentRoute: () => root, path: '/savings', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/savings/SavingsPage')) });
const merRoute = createRoute({ getParentRoute: () => root, path: '/merchants', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/merchants/MerchantsPage')) });
const carRoute = createRoute({ getParentRoute: () => root, path: '/cards', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/cards/CardsPage')) });
const repRoute = createRoute({ getParentRoute: () => root, path: '/reports', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/reports/ReportsPage')) });
const txRoute = createRoute({ getParentRoute: () => root, path: '/tx', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/transactions/TransactionsPage')) });
const invRoute = createRoute({ getParentRoute: () => root, path: '/invest', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/investments/InvestmentsPage')) });
const catRoute = createRoute({ getParentRoute: () => root, path: '/categories', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/categories/CategoriesPage')) });
const budRoute = createRoute({ getParentRoute: () => root, path: '/budgets', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/budgets/BudgetsPage')) });
const accRoute = createRoute({ getParentRoute: () => root, path: '/accounts', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/accounts/AccountsPage')) });
const goaRoute = createRoute({ getParentRoute: () => root, path: '/goals', beforeLoad: authed, component: lazyRouteComponent(() => import('./features/goals/GoalsPage')) });
// Centries (Módulo 8): páginas config-driven sobre mocks locales.
type CentryExport = 'CentriesUsuarios' | 'CentriesUsuariosInactivos' | 'CentriesPerfiles' | 'CentriesCargos' | 'CentriesPermisos' | 'CentriesBitacora';
const cen = (path: string, name: CentryExport) => createRoute({ getParentRoute: () => root, path, beforeLoad: authed, component: lazyRouteComponent(() => import('./features/centries/CentriesPage'), name) });
const cenUsersRoute = cen('/centries/users', 'CentriesUsuarios');
const cenInactiveRoute = cen('/centries/inactive', 'CentriesUsuariosInactivos');
const cenProfilesRoute = cen('/centries/profiles', 'CentriesPerfiles');
const cenPositionsRoute = cen('/centries/positions', 'CentriesCargos');
const cenPermissionsRoute = cen('/centries/permissions', 'CentriesPermisos');
const cenAuditRoute = cen('/centries/audit', 'CentriesBitacora');

export const router = createRouter({
  routeTree: root.addChildren([loginRoute, regRoute, forRoute, resRoute, bioRoute, profRoute, dashRoute, savRoute, merRoute, carRoute, txRoute, invRoute, repRoute, catRoute, budRoute, accRoute, goaRoute, cenUsersRoute, cenInactiveRoute, cenProfilesRoute, cenPositionsRoute, cenPermissionsRoute, cenAuditRoute]),
});
