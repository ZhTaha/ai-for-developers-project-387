install: ## Установка зависимостей (проект без npm-пакетов)
	@echo "Внешних зависимостей нет: используется встроенный Node.js (>=20). Проверка версии:" ; \
	node --version

start: ## Запуск приложения
	node src/server.js

test: ## Запуск интеграционных тестов
	node --test --test-force-exit

.PHONY: install start test help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'
