// Юнит-тесты чистых функций calendar.js. Запуск: node --test test/calendar.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const calendar = require('../src/calendar');

const AVAIL = { weekdays: [1], startTime: '09:00', endTime: '18:00', timeZone: 'Asia/Almaty' }; // понедельник
const NOW = new Date('2026-11-16T08:00:00Z');

test('60-минутная бронь блокирует все пересекающиеся 15-минутные слоты', () => {
  const bookings = [{ slotStart: '2026-11-16T10:00', durationMinutes: 60 }];
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', bookings, 15, 15);
  const busy = slots.filter((s) => s.booked).map((s) => s.start);
  assert.deepEqual(busy, [
    '2026-11-16T10:00',
    '2026-11-16T10:15',
    '2026-11-16T10:30',
    '2026-11-16T10:45',
  ]);
  // примыкающий вплотную слот свободен
  assert.equal(slots.find((s) => s.start === '2026-11-16T11:00').booked, false);
});

test('бронь в 30 минут не блокирует примыкающий слот (касание границ — не пересечение)', () => {
  const bookings = [{ slotStart: '2026-11-16T10:15', durationMinutes: 30 }]; // [10:15, 10:45)
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', bookings, 15, 15);
  assert.equal(slots.find((s) => s.start === '2026-11-16T10:00').booked, false);
  assert.equal(slots.find((s) => s.start === '2026-11-16T10:45').booked, false);
  assert.equal(slots.find((s) => s.start === '2026-11-16T10:30').booked, true);
});

test('частично пересекающийся слот занят', () => {
  const bookings = [{ slotStart: '2026-11-16T10:30', durationMinutes: 20 }]; // [10:30, 10:50)
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', bookings, 15, 15);
  assert.equal(slots.find((s) => s.start === '2026-11-16T10:45').booked, true); // [10:45,11:00) пересекает
  assert.equal(slots.find((s) => s.start === '2026-11-16T11:00').booked, false);
});

test('бронь без durationMinutes считается 15-минутной', () => {
  const bookings = [{ slotStart: '2026-11-16T10:00' }];
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', bookings, 15, 15);
  assert.equal(slots.find((s) => s.start === '2026-11-16T10:00').booked, true);
  assert.equal(slots.find((s) => s.start === '2026-11-16T10:15').booked, false);
});

test('чужая дата не влияет на занятость', () => {
  const bookings = [{ slotStart: '2026-11-17T10:00', durationMinutes: 60 }]; // вторник
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', bookings, 15, 15);
  assert.equal(slots.every((s) => !s.booked), true);
});

test('слоты вычисляются по 15-минутной сетке: окно 09:00–18:00 даёт 36 слотов', () => {
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', [], 15, 15);
  assert.equal(slots.length, 36);
  assert.equal(slots[0].start, '2026-11-16T09:00');
  assert.equal(slots[slots.length - 1].start, '2026-11-16T17:45');
});

test('isSlotBookable: слот может начинаться в последнем интервале окна (выход за endTime допустим)', () => {
  const ok = calendar.isSlotBookable(AVAIL, '2026-11-16T17:45', 60, [], 15, NOW);
  assert.equal(ok, true);
});

test('isSlotBookable: slotStart вне окна — нельзя', () => {
  assert.equal(calendar.isSlotBookable(AVAIL, '2026-11-16T08:45', 15, [], 15, NOW), false);
  assert.equal(calendar.isSlotBookable(AVAIL, '2026-11-16T18:00', 15, [], 15, NOW), false);
});

test('isSlotBookable: slotStart вне 15-минутной сетки — нельзя', () => {
  assert.equal(calendar.isSlotBookable(AVAIL, '2026-11-16T10:10', 15, [], 15, NOW), false);
});

test('isSlotBookable: пересекающаяся бронь блокирует слот', () => {
  // NOW до 10:00 по Алматы: слоты в будущем, блокировка — только из-за пересечения.
  const before = new Date('2026-11-16T04:00:00Z');
  const bookings = [{ slotStart: '2026-11-16T10:00', durationMinutes: 60 }];
  assert.equal(calendar.isSlotBookable(AVAIL, '2026-11-16T10:30', 15, bookings, 15, before), false);
  assert.equal(calendar.isSlotBookable(AVAIL, '2026-11-16T11:00', 15, bookings, 15, before), true);
});

test('длинная новая бронь пересекает уже существующую короткую', () => {
  const bookings = [{ slotStart: '2026-11-16T10:30', durationMinutes: 30 }];
  assert.equal(calendar.isSlotBookable(AVAIL, '2026-11-16T10:00', 60, bookings, 15, NOW), false);
});

test('слоты, начавшиеся к текущему моменту, помечены past в поясе Владельца', () => {
  // NOW = 2026-11-16T08:00Z = 13:00 в Asia/Almaty (пояс UTC+5)
  const slots = calendar.slotsForDate(AVAIL, '2026-11-16', [], 15, 15, NOW);
  const at = (time) => slots.find((slot) => slot.start === `2026-11-16T${time}`);
  assert.equal(at('12:45').past, true); // −15 минут
  assert.equal(at('13:00').past, true); // ровно сейчас — слот прошёл
  assert.equal(at('13:15').past, false); // +15 минут — будущий
});

test('окно записи включает сегодня и следующие 13 календарных дней в часовом поясе Owner', () => {
  assert.deepEqual(calendar.bookingWindow('Asia/Almaty', NOW), { start: '2026-11-16', end: '2026-11-29' });
  assert.equal(calendar.isDateWithinBookingWindow('2026-11-16', 'Asia/Almaty', NOW), true);
  assert.equal(calendar.isDateWithinBookingWindow('2026-11-29', 'Asia/Almaty', NOW), true);
  assert.equal(calendar.isDateWithinBookingWindow('2026-11-30', 'Asia/Almaty', NOW), false);
});
