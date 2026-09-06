import { expect, test } from '@playwright/test';

test.describe('лендинг', () => {
  test('корень уводит на локаль и показывает герой', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(ru|en)$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('все разделы на месте', async ({ page }) => {
    await page.goto('/ru');
    for (const id of ['how', 'features', 'compare', 'free', 'support']) {
      await expect(page.locator('#' + id)).toBeVisible();
    }
  });

  test('тема переключается и запоминается', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('button', { name: 'Тёмная' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('форма поддержки валидируется на клиенте', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('button', { name: 'Отправить обращение' }).click();
    // Именно сообщение формы: пустой alert Next держит для объявления адреса.
    await expect(page.locator('form [role="alert"]')).toContainText('почту');
  });

  test('переключение языка ведёт на английскую версию', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('link', { name: 'EN', exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
  });
});

test('правовая страница открывается и ссылается назад', async ({ page }) => {
  await page.goto('/ru/legal/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Назад на главную/ })).toBeVisible();
});
