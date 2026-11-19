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
