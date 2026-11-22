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
- `.github/workflows/opencode.yml` — агент OpenCode по команде из комментария (описание ниже)
- `.github/workflows/triage.yml` — автотриаж новых обращений без команды (описание ниже)
- `.github/workflows/pr-review.yml` — авторевью на pull request с лимитом запусков модели (описание ниже)
- `.github/workflows/browser-check.yml` — независимая браузерная проверка с артефактом trace (описание ниже)

### Воркфлоу агента OpenCode (`.github/workflows/opencode.yml`)

- **Событие**: комментарий с командой `/oc` или `/opencode` — в issue или PR (`issue_comment`) и в строке diff PR (`pull_request_review_comment`), только `types: [created]`: правка комментария вызова не повторяет.
- **Назначение**: агент читает обсуждение issue/PR и задачу, отвечает комментарием от имени приложения; при необходимости правит ветку PR. Настройки трекера и меток — [`docs/agents/`](docs/agents/), правила и команды проекта — [`AGENTS.md`](AGENTS.md), они читаются агентом из репозитория.
- **Скиллы на раннере**: `to-spec`, `to-tickets`, `implement-spec` лежат в репозитории в [`.opencode/skills/`](.opencode/skills/) и доступны на чистом раннере без отдельной установки. Глобальные скиллы с машины разработчика (`~/matt-skills/skills` в `opencode.jsonc`) на раннер недоступны — проектный набор хранится в репозитории.
- **Модель и ключ**: `model: opencode/mimo-v2.6-flash-free`; ключ `OPENCODE_API_KEY` хранится только в Settings → Secrets and variables → Actions и не попадает в текст воркфлоу. Модель бесплатная — платёжная карта и бюджет провайдера для проверки не требуются.
- **Фильтры**: `if` пропускает работу только при команде в тексте и авторе с ассоциацией `OWNER`/`MEMBER`/`COLLABORATOR`; комментарии ботов игнорируются (агент не отвечает на свои сообщения); недоверенные авторы и PR из fork до ключа модели не доходят, `pull_request_target` с исполнением кодом PR не используется.
- **Права**: стандартная авторизация OpenCode — `contents: read` (чтение репозитория) и `id-token: write` (OIDC-токен для GitHub App), у `actions/checkout` задан `persist-credentials: false`: агент действует правами приложения. Если выбрать другую авторизацию (`use_github_token: true` с `GITHUB_TOKEN`), права (`contents: write`, `pull-requests: write`, `issues: write`) и способ push настраиваются явно — это единственный отличный от стандартного режим сценарий; в нём нет OIDC-обмена и токена приложения.
- **Команды (`mentions`)**: по умолчанию OpenCode принимает `/opencode` и `/oc`; в воркфлоу этот набор задан явно параметром `mentions: /opencode,/oc`. Другие команды не регистрируются.
- **`share`**: решение для публичного репозитория — `share: "false"`: сессии агента не публикуются, контекст задач остаётся в обсуждении и логах прогона. Решение принято до первого вызова.
- **Ограничения**: `timeout-minutes: 45` у задания — лимит покрывает TDD-итерации агента (установка окружения вынесена в шаги `Setup environment`/`npm ci`/`playwright install` до запуска агента, как в `ci.yml`); `concurrency` группирует прогоны по номеру issue/PR и отменяет текущий прогон при новом (`cancel-in-progress: true`). Остановить отправленный запрос к провайдеру можно только его правилами; при необходимости ключ отзывается у провайдера.
- **Результаты (где смотреть ответы)**: ответ агента — комментарий в том же issue или PR, прогоны с логами — на вкладке Actions (воркфлоу `opencode`). Пример: [issue #2](https://github.com/ZhTaha/ai-for-developers-project-387/issues/2) с ответом агента комментарием и [прогон 44601111350](https://github.com/ZhTaha/ai-for-developers-project-387/actions/runs/44601111350) на вкладке Actions. Дальнейшие воркфлоу агента дополняют этот список и это описание.

Проверка после настройки: создайте issue и оставьте комментарий `/oc explain this issue` — ответ появится в обсуждении, прогон будет виден в Actions (живой пример — [issue #2](https://github.com/ZhTaha/ai-for-developers-project-387/issues/2) и [прогон 44601111350](https://github.com/ZhTaha/ai-for-developers-project-387/actions/runs/44601111350)).

### Автотриаж (`.github/workflows/triage.yml`)

- **Событие**: issue открыт или переоткрыт (`issues`, `types: [opened, reopened]`) — команда в комментарии не нужна. У действия `issues` нет комментария-триггера, поэтому инструкция роли задана input `prompt` воркфлоу (для этого события он обязателен; действие передаёт его в env `PROMPT`).
- **Назначение**: агент разбирает обращение по ролям из [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) и меткам из [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md), применяет одну метку (`needs-triage` снимается) и оставляет разбор комментарием вида `## Triage: <метка>`. Скилл `triage` в репозиторий не переносится — он живёт на дев-машине, его инструкция воспроизведена в `PROMPT`.
- **Фильтры**: только авторы с ассоциацией `OWNER`/`MEMBER`/`COLLABORATOR` и не бот; issue, уже несущие метку `ready-for-agent`, `ready-for-human` или `wontfix`, пропускаются — тикеты, выпущенные `to-tickets`, автотриаж повторно не разбирает.
- **Ограничения**: `timeout-minutes: 15` (триаж — разбор без правок кода, тайм-аут короче интерактивного вызова); `concurrency` общий для репозитория (`group: opencode-triage`, `cancel-in-progress: false`): триажи идут по одному, начатый прогон не отменяется.
- **Права и токен**: как у интерактивного воркфлоу — `contents: read` + `id-token: write`, `persist-credentials: false`; токен приложения для `gh issue edit`/`gh issue comment` агент берёт из git-конфигурации, которую настраивает шаг Run OpenCode. `OPENCODE_PERMISSION` и модель те же, что в `opencode.yml`.
- **Код не меняется**: `prompt` прямо запрещает правки файлов, коммиты, push и PR; чистое рабочее дерево означает, что агент отвечает только комментарием.

### Авторевью PR (`.github/workflows/pr-review.yml`)

- **Событие**: `pull_request` (`types: [opened, synchronize, reopened, ready_for_review]`) — команда в комментарии не нужна.
- **Назначение**: прогон читает критерии из [`REVIEW.md`](REVIEW.md), передаёт их вместе с диффом PR в модель обычным CLI (`opencode run`, не action-хендлер) и публикует итог комментарием в PR — шагом без модели. Формат замечания (файл, строка, условие ошибки, последствие) и правило «дефектов нет — сказать прямо» заданы в `REVIEW.md`.
- **Лимит запусков на PR**: `MAX_MODEL_RUNS: "3"`. Проверяется кодом **до** вызова модели по истории прогонов Actions (наличие шага `Run model` в задании `review` этих прогонов): источник бюджета — серверная история запусков, которую токен агента переписать не может. При исчерпании публикуется статус `limit_exhausted` без запуска модели. Итоговый статус прогона — один из `ok`, `limit_exhausted`, `timeout`, `infra`, `agent_failed` — всегда публикуется шагом без модели.
- **Фильтр доверенных**: не draft, ветка PR из этого репозитория (не fork), база `main`, автор `OWNER`/`MEMBER`/`COLLABORATOR`. Остальные PR пропускаются целиком и секрет модели не получают; `pull_request_target` с исполнением кодом PR не используется.
- **Права**: без OIDC (`id-token` не запрашивается) — `contents: read`, `issues: read`, `actions: read` (подсчёт бюджета), `checks: read`, `statuses: read`, `pull-requests: write` (публикация итога). Ключ `OPENCODE_API_KEY` берётся из Secrets, у checkout `persist-credentials: false` — у модели нет токена репозитория.
- **Ограничения**: `timeout-minutes: 25` у задания, шаг модели дополнительно ограничен `timeout` на 15 минут; `concurrency` группирует прогоны по номеру PR, `cancel-in-progress: true` отменяет устаревший прогон при новом push.
- **Отказы**: превышение лимита шага (коды 124/137) → `timeout`; ошибка окружения или доступа к модели → `infra`; агент завершился без результата → `agent_failed`; исчерпание бюджета → `limit_exhausted`; успех → `ok` с текстом замечаний из `findings.md`.

### Браузерная проверка с артефактом (`.github/workflows/browser-check.yml`)

- **Событие**: `pull_request`, отдельно от `ci.yml` и без секретов.
- **Артефакт**: Playwright с `--trace on` (скриншоты — при падении), артефакт именуется `browser-<head-sha>` и содержит файл `head-sha.txt` с точным `github.event.pull_request.head.sha` — его сверяют с head ветки PR.
- **Ограничения**: `timeout-minutes: 20`; `concurrency` по номеру PR с отменой устаревших прогонов.

### Шаблон PR и критерии ревью

- [`.github/pull_request_template.md`](.github/pull_request_template.md) — разделы «Проверки» (команды, ссылки на прогоны, SHA), «Риск», «Способ отката»: заполняются при создании PR.
- [`REVIEW.md`](REVIEW.md) — критерии ревью: правила бронирования, контракт и сборка, поведение интерфейса и формат замечания; их читают авторевью и человек-ревьюер.

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
