// HTTP-сервер: REST API по контракту typespec/main.tsp + статический фронтенд.
// Чистый Node.js без зависимостей.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const calendar = require('./calendar');
const store = require('./data');

const PORT = Number(process.env.PORT) || 3000;
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES) || 15;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const uuid = () => crypto.randomUUID();

// ---------- Handlers ----------

async function handleApi(req, res, url) {
  const { pathname } = url;
  const db = store.load();

  // GET /api/event-types
  if (req.method === 'GET' && pathname === '/api/event-types') {
    return json(res, 200, db.eventTypes);
  }

  // POST /api/event-types
  if (req.method === 'POST' && pathname === '/api/event-types') {
    const body = await readBody(req);
    const { name, description, durationMinutes } = body;
    if (!name || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return json(res, 400, { error: 'name и durationMinutes (> 0) обязательны' });
    }
    const eventType = { id: uuid(), name, description: description || '', durationMinutes };
    db.eventTypes.push(eventType);
    store.save();
    return json(res, 201, eventType);
  }

  // DELETE /api/event-types/:id
  const eventTypeId = pathname.match(/^\/api\/event-types\/([^/]+)$/);
  if (req.method === 'DELETE' && eventTypeId) {
    const idx = db.eventTypes.findIndex((t) => t.id === eventTypeId[1]);
    if (idx === -1) return json(res, 404, { error: 'не найден' });
    db.eventTypes.splice(idx, 1);
    store.save();
    return json(res, 204);
  }

  // GET/PUT /api/availability
  if (pathname === '/api/availability') {
    if (req.method === 'GET') return json(res, 200, db.availability);
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const { weekdays, startTime, endTime, timeZone } = body;
      const validDays = Array.isArray(weekdays) && weekdays.every((d) => d >= 1 && d <= 7);
      const validTimes = /^\d{2}:\d{2}$/.test(startTime || '') && /^\d{2}:\d{2}$/.test(endTime || '') && startTime < endTime;
      if (!validDays || !validTimes || !calendar.isValidTimeZone(timeZone)) {
        return json(res, 400, { error: 'weekdays 1..7, startTime < endTime в формате HH:MM и корректный IANA timeZone обязательны' });
      }
      db.availability = { weekdays, startTime, endTime, timeZone };
      store.save();
      return json(res, 200, db.availability);
    }
  }

  // GET /api/slots?date=YYYY-MM-DD
  if (req.method === 'GET' && pathname === '/api/slots') {
    const date = url.searchParams.get('date');
    const eventTypeId = url.searchParams.get('eventTypeId');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !eventTypeId) {
      return json(res, 400, { error: 'нужны параметры date=YYYY-MM-DD и eventTypeId' });
    }
    const eventType = db.eventTypes.find((type) => type.id === eventTypeId);
    if (!eventType) return json(res, 404, { error: 'тип встречи не найден' });
    if (!calendar.isDateWithinBookingWindow(date, db.availability.timeZone)) {
      return json(res, 409, { error: 'дата вне 14-дневного окна записи' });
    }
    const slots = calendar.slotsForDate(db.availability, date, db.bookings, eventType.durationMinutes, SLOT_MINUTES);
    return json(res, 200, slots);
  }

  // GET /api/bookings
  if (req.method === 'GET' && pathname === '/api/bookings') {
    return json(res, 200, db.bookings);
  }

  // POST /api/bookings — запись гостя
  if (req.method === 'POST' && pathname === '/api/bookings') {
    const body = await readBody(req);
    const { slotStart, eventTypeId, guestName, guestEmail, comment } = body;
    if (!slotStart || !eventTypeId || !guestName || !guestEmail) {
      return json(res, 400, { error: 'slotStart, eventTypeId, guestName, guestEmail обязательны' });
    }
    const eventType = db.eventTypes.find((t) => t.id === eventTypeId);
    if (!eventType) {
      return json(res, 404, { error: 'тип встречи не найден' });
    }
    // slotStart должен быть на 15-минутной сетке
    if (!calendar.isOnGrid(slotStart, SLOT_MINUTES)) {
      return json(res, 400, { error: 'slotStart должен быть на 15-минутной сетке' });
    }
    if (!calendar.isSlotBookable(db.availability, slotStart, eventType.durationMinutes, db.bookings, SLOT_MINUTES)) {
      return json(res, 409, { error: 'слот прошёл, занят, вне расписания или вне 14-дневного окна записи' });
    }
    const booking = { id: uuid(), slotStart, eventTypeId, guestName, guestEmail, comment: comment || '', durationMinutes: eventType.durationMinutes };
    db.bookings.push(booking);
    store.save();
    return json(res, 201, booking);
  }

  // DELETE /api/bookings/:id
  const bookingId = pathname.match(/^\/api\/bookings\/([^/]+)$/);
  if (req.method === 'DELETE' && bookingId) {
    const idx = db.bookings.findIndex((b) => b.id === bookingId[1]);
    if (idx === -1) return json(res, 404, { error: 'бронь не найдена' });
    db.bookings.splice(idx, 1);
    store.save();
    return json(res, 204);
  }

  return json(res, 404, { error: 'неизвестный маршрут' });
}

function serveStatic(res, pathname) {
  const file = pathname === '/' ? 'index.html' : pathname === '/book' ? 'book.html' : pathname.replace(/^\//, '');
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not Found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(res, url.pathname);
  } catch (err) {
    return json(res, err.message === 'invalid JSON' ? 400 : 500, { error: err.message });
  }
}

function start(port = PORT) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

if (require.main === module) {
  start().then((server) => {
    console.log(`Календарь звонков: http://localhost:${PORT}`);
    const stop = () => server.close(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}

module.exports = { handler, start, SLOT_MINUTES };
