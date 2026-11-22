// Публичный контракт API «Календаря звонков».
// Окно записи: текущий день и следующие 13 календарных дней в часовом поясе Owner.

import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Calendar API" })
@route("/api")
namespace CalendarApi;

/** Тип встречи, созданный Owner. */
model EventType {
  id: string;
  name: string;
  description: string;
  /** Длительность встречи в минутах. */
  durationMinutes: int32;
}

model CreateEventType {
  name: string;
  description?: string;
  durationMinutes: int32;
}

/** Рабочие часы Owner в указанном IANA-часовом поясе. */
model Availability {
  /** Дни недели: 1 = понедельник, 7 = воскресенье. */
  weekdays: int32[];
  startTime: string;
  endTime: string;
  /** IANA-идентификатор, например Asia/Almaty. */
  timeZone: string;
}

/** Бронь Guest. Интервал: [slotStart, slotStart + durationMinutes). */
model Booking {
  id: string;
  /** Локальное время Owner в его timeZone, начало на 15-минутной сетке. */
  slotStart: string;
  durationMinutes: int32;
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
  comment: string;
}

/** Старт, который доступен, занят или уже прошёл для выбранного EventType. */
model Slot {
  start: string;
  end: string;
  booked: boolean;
  /** Слот уже начался в часовом поясе Владельца: показывается заблокированным. */
  past: boolean;
}

model CreateBooking {
  slotStart: string;
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
  comment?: string;
}

model ErrorBody {
  error: string;
}

model BadRequest {
  @statusCode statusCode: 400;
  @body body: ErrorBody;
}

model NotFound {
  @statusCode statusCode: 404;
  @body body: ErrorBody;
}

/** Некорректное окно бронирования, прошедший слот или пересечение с существующей бронью. */
model Conflict {
  @statusCode statusCode: 409;
  @body body: ErrorBody;
}

model NoContent {
  @statusCode statusCode: 204;
}

@route("/event-types")
interface EventTypes {
  @get list(): EventType[];

  @post create(@body body: CreateEventType): {
    @statusCode statusCode: 201;
    @body body: EventType;
  } | BadRequest;

  @delete
  @route("/{id}")
  remove(@path id: string): NoContent | NotFound;
}

@route("/availability")
interface AvailabilityApi {
  @get get(): Availability;

  @put update(@body body: Availability): Availability | BadRequest;
}

@route("/slots")
interface Slots {
  /**
   * Список 15-минутных стартов на дату для выбранного типа встречи.
   * Старт должен попадать в 14-дневное окно и рабочие часы; последняя встреча
   * может закончиться после endTime.
   */
  @get list(@query date: string, @query eventTypeId: string): Slot[] | BadRequest | NotFound | Conflict;
}

@route("/bookings")
interface Bookings {
  /** Все брони Owner. */
  @get list(): Booking[];

  /** Создать бронь Guest на свободный интервал выбранного типа встречи. */
  @post create(@body body: CreateBooking): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | BadRequest | NotFound | Conflict;

  @delete
  @route("/{id}")
  remove(@path id: string): NoContent | NotFound;
}
