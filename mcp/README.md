# MCP Servers & Tools

Реестр и локальные реализации MCP (Model Context Protocol).

## Файлы
- `registry.json` — универсальный манифест доступных MCP серверов:
  - `ticktick`: управление задачами (@om-surushe/efficient-ticktick).
  - `fetchira`: веб-поиск и браузер через WSL.
  - `laya`: локальный классификатор задач (на CPU).
  - `linear`: интеграция с Linear (через mcp-remote).
- `laya/` — исходный код локального сервера Laya (CPU inference, FastMCP).

## Настройка секретов
Перед запуском создайте файл `.env` на основе `.env.example` и укажите необходимые ключи.
