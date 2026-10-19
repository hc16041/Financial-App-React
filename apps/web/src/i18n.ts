import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      nav: { brand: 'Libro mayor', home: 'Inicio', breadcrumb: 'Ruta de navegación', profile: 'Perfil', guest: 'Sesión', menu: 'Menú', language: 'Idioma', theme: 'Tema', fullscreen: 'Pantalla completa', dashboard: 'Panel', savings: 'Ahorros', categories: 'Categorías', budgets: 'Presupuestos', accounts: 'Cuentas', goals: 'Metas y recurrentes', cards: 'Tarjetas', reports: 'Reportes', tx: 'Movimientos', invest: 'Inversiones', merchants: 'Comercios', logout: 'Salir', login: 'Entrar', biometric: 'Biometría', centriesUsers: 'Usuarios', centriesInactive: 'Usuarios inactivos', centriesProfiles: 'Perfiles', centriesPositions: 'Cargos', centriesPermissions: 'Permisos por perfil', centriesAudit: 'Bitácora' }, sections: { finance: 'Finanzas', order: 'Orden', record: 'Registro', settings: 'Ajustes', security: 'Seguridad' },
      common: { loading: 'Cargando…', retry: 'Reintentar', empty: 'Sin datos', error: 'Error al cargar', create: 'Crear', edit: 'Editar', delete: 'Borrar', cancel: 'Cancelar', save: 'Guardar', saved: 'Cambios guardados', close: 'Cerrar', search: 'Buscar…', filter: 'Filtrar', prev: 'Anterior', next: 'Siguiente', all: 'Todas', name: 'Nombre', description: 'Descripción', category: 'Categoría', type: 'Tipo', date: 'Fecha', amount: 'Monto', note: 'Nota', limit: 'Límite', total: 'Total', commission: 'Comisión', actions: 'Acciones', icon: 'Icono', status: 'Estado', clear: 'Limpiar' },
      auth: { title: 'Acceso', badCredentials: 'Correo o contraseña incorrectos.', email: 'correo', password: 'contraseña', firstName: 'Nombre', lastName: 'Apellido', token: 'Token', register: 'Crear cuenta', haveAccount: 'Ya tengo cuenta', forgot: 'Olvidé mi contraseña', forgotSent: 'Si el correo existe, recibirás instrucciones.', reset: 'Restablecer contraseña', biometric: 'Biometría', bioOn: 'Biometría activada.', bioOff: 'Biometría desactivada.', bioDisable: 'Desactivar biometría' },
      dash: { title: 'Panel', provisional: '(provisional)', total: 'Total', savings: 'Ahorros', investments: 'Inversiones', debt: 'Deuda tarjetas', composition: 'Composición' },
      savings: { title: 'Ahorros', balance: 'balance', new: 'Nueva', deposit: 'Depósito', withdrawal: 'Retiro', empty: 'Sin movimientos — registra el primero.' },
      categories: { title: 'Categorías', income: 'Ingreso', expense: 'Gasto', active: 'Activa', inactive: 'Inactiva', deactivate: 'Desactivar', empty: 'Sin categorías — Crea la primera.' },
      budgets: { title: 'Presupuestos', month: 'Mes', year: 'Año', spent: 'Gastado', empty: 'Sin presupuestos — Crea tu primer presupuesto.' },
      accounts: { title: 'Cuentas', newAccount: 'Crear cuenta', movement: 'Movimiento', register: 'Registrar', empty: 'Sin movimientos.', cash: 'Efectivo', bank: 'Banco' },
      goals: { title: 'Metas', recurring: 'Recurrentes', contribute: 'Aportar', pay: 'Pagar', newGoal: 'Crear meta', target: 'Objetivo', contribution: 'Aporte', pause: 'Pausar', activate: 'Activar', active: 'activo', paused: 'pausado', due: 'vence', overdue: 'Vencida', empty: 'Sin metas — crea la primera.' },
      merchants: { title: 'Comercios', empty: 'Sin comercios — crea el primero.', legacy: 'legado', noEdit: 'Editar y borrar requieren PUT/DELETE en el API (FEAT-15).' },
      cards: { title: 'Tarjetas', limit: 'Límite', available: 'Disponible', list: 'Tarjetas', consumption: 'Consumo del mes', new: 'Nueva tarjeta', bank: 'Banco', cutOff: 'Corte', dueDay: 'Pago', rate: 'Tasa %', balance: 'Saldo', chartAria: 'Consumo del mes por tarjeta' },
      reports: { title: 'Reportes', merchants: 'Comercios', cash: 'Efectivo', investments: 'Inversiones', export: 'Exportar CSV', monthlyAria: 'Ingresos vs retiros por mes' },
      tx: { title: 'Movimientos', all: 'Por fecha', cash: 'Efectivo', merchant: 'Comercio' },
      invest: { title: 'Inversiones', total: 'Total invertido', income: 'Ingreso', withdraw: 'Retiro', noMethod: 'Sin método', noCard: 'Sin tarjeta', platform: 'Plataforma' },
      centries: { users: 'Usuarios', inactive: 'Usuarios inactivos', profiles: 'Perfiles', positions: 'Cargos', permissions: 'Permisos por perfil', audit: 'Bitácora', yes: 'Sí', no: 'No', activate: 'Activar', deactivate: 'Desactivar', username: 'Usuario', position: 'Cargo', profile: 'Perfil', permission: 'Permiso', email: 'Correo', password: 'Contraseña', firstName: 'Nombre', lastName: 'Apellido', module: 'Módulo', view: 'Ver', action: 'Acción', detail: 'Detalle' },
      err: { required: 'Requerido', email: 'Correo inválido', money: 'Monto inválido (ej. 1000.00)', rate: 'Tasa inválida', icon: 'Icono no permitido', min3: 'Mínimo 3 caracteres', min6: 'Mínimo 6 caracteres', mismatch: 'No coinciden', goalPositive: 'La meta debe ser mayor que 0', depositPositive: 'El aporte debe ser mayor que 0', budgetDup: 'Ya existe un presupuesto para esa categoría y mes.' },
      profile: { role: 'Perfil', expires: 'Sesión válida hasta', light: 'Modo claro', dark: 'Modo oscuro', note: 'Los datos de cuenta provienen del token de sesión.' },
      footer: { note: 'Finanzas personales' },
    },
  },
  en: {
    translation: {
      nav: { brand: 'General ledger', home: 'Home', breadcrumb: 'Breadcrumb', profile: 'Profile', guest: 'Session', menu: 'Menu', language: 'Language', theme: 'Theme', fullscreen: 'Fullscreen', dashboard: 'Dashboard', savings: 'Savings', categories: 'Categories', budgets: 'Budgets', accounts: 'Accounts', goals: 'Goals & recurring', cards: 'Cards', reports: 'Reports', tx: 'Transactions', invest: 'Investments', merchants: 'Merchants', logout: 'Logout', login: 'Sign in', biometric: 'Biometrics', centriesUsers: 'Users', centriesInactive: 'Inactive users', centriesProfiles: 'Profiles', centriesPositions: 'Positions', centriesPermissions: 'Permissions by profile', centriesAudit: 'Audit log' }, sections: { finance: 'Finance', order: 'Order', record: 'Record', settings: 'Settings', security: 'Security' },
      common: { loading: 'Loading…', retry: 'Retry', empty: 'No data', error: 'Failed to load', create: 'Create', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', save: 'Save', saved: 'Changes saved', close: 'Close', search: 'Search…', filter: 'Filter', prev: 'Previous', next: 'Next', all: 'All', name: 'Name', description: 'Description', category: 'Category', type: 'Type', date: 'Date', amount: 'Amount', note: 'Note', limit: 'Limit', total: 'Total', commission: 'Commission', actions: 'Actions', icon: 'Icon', status: 'Status', clear: 'Clear' },
      auth: { title: 'Sign in', badCredentials: 'Wrong email or password.', email: 'email', password: 'password', firstName: 'First name', lastName: 'Last name', token: 'Token', register: 'Sign up', haveAccount: 'I already have an account', forgot: 'Forgot password', forgotSent: 'If the email exists, you will receive instructions.', reset: 'Reset password', biometric: 'Biometrics', bioOn: 'Biometrics enabled.', bioOff: 'Biometrics disabled.', bioDisable: 'Disable biometrics' },
      dash: { title: 'Dashboard', provisional: '(provisional)', total: 'Total', savings: 'Savings', investments: 'Investments', debt: 'Card debt', composition: 'Composition' },
      savings: { title: 'Savings', balance: 'balance', new: 'New', deposit: 'Deposit', withdrawal: 'Withdrawal', empty: 'No movements — record the first.' },
      categories: { title: 'Categories', income: 'Income', expense: 'Expense', active: 'Active', inactive: 'Inactive', deactivate: 'Deactivate', empty: 'No categories — create the first.' },
      budgets: { title: 'Budgets', month: 'Month', year: 'Year', spent: 'Spent', empty: 'No budgets — create your first budget.' },
      accounts: { title: 'Accounts', newAccount: 'Create account', movement: 'Movement', register: 'Record', empty: 'No movements.', cash: 'Cash', bank: 'Bank' },
      goals: { title: 'Goals', recurring: 'Recurring', contribute: 'Contribute', pay: 'Pay', newGoal: 'Create goal', target: 'Target', contribution: 'Contribution', pause: 'Pause', activate: 'Activate', active: 'active', paused: 'paused', due: 'due', overdue: 'Overdue', empty: 'No goals — create the first.' },
      merchants: { title: 'Merchants', empty: 'No merchants — create the first.', legacy: 'legacy', noEdit: 'Edit and delete require API PUT/DELETE (FEAT-15).' },
      cards: { title: 'Cards', limit: 'Limit', available: 'Available', list: 'Cards', consumption: 'Month consumption', new: 'New card', bank: 'Bank', cutOff: 'Cut-off', dueDay: 'Due day', rate: 'Rate %', balance: 'Balance', chartAria: 'Monthly consumption by card' },
      reports: { title: 'Reports', merchants: 'Merchants', cash: 'Cash', investments: 'Investments', export: 'Export CSV', monthlyAria: 'Income vs withdrawals per month' },
      tx: { title: 'Transactions', all: 'By date', cash: 'Cash', merchant: 'Merchant' },
      invest: { title: 'Investments', total: 'Total invested', income: 'Deposit', withdraw: 'Withdrawal', noMethod: 'No method', noCard: 'No card', platform: 'Platform' },
      centries: { users: 'Users', inactive: 'Inactive users', profiles: 'Profiles', positions: 'Positions', permissions: 'Permissions by profile', audit: 'Audit log', yes: 'Yes', no: 'No', activate: 'Activate', deactivate: 'Deactivate', username: 'Username', position: 'Position', profile: 'Profile', permission: 'Permission', email: 'Email', password: 'Password', firstName: 'First name', lastName: 'Last name', module: 'Module', view: 'View', action: 'Action', detail: 'Detail' },
      err: { required: 'Required', email: 'Invalid email', money: 'Invalid amount (e.g. 1000.00)', rate: 'Invalid rate', icon: 'Icon not allowed', min3: 'At least 3 characters', min6: 'At least 6 characters', mismatch: 'Passwords do not match', goalPositive: 'Target must be greater than 0', depositPositive: 'Deposit must be greater than 0', budgetDup: 'A budget already exists for that category and month.' },
      profile: { role: 'Role', expires: 'Session valid until', light: 'Light mode', dark: 'Dark mode', note: 'Account data comes from the session token.' },
      footer: { note: 'Personal finance' },
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('fa_lang') ?? 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
export const setLang = (l: 'es' | 'en') => { localStorage.setItem('fa_lang', l); i18n.changeLanguage(l); };
