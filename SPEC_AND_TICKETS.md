# Specification and Tickets for Calendar Booking Application

## Summary of Specification

Based on the TypeSpec contract (`typespec/main.tsp`) and generated OpenAPI (`typespec/generated/openapi.json`), the application provides:

### API Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/api/event-types` | GET | List all event types |
| `/api/event-types` | POST | Create new event type |
| `/api/event-types/{id}` | DELETE | Remove event type |
| `/api/availability` | GET | Get working hours configuration |
| `/api/availability` | PUT | Update working hours |
| `/api/slots` | GET | List available slots for a date and event type |
| `/api/bookings` | GET | List all bookings |
| `/api/bookings` | POST | Create a new booking |
| `/api/bookings/{id}` | DELETE | Cancel a booking |

### Models

- **EventType**: id, name, description, durationMinutes
- **Availability**: weekdays[], startTime, endTime, timeZone
- **Booking**: id, slotStart, durationMinutes, eventTypeId, guestName, guestEmail, comment
- **Slot**: start, end, booked

### Key Rules

1. **14-day booking window**: From current date in Owner's timezone, inclusive
2. **Working hours**: 09:00-18:00 in Owner's IANA timezone (configurable)
3. **15-minute slot grid**: All start times on 15-minute boundaries
4. **No overlapping intervals**: Adjacent allowed (end time of one = start time of next)
5. **Slot duration**: Matches selected EventType.durationMinutes
6. **Owner role**: Creates event types, configures availability, views all bookings
7. **Guest role**: Books slots without authentication, provides name+email

### Tickets

| Ticket | Status | Description | Dependencies |
|--------|--------|-------------|-------------|
| Ticket 1 | ✅ Ready | Contract chain - list event types (full stack test) | None (base) |
| Ticket 2 | ✅ Ready | Create event type | Ticket 1 |
| Ticket 3 | ✅ Ready | Availability management | Ticket 1 |
| Ticket 4 | ✅ Ready | Slot lookup | Ticket 1, 3 |
| Ticket 5 | ✅ Ready | Create booking (guest) - full rule validation | Ticket 1, 3, 4 |
| Ticket 6 | ✅ Ready | List bookings | Ticket 1 |
| Ticket 7 | ✅ Ready | Cancel booking | Ticket 6 |
| Ticket 8 | ✅ Ready | Browser E2E - guest booking flow | Ticket 1, 5 |
| Ticket 9 | ✅ Ready | Regression - conflict rule mutation test | Ticket 5 |
| Ticket 10 | ✅ Ready | Release Please setup | All preceding |

### Test Commands Summary

| Purpose | Command |
|---------|---------|
| Unit tests (calendar functions) | `node --test test/calendar.test.js` |
| Integration tests (HTTP API) | `node --test test/server.test.js` |
| E2E browser tests | `playwright test` |
| All checks | `mise run check` |
| Contract generation | `mise run contract` |
| Full generation | `mise run generate` |
| Mutation test (conflict rule) | `node scripts/verify-booking-rule.js` |

---

**Note**: All tickets are vertically sliced through the full stack: contract (TypeSpec/OpenAPI) → generated SDK → server implementation → HTTP API → interface/browser. Dependencies flow naturally: Ticket 1 is foundation, subsequent tickets build upon it.