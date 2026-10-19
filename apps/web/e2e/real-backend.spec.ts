import { test, expect, type Page } from '@playwright/test';

// Paridad real contra el backend .NET (:5063) con usuario de prueba.
// Correr: $env:E2E_EMAIL='...'; $env:E2E_PASSWORD='...'; npx playwright test
// Sin credenciales: los tests se saltan (no rompen CI local).
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, 'Define E2E_EMAIL y E2E_PASSWORD para correr contra el backend real');

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.getByPlaceholder('correo').fill(email!);
  await page.getByPlaceholder('contraseña').fill(password!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/localhost:4173\/$/);
}

test('login real → dashboard sin errores de API', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
  await expect(page.locator('.balance-strip__total')).not.toHaveText('');
  await expect(page.getByText('Error al cargar')).toHaveCount(0);
});

test('401 (token inválido) → logout y redirect a /auth/login', async ({ page }) => {
  await login(page);
  await page.evaluate(() => sessionStorage.setItem('fa_token', 'token-invalido'));
  await page.goto('/savings');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('módulos clave cargan contra :5063 sin estado de error', async ({ page }) => {
  await login(page);
  const routes: [string, RegExp][] = [
    ['/savings', /Ahorros/],
    ['/categories', /Categorías/],
    ['/merchants', /Comercios/],
    ['/cards', /Tarjetas/],
    ['/reports', /Reportes/],
  ];
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    await expect(page.getByText('Error al cargar')).toHaveCount(0);
  }
});
