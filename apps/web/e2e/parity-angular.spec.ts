import { test, expect, type Page } from '@playwright/test';

// Paridad lado a lado Angular (frozen) vs React contra el mismo backend :5063.
// Requiere Angular dev server corriendo (financial-app-frontend: npm start → :4200)
// + E2E_EMAIL/E2E_PASSWORD. Correr:
//   $env:ANGULAR_URL='http://localhost:4200'; npx playwright test parity-angular
// Sin ANGULAR_URL los tests se saltan (la suite normal no depende de Angular).
const ANGULAR = process.env.ANGULAR_URL;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!ANGULAR || !email || !password, 'Define ANGULAR_URL + E2E_EMAIL/E2E_PASSWORD');

const REACT = '/'; // baseURL del config (preview :4173)

async function loginAngular(page: Page) {
  await page.goto(`${ANGULAR}/auth/login`);
  await page.locator('#email').fill(email!);
  await page.locator('#password-input').fill(password!);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/localhost:4200\/$/);
}

async function loginReact(page: Page) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('correo').fill(email!);
  await page.getByPlaceholder('contraseña').fill(password!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/localhost:4173\/$/);
}

/** Primer importe monetario del texto (ej. "$100.00" → "100.00"). */
const amountOf = async (text: string) => (text.match(/[\d,]+\.\d{2}/)?.[0] ?? '').replace(/,/g, '');

const rows = (page: Page) => page.locator('table tbody tr').count();

test('savings: mismo saldo y mismo número de movimientos en Angular y React', async ({ page }) => {
  await loginAngular(page);
  await page.goto(`${ANGULAR}/formularios/savings`);
  await page.waitForLoadState('networkidle');
  const angBalance = await amountOf(await page.locator('.card', { hasText: 'Saldo Actual' }).locator('h2').innerText());
  const angRows = await rows(page);

  await loginReact(page);
  await page.goto(`${REACT}savings`);
  await page.waitForLoadState('networkidle');
  const reactBalance = await amountOf(await page.getByRole('heading', { name: /Ahorros/ }).innerText());
  const reactRows = await rows(page);

  expect(angBalance).not.toBe('');
  expect(reactBalance).toBe(angBalance);
  expect(reactRows).toBe(angRows);
});

test('merchants y cards: mismos conteos de filas en Angular y React', async ({ page }) => {
  await loginAngular(page);
  const ang: Record<string, number> = {};
  for (const p of ['merchants', 'creditcard'] as const) {
    await page.goto(`${ANGULAR}/formularios/${p}`);
    await page.waitForLoadState('networkidle');
    ang[p] = await rows(page);
  }

  await loginReact(page);
  await page.goto(`${REACT}merchants`);
  await page.waitForLoadState('networkidle');
  const reactMerchants = await rows(page);
  await page.goto(`${REACT}cards`);
  await page.waitForLoadState('networkidle');
  const reactCards = await rows(page);

  expect(reactMerchants).toBe(ang.merchants);
  expect(reactCards).toBe(ang.creditcard);
});

test('reports: ambos cargan sin error contra el mismo backend', async ({ page }) => {
  await loginAngular(page);
  await page.goto(`${ANGULAR}/formularios/reports`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.alert-danger')).toHaveCount(0);

  await loginReact(page);
  await page.goto(`${REACT}reports`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Error al cargar')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible();
});
