# AGENTS.md

Календарь звонков: бронирование тайм-слотов. Чистый Node.js без runtime-зависимостей, контракт API — TypeSpec (`typespec/main.tsp` → `typespec/generated/openapi.json`).

## Команды (mise)

- `mise run start` — запустить приложение на http://localhost:3000 (или `mise daemons start server` — фоновый dev-сервер, `mise daemons stop server` — остановить)
- `mise run test` — тесты (node --test)
- `mise run lint` — ESLint (`src/`, `test/`, `public/`)
- `mise run contract` — компиляция TypeSpec-контракта в OpenAPI
- `mise run check` — все проверки: контракт + линтер + тесты. Её же запускают CI (`.github/workflows/ci.yml`) и git-хуки hk (pre-commit — eslint, pre-push — check, commit-msg — Conventional Commits)

Версии инструментов зафиксированы в `mise.toml`, npm-пакеты (TypeSpec, eslint) — в `package.json`/`package-lock.json`.

## Правила

- Коммиты — по Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:` и т.д. (`https://www.conventionalcommits.org/ru/`).
- Коммит реализации ссылается на тикет, который он закрывает, например `feat: запись на свободный слот (#12)`. GitHub превращает номер в ссылку, и по истории видно, какой коммит какую задачу делал.
- Обновляя REST API, меняйте контракт `typespec/main.tsp` вместе с `src/server.js` и тестами; `mise run check` должен быть зелёным.
- Хранилище — JSON-файл (`data.json`, путь через `DATA_FILE`); данные коммиту не подлежат.
- В AGENTS.md названы генерируемые пути и записан запрет править их руками: `typespec/generated/openapi.json`, `public/generated-api.js`.
- Если артефакты коммитятся, CI повторяет генерацию и проверяет изменения, включая новые файлы. Если они не коммитятся, CI генерирует их из чистого состояния перед сборкой и тестами.
- Отдельно проверьте, что обращения фронтенда к контрактному API идут через SDK, а коды и тела ответов настоящего сервера совпадают с контрактом.
- Генерация повторяется в CI. Генерируемые пути и запрет ручных изменений записаны в AGENTS.md.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`ZhTaha/ai-for-developers-project-387`), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the repo root, decisions in `docs/adr/`. See `docs/agents/domain.md`.