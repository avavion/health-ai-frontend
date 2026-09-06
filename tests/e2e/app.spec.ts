import { expect, test } from '@playwright/test';

/*
 * Сценарии без аккаунта: ровно то, что можно проверить, не поднимая API.
 *
 * Экраны дневника показывают данные человека и требуют живой сессии; их
 * проверяют против стенда, а не в CI. Здесь проверяется другое, и не менее
 * важное: что закрытые экраны закрыты, а формы работают до первого запроса.
 */

const screens = ['/ru/app', '/ru/app/entry', '/ru/app/catalog', '/ru/app/reports',
  '/ru/app/summary', '/ru/app/settings'];

test.describe('доступ к приложению', () => {
  for (const screen of screens) {
    test('без входа ' + screen + ' уводит на форму входа', async ({ page }) => {
      await page.goto(screen);
      await expect(page).toHaveURL(/\/ru\/login\?next=/);
    });
  }

  test('после входа человек вернётся туда, куда шёл', async ({ page }) => {
    await page.goto('/ru/app/summary');
    // Заслон запоминает адрес: иначе человек, открывший ссылку на итоги,
    // после входа оказывался бы на «Сегодня» и искал бы её заново.
    await expect(page).toHaveURL(/next=%2Fru%2Fapp%2Fsummary/);
  });
});

test.describe('формы аккаунта', () => {
  test('вход проверяет поля до отправки', async ({ page }) => {
    await page.goto('/ru/login');
    await page.getByRole('button', { name: 'Войти' }).click();
    // Пустая форма до сети не доходит: браузер сам не даст отправить
    // обязательные поля, и адрес остаётся прежним.
    await expect(page).toHaveURL(/\/ru\/login$/);
  });

  test('регистрация начинается с первого шага', async ({ page }) => {
    await page.goto('/ru/register');
    await expect(page.getByText('ШАГ 1')).toBeVisible();
    await expect(page.getByLabel('Имя')).toBeVisible();
  });

  test('без имени дальше первого шага не пускает', async ({ page }) => {
    await page.goto('/ru/register');
    await page.getByRole('button', { name: 'Дальше' }).click();
    // Именно сообщение формы, а не любой alert на странице: Next держит
    // свой, пустой, для объявления смены адреса.
    await expect(page.locator('form [role="alert"]')).toContainText('имя');
  });

  test('календарь даты рождения листает годы', async ({ page }) => {
    await page.goto('/ru/register');
    // Имя кнопки — подпись поля: <label for> перебивает содержимое кнопки.
    await page.getByRole('button', { name: 'Дата рождения' }).click();
    const picker = page.getByRole('dialog', { name: 'Дата рождения' });
    await picker.getByRole('button', { name: '1996', exact: true }).click();
    await expect(picker.getByRole('button', { name: '1994', exact: true })).toBeVisible();
  });

  test('восстановление доступа спрашивает почту', async ({ page }) => {
    await page.goto('/ru/recover');
    await expect(page.getByLabel('Почта')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить ссылку' })).toBeVisible();
  });
});
