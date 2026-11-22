// Интеграционные тесты публичного HTTP API через настоящий сервер.

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { start } = require('../src/server');
const calendar = require('../src/calendar');
const store = require('../src/data');

let baseUrl;
let bookingDate;
let weekendDate;

function dateInAlmaty() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

function dateInWindow(allowedWeekdays) {
  const today = dateInAlmaty();
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(today, offset);
    if (allowedWeekdays.includes(calendar.weekdayOf(date))) return date;
  }
  throw new Error('Подходящая дата не найдена в 14-дневном окне');
}

const request = (route, options) => fetch(`${baseUrl}${route}`, options);

async function createEventType(name, durationMinutes, description = '') {
  const response = await request('/api/event-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, durationMinutes }),
  });
  assert.equal(response.status, 201);
  return response.json();
}

async function createBooking(eventTypeId, slotStart, guestName = 'Гость') {
  return request('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotStart, eventTypeId, guestName, guestEmail: `${guestName}@example.com` }),
  });
}

beforeEach(async () => {
  process.env.DATA_FILE = path.join(os.tmpdir(), `calendar-test-${Date.now()}-${Math.random()}.json`);
  store.reset();
  bookingDate = dateInWindow([1, 2, 3, 4, 5]);
  weekendDate = dateInWindow([6, 7]);
  const server = await start(0);
  baseUrl = `http://localhost:${server.address().port}`;
  return async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  };
});

test('GET /api/event-types возвращает публичные поля типа встречи', async () => {
  const response = await request('/api/event-types');
  assert.equal(response.status, 200);
  const types = await response.json();
  assert.deepEqual(Object.keys(types[0]).sort(), ['description', 'durationMinutes', 'id', 'name']);
});

test('POST /api/event-types создаёт тип, а ошибка данных возвращает 400', async () => {
  const created = await createEventType('Звонок по проекту', 60, 'Обсудить проект');
  assert.equal(created.durationMinutes, 60);
  assert.equal(created.description, 'Обсудить проект');

  const invalid = await request('/api/event-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', durationMinutes: -5 }),
  });
  assert.equal(invalid.status, 400);
});

test('слоты ограничены текущим 14-дневным окном и содержат длительность выбранного типа', async () => {
  const hour = await createEventType('Час', 60);
  const slots = await request(`/api/slots?date=${bookingDate}&eventTypeId=${hour.id}`);
  assert.equal(slots.status, 200);
  const body = await slots.json();
  assert.equal(body[0].start.slice(11), '09:00');
  assert.equal(body[0].end.slice(11), '10:00');

  const beforeWindow = addDays(dateInAlmaty(), -1);
  const rejected = await request(`/api/slots?date=${beforeWindow}&eventTypeId=${hour.id}`);
  assert.equal(rejected.status, 409);
});

test('слоты в нерабочий день пусты, а неверные параметры возвращают 400', async () => {
  const [eventType] = await (await request('/api/event-types')).json();
  const closedDay = await request(`/api/slots?date=${weekendDate}&eventTypeId=${eventType.id}`);
  assert.equal(closedDay.status, 200);
  assert.deepEqual(await closedDay.json(), []);

  const invalid = await request('/api/slots?date=bad');
  assert.equal(invalid.status, 400);
});

test('бронь использует длительность выбранного типа и защищает весь её интервал', async () => {
  const hour = await createEventType('Час', 60);
  const first = await createBooking(hour.id, `${bookingDate}T10:00`, 'Первый');
  assert.equal(first.status, 201);
  assert.equal((await first.json()).durationMinutes, 60);

  const [defaultType] = await (await request('/api/event-types')).json();
  const overlap = await createBooking(defaultType.id, `${bookingDate}T10:30`, 'Второй');
  assert.equal(overlap.status, 409);

  const adjacent = await createBooking(defaultType.id, `${bookingDate}T11:00`, 'Третий');
  assert.equal(adjacent.status, 201);
});

test('новая длинная бронь не может пересечь ранее созданную короткую бронь', async () => {
  const [defaultType] = await (await request('/api/event-types')).json();
  const first = await createBooking(defaultType.id, `${bookingDate}T10:30`);
  assert.equal(first.status, 201);

  const hour = await createEventType('Час', 60);
  const overlap = await createBooking(hour.id, `${bookingDate}T10:00`, 'Пересечение');
  assert.equal(overlap.status, 409);
});

test('одновременные запросы на один интервал дают одну созданную бронь и один конфликт', async () => {
  const [eventType] = await (await request('/api/event-types')).json();
  const results = await Promise.all([
    createBooking(eventType.id, `${bookingDate}T13:00`, 'Первый'),
    createBooking(eventType.id, `${bookingDate}T13:00`, 'Второй'),
  ]);
  assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
});

test('неверная сетка, прошлый день и несуществующий тип имеют ожидаемые ошибки', async () => {
  const [eventType] = await (await request('/api/event-types')).json();
  const notOnGrid = await createBooking(eventType.id, `${bookingDate}T10:10`);
  assert.equal(notOnGrid.status, 400);

  const beforeWindow = await createBooking(eventType.id, `${addDays(dateInAlmaty(), -1)}T10:00`);
  assert.equal(beforeWindow.status, 409);

  const missingType = await createBooking('unknown', `${bookingDate}T10:00`);
  assert.equal(missingType.status, 404);
});

test('прошедшие слоты сегодняшнего дня помечены past, а запись на них отклоняется', async () => {
  // Расписание расширяем на весь день: первый слот 00:00 прошёл при любом времени запуска.
  const fullDay = { weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: '00:00', endTime: '23:59', timeZone: 'Asia/Almaty' };
  const updated = await request('/api/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullDay),
  });
  assert.equal(updated.status, 200);

  const [eventType] = await (await request('/api/event-types')).json();
  const today = dateInAlmaty();

  const slots = await request(`/api/slots?date=${today}&eventTypeId=${eventType.id}`);
  assert.equal(slots.status, 200);
  const body = await slots.json();
  const first = body.find((slot) => slot.start.endsWith('T00:00'));
  assert.equal(first.past, true);

  const tomorrow = addDays(today, 1);
  const futureSlots = await (await request(`/api/slots?date=${tomorrow}&eventTypeId=${eventType.id}`)).json();
  assert.equal(futureSlots.length > 0, true);
  assert.equal(futureSlots.every((slot) => slot.past === false), true);

  const rejected = await createBooking(eventType.id, `${today}T00:00`, 'Прошлое');
  assert.equal(rejected.status, 409);
  assert.match((await rejected.json()).error, /прошёл/);

  const accepted = await createBooking(eventType.id, `${tomorrow}T00:00`, 'Будущее');
  assert.equal(accepted.status, 201);
});

test('владелец обновляет доступность вместе с часовым поясом', async () => {
  const response = await request('/api/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekdays: [6], startTime: '12:00', endTime: '14:00', timeZone: 'Asia/Almaty' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).timeZone, 'Asia/Almaty');

  const invalid = await request('/api/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekdays: [6], startTime: '14:00', endTime: '12:00', timeZone: 'Unknown/Zone' }),
  });
  assert.equal(invalid.status, 400);
});

test('отмена брони освобождает слот и список Owner показывает бронь', async () => {
  const [eventType] = await (await request('/api/event-types')).json();
  const created = await createBooking(eventType.id, `${bookingDate}T11:00`);
  const booking = await created.json();

  const list = await request('/api/bookings');
  assert.equal((await list.json()).length, 1);
  const deleted = await request(`/api/bookings/${booking.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  const slots = await request(`/api/slots?date=${bookingDate}&eventTypeId=${eventType.id}`);
  assert.equal((await slots.json()).find((slot) => slot.start.endsWith('T11:00')).booked, false);
});

test('страницы и сгенерированный SDK доступны с настоящего сервера', async () => {
  const landing = await request('/');
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /href="\/book"/);

  const booking = await request('/book');
  assert.equal(booking.status, 200);
  assert.match(await booking.text(), /type="module" src="\/app.js"/);

  const client = await request('/generated-api.js');
  assert.equal(client.status, 200);
  assert.match(await client.text(), /class CalendarApiClient/);
});
