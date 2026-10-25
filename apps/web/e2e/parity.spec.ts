import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Paridad mínima: guard + login + rutas protegidas (sin credenciales reales).
test('sin token redirige a /auth/login', async ({ page }) => {
  await page.goto('/savings');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: /Acceso|Sign in/ })).toBeVisible();
});

test('login muestra el formulario y enlaza al registro', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByPlaceholder('correo')).toBeVisible();
  await expect(page.getByPlaceholder('contraseña')).toBeVisible();
  await expect(page.getByRole('link', { name: /Crear cuenta/ })).toBeVisible();
});

test('shell autenticado expone toggles de idioma y tema', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.goto('/auth/login');
  await page.evaluate(() => sessionStorage.setItem('fa_token', 'test'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Idioma|Language/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tema|Theme/ })).toBeVisible();
});

test('toggle de idioma cambia textos es/en', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.goto('/auth/login');
  await page.evaluate(() => sessionStorage.setItem('fa_token', 'test'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
  await page.getByRole('button', { name: /Idioma|Language/ }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('reports exporta CSV con el detalle del reporte', async ({ page }) => {
  await page.goto('/auth/login');
  await page.evaluate(() => sessionStorage.setItem('fa_token', 'test'));
  await page.route('**/api/Reports/merchants/expenses*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        periodStart: '2026-10-01T00:00:00Z',
        periodEnd: '2026-10-31T00:00:00Z',
        totalExpenses: 30.5,
        totalTransactions: 2,
        merchants: [
          { merchantName: 'Súper "El Sol"', category: 'Supermercado', totalAmount: 20.25, transactionCount: 3, percentageOfTotal: 66.4 },
          { merchantName: 'Farmacia', category: 'Salud', totalAmount: 10.25, transactionCount: 1, percentageOfTotal: 33.6 },
        ],
      }),
    }),
  );
  await page.goto('/reports');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('reporte-merchants.csv');
  const csv = readFileSync((await download.path())!, 'utf8');
  expect(csv).toContain('Comercio,Categoría,Total,Mov.,Part. %');
  expect(csv).toContain('"Súper ""El Sol""",Supermercado,20.25,3,66.4');
});
