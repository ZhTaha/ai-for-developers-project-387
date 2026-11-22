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
- `.github/workflows/audit-schedule.yml` — аудит приложения по расписанию и вручную (описание ниже)

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
- **Ограничения**: `timeout-minutes: 25` у задания, шаг модели дополнительно ограничен `timeout` на 16 минут; `concurrency` группирует прогоны по номеру PR, `cancel-in-progress: true` отменяет устаревший прогон при новом push.
- **Отказы**: превышение лимита шага (коды 124/137) → `timeout`; ошибка окружения или доступа к модели → `infra`; агент завершился без результата → `agent_failed`; исчерпание бюджета → `limit_exhausted`; успех → `ok` с текстом замечаний из `findings.md`.

### Браузерная проверка с артефактом (`.github/workflows/browser-check.yml`)

- **Событие**: `pull_request`, отдельно от `ci.yml` и без секретов.
- **Артефакт**: Playwright с `--trace on` (скриншоты — при падении), артефакт именуется `browser-<head-sha>` и содержит файл `head-sha.txt` с точным `github.event.pull_request.head.sha` — его сверяют с head ветки PR.
- **Ограничения**: `timeout-minutes: 20`; `concurrency` по номеру PR с отменой устаревших прогонов.

### Аудит по расписанию (`.github/workflows/audit-schedule.yml`)

- **События**: `schedule` (`cron: '17 3 * * *'` — ежедневно) и `workflow_dispatch` с input `report_source` (`live` | `training`) в одном файле; файл лежит в основной ветке. Cron у GitHub Actions считается в UTC: `17 3 * * *` = 06:17 по Москве (Europe/Moscow). GitHub не гарантирует старт в указанное время (задержки и пропуски при нагрузке), а в публичном репозитории расписание отключается после 60 дней без активности. Для сдачи достаточно успешного ручного запуска кнопкой **Run workflow** из основной ветки — ночного запуска ждать не нужно.
- **Сбор данных**: шаг воркфлоу трижды проверяет доступность `APP_URL` (переменная репозитория; fallback — прежний рабочий адрес приложения, cold start бесплатного хостинга учитывается) и собирает отчёт Lighthouse; если приложение не отвечает — пишет `reports/no-data.md`, и агент прямо отмечает: **отсутствие данных не подтверждает, что дефекты исправлены**. Исходные данные сохраняются артефактом `audit-report-<run_id>` (срок хранения артефактов ограничен, поэтому текст находок дублируется в issue). Каталог `reports/` в `.gitignore` — отчёты в коммиты не попадают. Учебный отчёт (`report_source: training`) генерируется шагом воркфлоу с явно обозначенной находкой — так демонстрируется создание issue без выдумывания дефектов в работающем приложении.
- **Агент**: у события `schedule` нет комментария-триггера — инструкция задана input `prompt` действия (как в `triage.yml`). Порядок: разбор отчёта → **поиск существующих задач** по маркеру `<!-- audit-finding: id -->` в теле issue и по ключевым словам → по новой находке отдельный issue с проблемой, предлагаемым действием, текстом находки и ссылкой на прогон (одной ссылки на временный артефакт недостаточно) → вывод в `$GITHUB_STEP_SUMMARY` и в лог прогона. Повторный запуск с той же находкой issue не создаёт и одинаковый комментарий не оставляет. Повторное появление уже исправленной проблемы оформляется новым issue со ссылками на прежнюю задачу и исправляющий PR. Код агент не меняет, ничего не коммитит и PR не создаёт.
- **Права**: стандартная авторизация OpenCode — `contents: read` + `id-token: write`, токен GitHub App даёт `gh` права на создание issues (токен агент берёт из git-конфигурации, как в `triage.yml`), `persist-credentials: false` у checkout. При выборе `use_github_token: true` агенту передаётся `GITHUB_TOKEN`, и на создание issue потребуется `issues: write`.
- **Ограничения**: `timeout-minutes: 30` у задания; `concurrency: page-audit` c `cancel-in-progress: false` — параллельные аудиты идут по одному, начатый прогон не отменяется новым запуском.
- **Результаты**: прогоны — вкладка Actions (воркфлоу `Page audit`), отчёт — артефакт `audit-report-<run_id>` прогона, вывод агента — сводка прогона и его лог, задачи — Issues (находки — `needs-triage`, учебная — `training`). Проверенные ручные запуски: [учебный, прогон 45024995025](https://github.com/ZhTaha/ai-for-developers-project-387/actions/runs/45024995025) → [issue #24](https://github.com/ZhTaha/ai-for-developers-project-387/issues/24) (учебная находка); [повтор с теми же данными, прогон 45025216354](https://github.com/ZhTaha/ai-for-developers-project-387/actions/runs/45025216354) → дубликатов нет; [живой, прогон 45025354249](https://github.com/ZhTaha/ai-for-developers-project-387/actions/runs/45025354249) → реальный отчёт и задачи [#25](https://github.com/ZhTaha/ai-for-developers-project-387/issues/25), [#26](https://github.com/ZhTaha/ai-for-developers-project-387/issues/26), [#27](https://github.com/ZhTaha/ai-for-developers-project-387/issues/27), [#28](https://github.com/ZhTaha/ai-for-developers-project-387/issues/28). Новые находки остаются входящими обращениями: решает, брать ли их в работу, человек.

### Личные выводы о работе GitHub-агента

- **Потребовалось уточнить самому себе**: как передать инструкцию без комментария-триггера (ответ — input `prompt` у действия, тот же механизм, что у автотриажа); что считать отчётом (выбрал Lighthouse по `APP_URL` — это стандартный шаг, который легко повторить вручную); как показать создание issue, не выдумывая дефект (учебный отчёт генерируется самим воркфлоу, а не коммитится); как отличить «ничего не нашлось» от «не смог проверить» (отдельный `no-data.md` с прямой оговоркой). Решение о правах было не настраивать: стандартного режима OpenCode с `id-token: write` хватило для `gh issue create` — отдельный `use_github_token` не понадобился.
- **Что изменил в настройках и постановке**: первый прогон упал — завершающая строка heredoc учебного отчёта из-за отступа после разбора YAML не распознавалась шеллом; после исправления прогоны зелёные (шаг с shell-логикой теперь проверяется локально до пуша). Добавил в репозиторий метку `training`, переменную `APP_URL` и `reports/` в `.gitignore`. В промпте зафиксировал маркер `audit-finding:` — без него дедупликация держалась бы только на формулировках и повторный запуск мог бы создать дубль.
- **Что показал живой прогон**: агент разобрал реальный отчёт (performance и accessibility — 1.0, best-practices 0.96, SEO 0.9) и создал четыре задачи по отдельным находкам (favicon 404, meta description, кеш `style.css`, render-blocking). Работает: каждая находка — отдельная задача, дублей нет. Но четыре issue с одного запуска — много шума для человека: вероятно, следующее уточнение постановки — объединять находки одного запуска в одну задачу или фильтровать по порогу. Ночные запуски я не ждал: для сдачи достаточно ручных прогонов, расписание проверено по cron и настройкам воркфлоу.

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
