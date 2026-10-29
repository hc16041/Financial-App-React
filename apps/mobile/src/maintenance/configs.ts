import {
  listCategories, createCategory, updateCategory, removeCategory,
  listMerchants, createMerchant, updateMerchant, deleteMerchant,
  platformsApi, withdrawalMethodsApi,
  listAccounts, createAccount, updateAccount, deleteAccount,
  listBudgets, createBudget, updateBudget, deleteBudget,
  listGoals, createGoal, updateGoal,
  listCards, createCard,
  listInvestments, createInvestment, updateInvestment, deleteInvestment,
  money,
} from '@financial/core';
import type { MaintenanceConfig } from './types';

const num = (v: string | undefined) => Number(v);
const moneyStr = (v: string | undefined) => (v ?? '').trim();
const opt = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

const categoryOptions = async () =>
  (await listCategories()).map((c) => ({ value: String(c.id), label: c.name }));

const platformOptions = async () =>
  (await platformsApi.list()).map((p) => ({ value: String(p.id), label: p.name }));

const accountOptions = async () =>
  (await listAccounts()).map((a) => ({ value: String(a.id), label: a.name }));

const TYPE_INCOME_EXPENSE = [
  { value: '1', label: 'Ingreso' },
  { value: '2', label: 'Gasto' },
];

const CASH_OR_BANK = [
  { value: '1', label: 'Efectivo' },
  { value: '2', label: 'Banco' },
];

export const MAINTENANCES: MaintenanceConfig[] = [
  {
    slug: 'categories',
    title: 'Categorías',
    description: 'Clasifican cada movimiento y alimentan los presupuestos.',
    fetch: () => listCategories() as Promise<Array<Record<string, unknown>>>,
    create: (v) =>
      createCategory({ name: v.name, type: num(v.type) as 1 | 2, color: v.color || 'var(--fp-primary)', icon: v.icon || 'mdi-tag', isActive: true }),
    update: (id, v) =>
      updateCategory(id, { name: v.name, type: num(v.type) as 1 | 2, color: v.color || 'var(--fp-primary)', icon: v.icon || 'mdi-tag', isActive: v.isActive !== '0' }),
    remove: (id) => removeCategory(id),
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'typeName', label: 'Tipo' },
      { key: 'isActive', label: 'Estado', render: (r) => (r.isActive ? 'Activa' : 'Inactiva') },
    ],
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, placeholder: 'Alimentación' },
      { key: 'type', label: 'Tipo', kind: 'select', required: true, options: TYPE_INCOME_EXPENSE },
      { key: 'icon', label: 'Icono', kind: 'text', placeholder: 'mdi-food' },
      { key: 'color', label: 'Color', kind: 'text', placeholder: '#17704e' },
    ],
    searchKeys: ['name'],
  },
  {
    slug: 'merchants',
    title: 'Comercios',
    description: 'Dónde gastás. La categoría es libre en el API actual.',
    fetch: () => listMerchants() as Promise<Array<Record<string, unknown>>>,
    create: (v) => createMerchant({ name: v.name, description: v.description, category: v.category }),
    update: (id, v) => updateMerchant(id, { name: v.name, description: v.description, category: v.category }),
    remove: (id) => deleteMerchant(id),
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'category', label: 'Categoría' },
    ],
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, placeholder: 'Súper El Sol' },
      { key: 'description', label: 'Descripción', kind: 'text', placeholder: 'Supermercado de barrio' },
      { key: 'category', label: 'Categoría', kind: 'text', placeholder: 'Alimentación' },
    ],
    searchKeys: ['name', 'category'],
  },
  {
    slug: 'accounts',
    title: 'Cuentas',
    description: 'Efectivo y banco: de dónde sale el dinero de cada movimiento.',
    fetch: () => listAccounts() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) => createAccount({ name: v.name, type: num(v.type) as 1 | 2 }),
    update: (id, v) => updateAccount(id, { name: v.name, type: num(v.type) as 1 | 2 }),
    remove: (id) => deleteAccount(id),
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'typeName', label: 'Tipo' },
      { key: 'balance', label: 'Saldo', money: true },
    ],
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, placeholder: 'Cuenta de ahorro' },
      { key: 'type', label: 'Tipo', kind: 'select', required: true, options: CASH_OR_BANK },
    ],
    searchKeys: ['name'],
  },
  {
    slug: 'platforms',
    title: 'Plataformas',
    description: 'Dónde están las inversiones (Binance, Hapi, un banco…).',
    fetch: () => platformsApi.list() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) => platformsApi.create({ name: v.name, description: v.description, isActive: v.isActive !== '0' }),
    update: (id, v) => platformsApi.update(id, { name: v.name, description: v.description, isActive: v.isActive !== '0' }),
    remove: (id) => platformsApi.remove(id),
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción' },
      { key: 'isActive', label: 'Estado', render: (r) => (r.isActive ? 'Activa' : 'Inactiva') },
    ],
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, placeholder: 'Binance' },
      { key: 'description', label: 'Descripción', kind: 'text', placeholder: 'Exchange principal' },
    ],
    searchKeys: ['name', 'description'],
  },
  {
    slug: 'withdrawal-methods',
    title: 'Métodos de retiro',
    description: 'Cómo sale el dinero de una inversión.',
    fetch: () => withdrawalMethodsApi.list() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) =>
      withdrawalMethodsApi.create({
        name: v.name,
        description: v.description,
        isActive: v.isActive !== '0',
        requiresCreditCard: v.requiresCreditCard === '1',
      }),
    update: (id, v) =>
      withdrawalMethodsApi.update(id, {
        name: v.name,
        description: v.description,
        isActive: v.isActive !== '0',
        requiresCreditCard: v.requiresCreditCard === '1',
      }),
    remove: (id) => withdrawalMethodsApi.remove(id),
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción' },
      { key: 'requiresCreditCard', label: 'Tarjeta', render: (r) => (r.requiresCreditCard ? 'Sí' : 'No') },
    ],
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, placeholder: 'Transferencia' },
      { key: 'description', label: 'Descripción', kind: 'text', placeholder: 'A cuenta bancaria' },
      { key: 'requiresCreditCard', label: 'Requiere tarjeta de crédito', kind: 'checkbox' },
    ],
    searchKeys: ['name', 'description'],
  },
  {
    slug: 'budgets',
    title: 'Presupuestos',
    description: 'Límite mensual por categoría contra el gasto real.',
    fetch: () => listBudgets() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) =>
      createBudget({ categoryId: num(v.categoryId), month: num(v.month), year: num(v.year), limit: moneyStr(v.limit) }),
    update: (id, v) => updateBudget(id, moneyStr(v.limit)),
    remove: (id) => deleteBudget(id),
    columns: [
      { key: 'categoryName', label: 'Categoría' },
      { key: 'limit', label: 'Límite', money: true },
      { key: 'spent', label: 'Gastado', money: true },
    ],
    fields: [
      { key: 'categoryId', label: 'Categoría', kind: 'select', required: true, loadOptions: categoryOptions },
      { key: 'month', label: 'Mes (1-12)', kind: 'number', required: true, placeholder: '10' },
      { key: 'year', label: 'Año', kind: 'number', required: true, placeholder: '2026' },
      { key: 'limit', label: 'Límite', kind: 'money', required: true, placeholder: '400.00' },
    ],
    searchKeys: ['categoryName'],
  },
  {
    slug: 'goals',
    title: 'Metas',
    description: 'Objetivo de ahorro con fecha. El abono se hace desde el detalle.',
    fetch: () => listGoals() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) => createGoal({ name: v.name, target: moneyStr(v.target), deadline: opt(v.deadline) ?? undefined }),
    update: (id, v) => updateGoal(id, { name: v.name, target: moneyStr(v.target), deadline: opt(v.deadline) ?? undefined }),
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'current', label: 'Actual', money: true },
      { key: 'target', label: 'Meta', money: true },
    ],
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, placeholder: 'Fondo de emergencia' },
      { key: 'target', label: 'Objetivo', kind: 'money', required: true, placeholder: '6000.00' },
      { key: 'deadline', label: 'Fecha límite', kind: 'date', placeholder: '2027-03-01' },
    ],
    searchKeys: ['name'],
  },
  {
    slug: 'cards',
    title: 'Tarjetas',
    description: 'Límite, corte y fecha de pago. El pago se registra como movimiento.',
    fetch: () => listCards() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) =>
      createCard({
        bankName: v.bankName,
        creditLimit: moneyStr(v.creditLimit),
        cutOffDay: num(v.cutOffDay),
        paymentDueDay: num(v.paymentDueDay),
        annualInterestRate: moneyStr(v.annualInterestRate || '0'),
      }),
    columns: [
      { key: 'bankName', label: 'Banco' },
      { key: 'creditLimit', label: 'Límite', money: true },
      { key: 'currentBalance', label: 'Deuda', money: true },
    ],
    fields: [
      { key: 'bankName', label: 'Banco', kind: 'text', required: true, placeholder: 'BAC' },
      { key: 'creditLimit', label: 'Límite', kind: 'money', required: true, placeholder: '1000.00' },
      { key: 'cutOffDay', label: 'Día de corte', kind: 'number', required: true, placeholder: '15' },
      { key: 'paymentDueDay', label: 'Día de pago', kind: 'number', required: true, placeholder: '5' },
      { key: 'annualInterestRate', label: 'Tasa anual %', kind: 'money', placeholder: '0' },
    ],
    searchKeys: ['bankName'],
  },
  {
    slug: 'investments',
    title: 'Inversiones',
    description: 'Total = monto − comisión (así lo calcula el backend).',
    fetch: () => listInvestments() as unknown as Promise<Array<Record<string, unknown>>>,
    create: (v) =>
      createInvestment({
        platformId: num(v.platformId),
        amount: moneyStr(v.amount),
        commission: moneyStr(v.commission || '0'),
        transactionType: num(v.transactionType) as 1 | 2,
        transactionDate: v.transactionDate,
      }),
    update: (id, v) =>
      updateInvestment(id, {
        platformId: num(v.platformId),
        amount: moneyStr(v.amount),
        commission: moneyStr(v.commission || '0'),
        transactionType: num(v.transactionType) as 1 | 2,
        transactionDate: v.transactionDate,
      }),
    remove: (id) => deleteInvestment(id),
    columns: [
      { key: 'platformName', label: 'Plataforma' },
      { key: 'amount', label: 'Monto', money: true },
      { key: 'total', label: 'Total', money: true },
    ],
    fields: [
      { key: 'platformId', label: 'Plataforma', kind: 'select', required: true, loadOptions: platformOptions },
      { key: 'amount', label: 'Monto', kind: 'money', required: true, placeholder: '500.00' },
      { key: 'commission', label: 'Comisión', kind: 'money', placeholder: '0' },
      { key: 'transactionType', label: 'Tipo', kind: 'select', required: true, options: [{ value: '2', label: 'Ingreso' }, { value: '1', label: 'Retiro' }] },
      { key: 'transactionDate', label: 'Fecha', kind: 'date', required: true, placeholder: '2026-10-27' },
    ],
    searchKeys: ['platformName'],
  },
];

export const findMaintenance = (slug: string) => MAINTENANCES.find((m) => m.slug === slug);

/** Texto de una fila para la lista, sin depender de la entidad. */
export const rowSummary = (config: MaintenanceConfig, row: Record<string, unknown>): string =>
  config.columns
    .slice(1)
    .map((c) => {
      if (c.render) return c.render(row);
      const value = row[c.key];
      if (c.money) return money(value as number | string);
      return value === null || value === undefined || value === '' ? '—' : String(value);
    })
    .join(' · ');
