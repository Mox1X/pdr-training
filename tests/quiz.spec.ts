import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signs } from '../src/data/signs';

async function currentSign(page: Page) {
  const src = await page.locator('.sign-stage img').getAttribute('src');
  const sign = signs.find((s) => s.image === src);
  if (!sign) throw new Error(`Unrecognized sign image: ${src}`);
  return sign;
}
async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('starts with local images, supports keyboard, locks answers and resets after refresh', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/ПДР Практика/);
  for (const img of await page.locator('img').all()) {
    await expect(img).toBeVisible();
    expect(await img.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  await checkLayout(page);
  await page.getByRole('button', { name: 'Почати тест' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Далі' })).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  const sign = await currentSign(page);
  await expect(page.locator('.sign-stage img')).toHaveAttribute('alt', 'Дорожній знак, назву якого потрібно визначити');
  const correct = page.locator('.answer-option').filter({ has: page.getByText(sign.name, { exact: true }) });
  await correct.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Правильно!');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  for (const button of await page.locator('.answer-option').all()) await expect(button).toBeDisabled();
  await expect(page.locator('.score')).toContainText('Правильних: 1');
  await page.getByRole('button', { name: 'Далі', exact: true }).click();
  await expect(page.locator('.quiz-topline')).toContainText('Запитання 2 із 10');
  await checkLayout(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Почати тест' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pdr.progress.v1'))).toBeTruthy();
  expect(errors).toEqual([]);
});

test('completes a mixed session, explains mistakes and starts a clean new test', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('start.png'), fullPage: true });
  await page.getByRole('button', { name: 'Почати тест' }).click();
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const sign = await currentSign(page);
    expect(seen.has(sign.id)).toBe(false);
    seen.add(sign.id);
    const options = page.locator('.answer-option');
    await expect(options).toHaveCount(4);
    const button = i % 2 === 0 ? options.filter({ has: page.getByText(sign.name, { exact: true }) }) : options.filter({ hasNot: page.getByText(sign.name, { exact: true }) }).first();
    await button.click();
    await expect(page.getByRole('status')).toContainText(i % 2 === 0 ? 'Правильно!' : 'Цього разу — помилка');
    if (i % 2 === 1) {
      await expect(page.getByRole('status')).toContainText(sign.explanation);
      await expect(page.getByRole('link', { name: /Переглянути в ПДР/ })).toHaveAttribute('href', sign.source);
    }
    await checkLayout(page);
    if (i === 1) await page.screenshot({ path: testInfo.outputPath('feedback.png'), fullPage: true });
    await page.getByRole('button', { name: i === 9 ? 'Показати результат' : 'Далі', exact: true }).click();
  }
  await expect(page.locator('.result-score')).toHaveAttribute('aria-label', '5 правильних відповідей із 10');
  await expect(page.locator('.mistake')).toHaveCount(5);
  await checkLayout(page);
  await page.screenshot({ path: testInfo.outputPath('result.png'), fullPage: true });
  await page.getByRole('button', { name: 'Новий тест' }).click();
  await expect(page.locator('.quiz-topline')).toContainText('Запитання 1 із 10');
  await expect(page.locator('.score')).toContainText('Правильних: 0');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('shows the perfect-score state and remains usable without external network requests', async ({ page }) => {
  const externalRequests: string[] = [];
  await page.route('**/*', async (route) => {
    if (!new URL(route.request().url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
      externalRequests.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Почати тест' }).click();
  for (let i = 0; i < 10; i++) {
    const sign = await currentSign(page);
    await page.locator('.answer-option').filter({ has: page.getByText(sign.name, { exact: true }) }).click();
    await page.getByRole('button', { name: i === 9 ? 'Показати результат' : 'Далі', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Усі знаки впізнано!' })).toBeVisible();
  await expect(page.locator('.result-score')).toHaveAttribute('aria-label', '10 правильних відповідей із 10');
  await expect(page.locator('.mistake')).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test('has a usable fallback if a question image cannot load', async ({ page }) => {
  await page.route('**/signs/*', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Почати тест' }).click();
  await expect(page.locator('.sign-stage').getByRole('alert')).toContainText('Оновіть сторінку');
});

test('exam hides feedback and defers statistics until all twenty answers are submitted', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Екзамен', exact: true }).check();
  await page.getByRole('button', { name: 'Почати екзамен' }).click();
  await expect(page.locator('.answer-hint')).toContainText('після завершення екзамену');
  const ids = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const sign = await currentSign(page);
    expect(ids.has(sign.id)).toBe(false); ids.add(sign.id);
    await page.locator('.answer-option').filter({ has: page.getByText(sign.name, { exact: true }) }).click();
    await expect(page.locator('.is-correct, .is-wrong, .option-status')).toHaveCount(0);
    await expect(page.locator('.sign-stage img')).toHaveAttribute('alt', 'Дорожній знак, назву якого потрібно визначити');
    await expect(page.locator('.score')).not.toContainText('Правильних');
    await expect(page.getByRole('link', { name: /Переглянути в ПДР/ })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('pdr.progress.v1'))).toBeNull();
    await page.getByRole('button', { name: i === 19 ? 'Показати результат' : 'Далі', exact: true }).click();
  }
  await expect(page.locator('.result-score')).toHaveAttribute('aria-label', '20 правильних відповідей із 20');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pdr.progress.v1')!));
  expect(Object.keys(stored.signs)).toHaveLength(20);
  expect(Object.values(stored.signs).every((s: any) => s.correct === 1)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Статистика', exact: true }).click();
  await expect(page.getByText('Вивчено 0 із 42 · Ще не перевірено: 22')).toBeVisible();
});

test('filters categories and teaches a repeated mistake over three distinct sessions', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Робота над помилками', exact: true }).check();
  await expect(page.getByText('У вибраних категоріях немає знаків для роботи над помилками.')).toBeVisible();
  await page.getByRole('button', { name: 'Перейти до навчання' }).click();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.uncheck();
  await expect(page.getByRole('button', { name: 'Почати тест', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Таблички', exact: true }).check();
  await page.getByRole('button', { name: 'Почати тест', exact: true }).click();
  await expect(page.locator('.quiz-topline')).toContainText('із 6');
  const sign = await currentSign(page);
  expect(sign.category).toBe('plate');
  await page.locator('.answer-option').filter({ hasNot: page.getByText(sign.name, { exact: true }) }).first().click();
  await page.getByRole('button', { name: 'Практика', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio', { name: 'Робота над помилками', exact: true }).check();
    await page.getByRole('button', { name: 'Повторити помилки', exact: true }).click();
    await expect(page.locator('.quiz-topline')).toContainText('із 1');
    await page.locator('.answer-option').filter({ has: page.getByText(sign.name, { exact: true }) }).click();
    await page.getByRole('button', { name: 'Показати результат', exact: true }).click();
    await page.getByRole('button', { name: 'Практика', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Статистика', exact: true }).click();
  await expect(page.getByText('Вивчено 1 із 42 · Ще не перевірено: 41')).toBeVisible();
  await checkLayout(page);
  await page.screenshot({ path: info.outputPath('statistics.png'), fullPage: true });
  await page.getByRole('button', { name: 'Скинути статистику', exact: true }).click();
  await page.getByRole('button', { name: 'Скасувати', exact: true }).click();
  await expect(page.getByText('Вивчено 1 із 42 · Ще не перевірено: 41')).toBeVisible();
  await page.getByRole('button', { name: 'Скинути статистику', exact: true }).click();
  await page.getByRole('button', { name: 'Так, скинути прогрес', exact: true }).click();
  await expect(page.getByText('Вивчено 0 із 42 · Ще не перевірено: 42')).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('pdr.progress.v1'))).toBeNull();
});

test('handles corrupted and unavailable browser storage', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pdr.progress.v1', '{bad'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Не вдалося прочитати прогрес');
  await page.getByRole('button', { name: 'Почати тест', exact: true }).click();
  await page.locator('.answer-option').first().click();
  expect(await page.evaluate(() => localStorage.getItem('pdr.progress.v1'))).toBe('{bad');
});

test('abandons an unfinished exam without recording answers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Екзамен', exact: true }).check();
  await page.getByRole('button', { name: 'Почати екзамен' }).click();
  await page.locator('.answer-option').first().click();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('pdr.progress.v1'))).toBeNull();
});

test('continues in memory when browser writes are denied', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('denied'); }; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Почати тест', exact: true }).click();
  const sign = await currentSign(page);
  await page.locator('.answer-option').filter({ hasNot: page.getByText(sign.name, { exact: true }) }).first().click();
  await expect(page.getByRole('alert')).toContainText('Збереження недоступне');
  await page.getByRole('button', { name: 'Статистика', exact: true }).click();
  await expect(page.locator('.mistake')).toHaveCount(1);
});

test('shows recurring confusion pairs after reload', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('pdr.progress.v1', JSON.stringify({ version: 1, signs: { '1.1': { correct: 0, wrong: 2, streak: 0, lastSessionId: 'seed', confusions: { '1.2': 2 } } } })));
  await page.goto('/');
  await page.getByRole('button', { name: 'Статистика', exact: true }).click();
  await expect(page.locator('.confusion-pair')).toContainText('Небезпечний поворот праворуч');
  await expect(page.locator('.confusion-pair')).toContainText('Небезпечний поворот ліворуч');
  await checkLayout(page);
  await page.screenshot({ path: info.outputPath('confusions.png'), fullPage: true });
});


test('starts on local-network HTTP where randomUUID is unavailable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Почати тест', exact: true }).click();
  await expect(page.locator('.quiz-topline')).toContainText('Запитання 1 із 10');
  await page.locator('.answer-option').first().click();
  expect(await page.evaluate(() => localStorage.getItem('pdr.progress.v1'))).toBeTruthy();
});
