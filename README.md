# Календарь звонков (продолжение)

Второй этап проекта: готовое приложение «Календарь звонков» из первого проекта, вокруг которого автоматизирован процесс разработки в GitHub — разбор задач, реализация, ревью и регулярные проверки выполняются агентами, решения остаются за человеком.

[![hexlet-check](https://github.com/ZhTaha/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ZhTaha/ai-for-developers-project-387/actions)

**🔗 Работающее приложение (из первого проекта): https://call-calendar-6ymh.onrender.com**

- Гостевая запись: https://call-calendar-6ymh.onrender.com/book
- Бесплатный сервис засыпает после простоя: первый запрос после паузы отвечает дольше обычного (cold start) — если страница не открывается сразу, повторите запрос через минуту.

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Первый проект (источник приложения)

- Репозиторий первого проекта: https://github.com/ZhTaha/ai-for-developers-project-386
- Исходная спецификация и тикеты: [`SPEC_AND_TICKETS.md`](https://github.com/ZhTaha/ai-for-developers-project-386/blob/main/SPEC_AND_TICKETS.md) (локальная копия — [`SPEC_AND_TICKETS.md`](SPEC_AND_TICKETS.md))
- Решения первого проекта: [`DECISIONS_MAP.md`](https://github.com/ZhTaha/ai-for-developers-project-386/blob/main/DECISIONS_MAP.md) и [`docs/adr/`](https://github.com/ZhTaha/ai-for-developers-project-386/tree/main/docs/adr) (локальные копии — [`DECISIONS_MAP.md`](DECISIONS_MAP.md), [`docs/adr/`](docs/adr/))
- Описание приложения и деплоя: [README первого проекта](https://github.com/ZhTaha/ai-for-developers-project-386/blob/main/README.md)

## Что автоматизируем в этом проекте

1. **Разбор задач** — агент разбирает обращение пользователя, скиллы `to-spec` и `to-tickets` оформляют согласованные решения в спецификацию и тикеты в GitHub Issues.
2. **Реализация** — скилл `implement-spec` выполняет согласованные тикеты, объединяет результаты в общей ветке и готовит pull request.
3. **Ревью** — другой агент проверяет изменения, автор дорабатывает код по замечаниям из обсуждения и строк diff в той же ветке.
4. **Регулярные проверки** — по расписанию агент анализирует отчёт о состоянии приложения и создаёт issue по новым находкам (предварительно проверяя, нет ли уже задачи о той же проблеме).
5. **Ограничения** — урезаны права воркфлоу, число запусков и круг тех, кто может запускать автоматизацию.

Человек решает, какую задачу брать в работу, утверждает план, оценивает риск изменения и принимает решение о мерже.

Настройки агентов — в [`AGENTS.md`](AGENTS.md) и [`docs/agents/`](docs/agents/) (трекер задач, метки триажа, доменные документы). Словарь домена — [`GLOSSARY.md`](GLOSSARY.md), решения — [`DECISIONS_MAP.md`](DECISIONS_MAP.md) и [`docs/adr/`](docs/adr/).

## Стек

- Node.js (>= 22), JavaScript (ES-модули), чистый Node.js без runtime-зависимостей
- TypeSpec — контракт API (`typespec/main.tsp` → `typespec/generated/openapi.json`)
- Тесты: `node --test` (unit + интеграционные) и Playwright (E2E в браузере)
- Linter: ESLint
- Docker — сборка и запуск в контейнере
- GitHub Actions — CI и автоматические проверки
- mise — фиксированные версии инструментов и команды проекта

## Установка

Требуется [mise](https://mise.jdx.dev) (версии инструментов зафиксированы в `mise.toml`) и Node.js 22.

```bash
git clone https://github.com/ZhTaha/ai-for-developers-project-387.git
cd ai-for-developers-project-387
mise install
npm install
```

## Запуск приложения

Если публичный адрес недоступен, приложение запускается локально:

```bash
mise run start
# или без mise:
PORT=3000 node src/server.js
# или через make:
make start
```

Приложение будет доступно по адресу: http://localhost:3000
Страница гостевой записи: http://localhost:3000/book

Фоновый dev-сервер (под управлением pitchfork):

```bash
mise daemons start server
mise daemons stop server
```

### Запуск в Docker

```bash
docker build -t calendar-app .
docker run -p 3000:3000 -e PORT=3000 calendar-app
# или
docker compose up -d
```

## Проверки

```bash
mise run check   # контракт TypeSpec → OpenAPI → SDK, ESLint, тесты, mutation-тест
```

Отдельно:

```bash
mise run test       # unit + интеграционные + E2E (Playwright)
mise run lint       # ESLint
mise run contract   # TypeSpec → OpenAPI
mise run generate   # OpenAPI → браузерный SDK
mise run mutation   # проверка, что тест ловит нарушенное правило пересечения
```

## GitHub Actions (CI)

- `.github/workflows/ci.yml` — `mise run check` на каждый push и pull request
- `.github/workflows/hexlet-check.yml` — автоматические тесты Хекслета; **не удалять и не переименовывать ни его, ни репозиторий**
- `.github/workflows/release-please.yml` — релизы по Conventional Commits

## Окружение

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `3000` | Порт сервера |
| `SLOT_MINUTES` | `15` | Шаг сетки слотов |
| `DATA_FILE` | `./data.json` | Путь к файлу с данными |

## Лицензия

MIT

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
