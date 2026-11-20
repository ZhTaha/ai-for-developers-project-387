import { CalendarApiClient } from './generated-api.js';

const client = new CalendarApiClient();
const $ = (selector) => document.querySelector(selector);

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

let selectedSlot = null;
let eventTypes = [];

function showTab(tab) {
  $('#view-guest').hidden = tab !== 'guest';
  $('#view-admin').hidden = tab !== 'admin';
  $('#tab-guest').classList.toggle('active', tab === 'guest');
  $('#tab-admin').classList.toggle('active', tab === 'admin');
}

$('#tab-guest').onclick = () => showTab('guest');
$('#tab-admin').onclick = () => showTab('admin');

function dateInTimeZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

async function loadEventTypes() {
  eventTypes = await client.listEventTypes();
  $('#guest-event-type').innerHTML = eventTypes
    .map((type) => `<option value="${type.id}">${type.name} — ${type.description} (${type.durationMinutes} мин)</option>`)
    .join('');
  $('#event-type-list').innerHTML = eventTypes
    .map((type) => `<li>${type.name} — ${type.description} — ${type.durationMinutes} мин <button data-del="${type.id}">✕</button></li>`)
    .join('');
}

$('#event-type-form').onsubmit = async (event) => {
  event.preventDefault();
  await client.createEventType({
    name: $('#et-name').value,
    description: $('#et-description').value,
    durationMinutes: Number($('#et-duration').value),
  });
  $('#et-name').value = '';
  $('#et-description').value = '';
  await loadEventTypes();
  await loadSlots();
};

$('#event-type-list').onclick = async (event) => {
  const id = event.target.dataset.del;
  if (id) {
    await client.deleteEventType(id);
    await loadEventTypes();
    await loadSlots();
  }
};

async function loadAvailability() {
  const availability = await client.getAvailability();
  document.querySelectorAll('#weekday-checks input').forEach((checkbox) => {
    checkbox.checked = availability.weekdays.includes(Number(checkbox.value));
  });
  $('#av-start').value = availability.startTime;
  $('#av-end').value = availability.endTime;
  $('#av-time-zone').value = availability.timeZone;

  const min = dateInTimeZone(availability.timeZone);
  const max = addDays(min, 13);
  $('#guest-date').min = min;
  $('#guest-date').max = max;
  if (!$('#guest-date').value || $('#guest-date').value < min || $('#guest-date').value > max) {
    $('#guest-date').value = min;
  }
}

$('#availability-form').onsubmit = async (event) => {
  event.preventDefault();
  const weekdays = [...document.querySelectorAll('#weekday-checks input:checked')].map((checkbox) => Number(checkbox.value));
  await client.updateAvailability({
    weekdays,
    startTime: $('#av-start').value,
    endTime: $('#av-end').value,
    timeZone: $('#av-time-zone').value,
  });
  await loadAvailability();
  await loadSlots();
};

$('#guest-date').onchange = loadSlots;
$('#guest-event-type').onchange = loadSlots;

async function loadSlots() {
  const date = $('#guest-date').value;
  const eventTypeId = $('#guest-event-type').value;
  if (!date || !eventTypeId) return;
  try {
    const slots = await client.listSlots(date, eventTypeId);
    $('#guest-slots').innerHTML = slots.length
      ? slots
          .map((slot) => {
            const label = `${slot.start.slice(11, 16)}–${slot.end.slice(11, 16)}`;
            return `<button class="slot ${slot.booked ? 'booked' : ''}" ${slot.booked ? 'disabled' : ''} data-start="${slot.start}">${label}</button>`;
          })
          .join('')
      : '<p>Нет слотов на этот день</p>';
    $('#guest-form').hidden = true;
    $('#guest-result').textContent = '';
  } catch (error) {
    $('#guest-slots').innerHTML = '';
    $('#guest-result').textContent = `❌ ${error.message}`;
  }
}

$('#guest-slots').onclick = (event) => {
  if (!event.target.dataset.start) return;
  selectedSlot = event.target.dataset.start;
  document.querySelectorAll('#guest-slots .slot').forEach((button) => button.classList.remove('selected'));
  event.target.classList.add('selected');
  $('#guest-form').hidden = false;
};

$('#guest-form').onsubmit = async (event) => {
  event.preventDefault();
  try {
    await client.createBooking({
      slotStart: selectedSlot,
      eventTypeId: $('#guest-event-type').value,
      guestName: $('#guest-name').value,
      guestEmail: $('#guest-email').value,
      comment: $('#guest-comment').value,
    });
    $('#guest-form').hidden = true;
    await Promise.all([loadSlots(), loadBookings()]);
    $('#guest-result').textContent = `✅ Записан на ${selectedSlot.replace('T', ' ')}`;
  } catch (error) {
    $('#guest-result').textContent = `❌ ${error.message}`;
  }
};

async function loadBookings() {
  const bookings = await client.listBookings();
  $('#booking-list').innerHTML = bookings.length
    ? bookings
        .map((booking) => {
          const type = eventTypes.find((eventType) => eventType.id === booking.eventTypeId);
          const topic = booking.comment ? ` — ${escapeHtml(booking.comment)}` : '';
          return `<li>${booking.slotStart.replace('T', ' ')} — ${type ? type.name : ''} — ${booking.guestName} (${booking.guestEmail})${topic} <button data-cancel="${booking.id}">Отменить</button></li>`;
        })
        .join('')
    : '<li>Броней пока нет</li>';
}

$('#booking-list').onclick = async (event) => {
  const id = event.target.dataset.cancel;
  if (id) {
    await client.deleteBooking(id);
    await Promise.all([loadBookings(), loadSlots()]);
  }
};

async function init() {
  await loadAvailability();
  await loadEventTypes();
  await Promise.all([loadSlots(), loadBookings()]);
}

init();
