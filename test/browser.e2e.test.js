const { test, expect } = require('@playwright/test');

test('Guest видит описание типа, выбирает слот и получает подтверждение на настоящем сервере', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page).toHaveURL(/\/book$/);

  const eventType = page.locator('#guest-event-type');
  await expect(eventType.locator('option')).toHaveCount(1);
  await expect(eventType).toContainText('Короткий звонок для знакомства');

  const date = page.locator('#guest-date');
  const min = await date.getAttribute('min');
  await date.fill(min);
  await date.dispatchEvent('change');

  const slot = page.locator('#guest-slots button:not([disabled])').first();
  await expect(slot).toBeVisible();
  const slotStart = await slot.getAttribute('data-start');
  await slot.click();
  await page.locator('#guest-name').fill('Анна');
  await page.locator('#guest-email').fill('anna@example.com');
  await page.getByRole('button', { name: 'Записаться', exact: true }).last().click();
  await expect(page.locator('#guest-result')).toContainText('Записан на');

  await page.reload();
  await expect(page.locator(`[data-start="${slotStart}"]`)).toBeDisabled();
});

test('Тема разговора видна в строке Брони у владельца и не ломает список', async ({ page }) => {
  const topic = 'Обсудить <b>интеграцию</b> & "планы"';

  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page).toHaveURL(/\/book$/);

  const date = page.locator('#guest-date');
  await expect(page.locator('#guest-event-type option')).not.toHaveCount(0);
  await expect(date).toHaveAttribute('min', /\d{4}-\d{2}-\d{2}/);
  const min = await date.getAttribute('min');
  await date.fill(min);
  await date.dispatchEvent('change');

  const slotWithTopic = page.locator('#guest-slots button:not([disabled])').first();
  await expect(slotWithTopic).toBeVisible();
  const slotWithTopicStart = await slotWithTopic.getAttribute('data-start');
  await slotWithTopic.click();
  await page.locator('#guest-name').fill('Борис');
  await page.locator('#guest-email').fill('boris@example.com');
  await page.locator('#guest-comment').fill(topic);
  await page.getByRole('button', { name: 'Записаться', exact: true }).last().click();
  await expect(page.locator('#guest-result')).toContainText('Записан на');

  await expect(page.locator(`[data-start="${slotWithTopicStart}"]`)).toBeDisabled();
  const slotWithoutTopic = page.locator('#guest-slots button:not([disabled])').first();
  await expect(slotWithoutTopic).toBeVisible();
  await slotWithoutTopic.click();
  await page.locator('#guest-name').fill('Вера');
  await page.locator('#guest-email').fill('vera@example.com');
  await page.locator('#guest-comment').fill('');
  await page.getByRole('button', { name: 'Записаться', exact: true }).last().click();
  await expect(page.locator('#guest-result')).toContainText('Записан на');

  await page.getByRole('button', { name: 'Кабинет владельца' }).click();

  const list = page.locator('#booking-list');
  const withTopic = list.locator('li', { hasText: 'Борис' });
  await expect(withTopic).toHaveCount(1);
  await expect(withTopic).toContainText('Борис (boris@example.com)');
  await expect(withTopic).toContainText(topic);
  await expect(withTopic.locator('b')).toHaveCount(0);

  const withoutTopic = list.locator('li', { hasText: 'Вера' });
  await expect(withoutTopic).toHaveCount(1);
  await expect(withoutTopic).toContainText('Вера (vera@example.com)');
  await expect(withoutTopic).not.toContainText('Обсудить');

  await withTopic.getByRole('button', { name: 'Отменить' }).click();
  await expect(list.locator('li', { hasText: 'Борис' })).toHaveCount(0);
  await expect(withoutTopic).toBeVisible();
  await expect(withoutTopic.getByRole('button', { name: 'Отменить' })).toBeVisible();
});
