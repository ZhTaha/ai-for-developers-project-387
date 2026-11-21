const { test, expect } = require('@playwright/test');

/** Дата YYYY-MM-DD через n дней (календарная арифметика по UTC) */
function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** День недели ISO: 1 = понедельник … 7 = воскресенье */
function weekdayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Ближайшая дата для записи: завтра и позже (в пределах окна записи),
 * с днём недели из Availability.
 * min (сегодня) не берём: в выходной день слотов нет вообще, а в будний
 * прошедшие слоты зависят от времени запуска — тест стал бы невоспроизводимым.
 */
async function pickBookableDate(page, request) {
  const availability = await (await request.get('/api/availability')).json();
  const min = await page.locator('#guest-date').getAttribute('min');
  const max = await page.locator('#guest-date').getAttribute('max');
  for (let iso = addDays(min, 1); iso <= max; iso = addDays(iso, 1)) {
    if (availability.weekdays.includes(weekdayOf(iso))) return iso;
  }
  throw new Error(`в окне ${min}…${max} нет дней Availability (${availability.weekdays.join(', ')})`);
}

test('Пустой список броней показывает «Броней пока нет»', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page).toHaveURL(/\/book$/);

  await page.getByRole('button', { name: 'Кабинет владельца' }).click();
  await expect(page.locator('#booking-list')).toContainText('Броней пока нет');
});

test('Строка Брони без темы совпадает со строкой до изменения, тема из пробелов не выводится', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page).toHaveURL(/\/book$/);

  const eventType = page.locator('#guest-event-type');
  await expect(eventType.locator('option')).not.toHaveCount(0);
  const typeName = (await eventType.locator('option').first().textContent()).split(' — ')[0];

  const date = page.locator('#guest-date');
  await expect(date).toHaveAttribute('min', /\d{4}-\d{2}-\d{2}/);
  await date.fill(await pickBookableDate(page, request));
  await date.dispatchEvent('change');

  const slotWithSpaces = page.locator('#guest-slots button:not([disabled])').first();
  await expect(slotWithSpaces).toBeVisible();
  const slotWithSpacesStart = await slotWithSpaces.getAttribute('data-start');
  await slotWithSpaces.click();
  await page.locator('#guest-name').fill('ГостьПробелов');
  await page.locator('#guest-email').fill('spaces@example.com');
  await page.locator('#guest-comment').fill('   ');
  await page.getByRole('button', { name: 'Записаться', exact: true }).last().click();
  await expect(page.locator('#guest-result')).toContainText('Записан на');

  const slotWithoutTopic = page.locator('#guest-slots button:not([disabled])').first();
  await expect(slotWithoutTopic).toBeVisible();
  const slotWithoutTopicStart = await slotWithoutTopic.getAttribute('data-start');
  await slotWithoutTopic.click();
  await page.locator('#guest-name').fill('ГостьБезТемы');
  await page.locator('#guest-email').fill('notopic@example.com');
  await page.locator('#guest-comment').fill('');
  await page.getByRole('button', { name: 'Записаться', exact: true }).last().click();
  await expect(page.locator('#guest-result')).toContainText('Записан на');

  await page.getByRole('button', { name: 'Кабинет владельца' }).click();

  const list = page.locator('#booking-list');
  const expectedRow = (slotStart, name, email) =>
    `${slotStart.replace('T', ' ')} — ${typeName} — ${name} (${email}) Отменить`;

  const spacesRow = list.locator('li', { hasText: 'ГостьПробелов' });
  await expect(spacesRow).toHaveCount(1);
  expect(await spacesRow.textContent()).toBe(expectedRow(slotWithSpacesStart, 'ГостьПробелов', 'spaces@example.com'));

  const noTopicRow = list.locator('li', { hasText: 'ГостьБезТемы' });
  await expect(noTopicRow).toHaveCount(1);
  expect(await noTopicRow.textContent()).toBe(expectedRow(slotWithoutTopicStart, 'ГостьБезТемы', 'notopic@example.com'));
});

test('Guest видит описание типа, выбирает слот и получает подтверждение на настоящем сервере', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page).toHaveURL(/\/book$/);

  const eventType = page.locator('#guest-event-type');
  await expect(eventType.locator('option')).toHaveCount(1);
  await expect(eventType).toContainText('Короткий звонок для знакомства');

  const date = page.locator('#guest-date');
  await expect(date).toHaveAttribute('min', /\d{4}-\d{2}-\d{2}/);
  await date.fill(await pickBookableDate(page, request));
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
  // После перезагрузки страница возвращает «сегодня»: ждём установки min
  // (атрибут ставится асинхронно в init) и восстанавливаем дату, иначе слот
  // этой даты не отрисован и проверка блокировки не находит его.
  await expect(date).toHaveAttribute('min', /\d{4}-\d{2}-\d{2}/);
  await date.fill(await pickBookableDate(page, request));
  await date.dispatchEvent('change');
  await expect(page.locator(`[data-start="${slotStart}"]`)).toBeDisabled();
});

test('Тема разговора видна в строке Брони у владельца и не ломает список', async ({ page, request }) => {
  const topic = 'Обсудить <b>интеграцию</b> & "планы"';

  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page).toHaveURL(/\/book$/);

  const date = page.locator('#guest-date');
  await expect(page.locator('#guest-event-type option')).not.toHaveCount(0);
  await expect(date).toHaveAttribute('min', /\d{4}-\d{2}-\d{2}/);
  await date.fill(await pickBookableDate(page, request));
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
