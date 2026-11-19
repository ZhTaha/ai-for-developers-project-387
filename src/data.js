// Хранилище данных: JSON-файл (путь задаётся переменной dataFile()).
// Достаточно для учебного проекта; интерфейс позволяет заменить на БД.

const fs = require('node:fs');
const path = require('node:path');

function dataFile() {
  return process.env.DATA_FILE || path.join(__dirname, '..', 'data.json');
}

const defaults = {
  eventTypes: [
    {
      id: 'intro-call',
      name: 'Знакомство',
      description: 'Короткий звонок для знакомства',
      durationMinutes: 30,
    },
  ],
  availability: { weekdays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00', timeZone: 'Asia/Almaty' },
  bookings: [],
};

let cache = null;

const DEFAULT_BOOKING_MINUTES = 15;

/** Обратная совместимость: брони без валидной durationMinutes считаются 15-минутными */
function normalizeBooking(b) {
  const ok = Number.isInteger(b.durationMinutes) && b.durationMinutes > 0;
  return ok ? b : { ...b, durationMinutes: DEFAULT_BOOKING_MINUTES };
}

function normalizeAvailability(availability) {
  return { ...defaults.availability, ...(availability || {}) };
}

function load() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
    cache = {
      ...defaults,
      ...parsed,
      availability: normalizeAvailability(parsed.availability),
      bookings: (parsed.bookings || defaults.bookings).map(normalizeBooking),
    };
  } catch {
    cache = structuredClone(defaults);
    cache.bookings = cache.bookings.map(normalizeBooking);
  }
  return cache;
}

function save() {
  fs.writeFileSync(dataFile(), JSON.stringify(cache, null, 2));
}

function reset() {
  cache = null;
  try {
    fs.unlinkSync(dataFile());
  } catch {
    /* файла нет — ок */
  }
}

module.exports = { load, save, reset, dataFile };
