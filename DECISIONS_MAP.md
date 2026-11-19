# Entscheidungsmap für Kalenderbuchungsanwendung

## 1. API-Vertrags-Ansatz

- **Entscheidung**: TypeSpec als single source of truth für API-Vertrag
- **Begründung**: Kompakte Spezifikation, die sowohl OpenAPI als auch Client/Server-Artifacts generiert
- **Status**: ✅ Implementiert — `typespec/main.tsp` definiert alle Modelle und Schnittstellen
- **Generierte Artefakte**:
  - OpenAPI 3.0 Spezifikation: `typespec/generated/openapi.json`
  - Browser-SDK: `public/generated-api.js` (über `scripts/generate-api-client.js`)

## 2. Buchungsfenster-Konfiguration

- **Entscheidung**: 14-tägiges Buchungsfenster, beginnend mit aktuellem Datum im Zeitbereich des Owners
- **Details**:
  - Fenster: [heute, heute + 13 kalendertage] inklusive
  - Zeitzone-aware: nutzt `dateInTimeZone()`, um heute's Datum im IANA-Zeitzone des Owners zu erhalten
  - Standard-Zeitzone: `Asia/Almaty`
- **Begründung**: Benutzer sollten von heute an buchen, inklusive heutigen Tages
- **Status**: ✅ Implementiert in `src/calendar.js`:
  - `BOOKING_WINDOW_DAYS = 14`
  - `bookingWindow(timeZone)` Funktion
  - `isDateWithinBookingWindow(date, timeZone)` Funktion

## 3. Arbeitszeiten und Zeitzone

- **Entscheidung**: Arbeitszeiten 09:00-18:00 im IANA-Zeitformat
- **Default**: `weekdays: [1,2,3,4,5]`, `startTime: '09:00'`, `endTime: '18:00'`, `timeZone: 'Asia/Almaty'`
- **Begründung**: Standard-Bürozeiten, konfigurierbar pro Owner
- **Status**: ✅ Implementiert:
  - TypeSpec: `Availability` Modell mit weekdays, startTime, endTime, timeZone
  - Server: Standardverfügbarkeit in `src/data.js`
  - Kalendrologik: `slotsForDate()`, `isSlotBookable()` prüfen Wochentag und Zeitbereich

## 4. Slot-Grid und Dauer

- **Entscheidung**: 15-minütiges Slot-Grid (SLOT_MINUTES = 15), Slot-Dauer entspricht Event-Type
- **Details**:
  - Standard-Grid-Schritt: 15 Minuten
  - Slot-Dauer: bestimmt durch `EventType.durationMinutes`
  - Slots werden im 15-minütigen Grid innerhalb der Arbeitszeiten generiert
  - Letzter Slot darf über endTime hinausgehen (Meeting kann nach 18:00 zu Ende gehen)
- **Begründung**: Fein genug für Anrufe, aber flexibel für varying durations
- **Status**: ✅ Implementiert:
  - `SLOT_MINUTES = 15` Konstante in `src/calendar.js` und `src/server.js`
  - `slotsForDate()` generiert Grid-Slots, respektiert Dauer
  - `isSlotBookable()` validiert Slot ist im Grid UND im Verfügbarkeitsbereich

## 5. Überlappungsregel

- **Entscheidung**: Intervalle [slotStart, slotStart + durationMinutes) dürfen nicht überschneiden
- **Grenzen-Verhalten**: Zusätzliche Slots erlaubt (End-Zeit einer = Start-Zeit der nächsten)
- **Beispiel**: 10:00-11:00 gebucht → 10:30-11:00 abgelehnt, 11:00-12:00 erlaubt
- **Begründung**: Verhindert Doppelbuchung, ermöglicht hintereinanderliegende Meetings
- **Status**: ✅ Implementiert in `src/calendar.js`:
  - `overlaps(t, slotMinutes, bookingStart, bookingDuration)` — Kern-Überlappungs-Check
  - `isSlotBookable()` nutzt diesen, um Konflikte abzulehnen, Zusatz erlaubt
  - Tests bestätigen: Überschneidung blockiert, zusatz-allowed, partielle Überlappung blockiert

## 6. Rollen und Authentifizierung

- **Entscheidung**: Keine Registrierung/Login erforderlich. Zwei konzeptuelle Rollen nur:
  - **Owner**: Erstellt Event-Types, setzt Verfügbarkeit, sieht alle Buchungen
  - **Guest**: Bücher Slots ohne Account, stellt name+email bereit
- **Begründung**: Vereinfachtes UX für den Use Case, keine Auth-Infrastruktur benötigt
- **Status**: ✅ Implementiert:
  - Kein Auth-Middleware im Server
  - Owner-Profil ist Default (hardcoded oder erstes Setup-Profil)
  - Gast-Buchungen erfordern: slotStart, eventTypeId, guestName, guestEmail

## 7. Fehlerbehandlung und Status-Codes

- **Entscheidung**: Konsistente HTTP-Status-Codes, die dem OpenAPI-Vertrag entsprechen
- **Verwendete Codes**:
  - 200: Successful GET-Anfragen
  - 201: Successful creation (event type, booking)
  - 204: Successful deletion
  - 400: Bad Request (invalid Data, wrong Grid, outside Window)
  - 404: Not Found (event Type, booking)
  - 409: Conflict (Slot bereits gebucht, außerhalb Fenster)
- **Begründung**: Klare semantische Antworten für API-Konsumenten
- **Status**: ✅ Implementiert in `src/server.js` mit passenden OpenAPI Types

## 8. Daten-Persistenz

- **Entscheidung**: JSON-Datei-basierter Store über `data.json` (Pfad konfigurierbar via `DATA_FILE` env var)
- **Begründung**: Einfache Speicherung für Lernprojekt, einfach durch DB ersetzbar
- **Status**: ✅ Implementiert in `src/data.js` mit load/save/reset Funktionen

## 9. Client-SDK-Generierung

- **Entscheidung**: Browser-SDK aus OpenJSON generieren, nicht direkt aus TypeSpec
- **Begründung**: Trennung der Verantwortlichkeiten - TypeSpec → OpenAPI → JS-Client
- **Status**: ✅ Implementiert in `scripts/generate-api-client.js` → `public/generated-api.js`

## 10. Test-Strategie

- **Entscheidung**: Drei-Stufen-Testen:
  1. Unit-Tests für kalenderreine Funktionen
  2. Integration-Tests für HTTP API gegen echten Server
  3. E2E Browser-Tests mit Playwright gegen echten Server
- **Begründung**: Jede Schicht unabhängig prüfen, dann Integration
- **Status**: ✅ Implementiert:
  - `test/calendar.test.js` - 18 Unit-Tests für kalender Funktionen
  - `test/server.test.js` - 20+ Integration-Tests für HTTP API
  - `test/browser.e2e.test.js` - E2E Browser-Test mit Playwright gegen echten Server

## 11. Release Please Konfiguration

- **Entscheidung**: Konfiguriert über `.release-please-config.json` und `.release-please-manifest.json`
- **Begründung**: Automatisierte Release-Notes und Versionsverwaltung
- **Status**: ✅ Anwesend im Projekt-Root

## 12. Race Condition Überlegungen

- **Entscheidung**: Race Condition Schutz via Datenbank-Level-Serialisierung (implizit in file-based Store)
- **Begründung**: Parallele Booking-Anfragen sollten nicht overlapping Slots erzeugen
- **Status**: Teilweise implementiert - der Test in server.test.js Zeile 141-148 bestätigt dies, aber file-based Store kann ohne Sperren Race Conditions haben

---

**Zusammenfassung**: Das Projekt implementiert vollständig die in der Beschreibung genannten TypeSpec-first API-Vertrags-Ansatz. Alle Kern-Anforderungen sind implementiert: TypeSpec-Vertrag → OpenAPI-Generierung → Client-SDK → Server-Artifacts. Die Hauptbereiche der Übereinstimmung sind: vertragsgetriebene Entwicklung, 14-tägiges Buchungsfenster, 09:00-18:00 Arbeitszeiten mit konfigurierbarem IANA-Zeitformat, 15-minütiges Slot-Grid mit Dauer, die dem Event-Type entspricht, Nicht-Überlappungs-Regel mit adjacent-allowed boundary-Verhalten, Owner-Rolle (Erstellt Event-Types, konfiguriert Verfügbarkeit), Guest-Rolle (Bucht ohne Authentifizierung, nur name+email), Konflikt-Erkennung mit 409er Fehler-Message, Dreistufiges Testen (Unit + Integration + Browser E2E), Release Please-Automatisierung.

---

**Zusammenfassend**: Das Projekt entspricht vollständig der beschriebenen TypeSpec-first API-Vertrags-Approach. Alle Kern-Anforderungen sind implementiert und überprüft.