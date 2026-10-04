# Preset `for-you` (DSH)

Оптимизированный пресет для DeepSeek Harness, ориентированный на автономную разработку с минимальным потреблением токенов и защитой от нейрослопа.

## Особенности
- **Anti-Slop & Tone Density**: системный промпт инженера (без вводных вежливости, канцелярита, сикофантии и повторов).
- **Экономия токенов**:
  - Исключены неиспользуемые тяжелые инструменты (`workflow`, `tool-goal`).
  - Упрощены JSON-схемы делегации (экономия ~1 265 токенов на каждом запросе к LLM).
  - Сжатые инструкции Plan Mode (94 токена вместо 585).
- **Инструменты**: полный доступ к ФС (`read`, `write`, `edit`, `glob`, `grep`), терминалу (`pwsh` на Windows, `bash` на Unix), фоновым задачам (`jobs`), скиллам и веб-поиску (`web`).

## Подключение в профиль DSH (`~/.dsh/profiles/web/package.json`)
```json
{
  "dependencies": {
    "@local/dsh-preset-for-you": "link:../../path/to/diagent/agents/dsh/presets/for-you"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@local/dsh-preset-for-you"
      ]
    }
  }
}
```
В `cordis.patch.yml` профиля установить по умолчанию:
```yaml
- id: agent-preset-registry
  name: "@deepseek-ai/dsh-agent-preset-registry"
  config:
    default: for-you
    selectedDefault: for-you
```
