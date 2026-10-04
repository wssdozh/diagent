# Shortform pack — sources and limits

## What TikTok Studio actually does

The in-app "идеи / названия / хэштеги / сюжетная зацепка / сценарий" panel is an LLM with a **fixed schema** plus Creative Center counts (`публикаций: 2.81M`). Counts are not exposed as a public API. `ads.tiktok.com/business/creativecenter/...` is the official desktop UI; from this environment it either 403s, geo-blocks, or returns a JS shell with no table.

Do not:

- hit `/creative_radar_api/`
- run `tiktok-scraper`, Playwright logins, or cookie dumps
- promise live TikTok publication numbers without a source you actually read this turn

## Public proxies this skill may use

| source | what you get | label |
|---|---|---|
| User-pasted TikTok Studio / tag page screenshot | TikTok video counts | `tiktok` |
| [best-hashtags.com/hashtag/TAG/](https://best-hashtags.com/hashtag/gamedev/) | Instagram post count + related tags | `ig` |
| Fetchira search snippets that quote `#tag` + "videos/posts" | opportunistic TikTok/IG number | quote + URL |
| `data/ladders.json` | last-seen TikTok Studio numbers (gamedev 2.81M, indiegame 769K, towerdefense 169K, unitytips 1.63K, gamebuilder 1.30K) | `tiktok` cached |

`--refresh` on `scripts/pack.mjs` only updates IG counts from best-hashtags.com.

## Ladder file

`data/ladders.json`

- `bands.macro / mid / micro` thresholds
- `never` — spam tags
- each ladder: `seeds` (for auto-detect) + `tags[]` with optional `tiktok_posts`, `ig_posts`, `why`

When you learn a real TikTok count, **write it back** into `ladders.json` (`tiktok_posts` + a one-line comment in `notes`). That's how the CLI stays honest.

## CLI

From the skill directory:

```text
node scripts/pack.mjs --profile gamedev --template devlog --lang en "egg player top-down unity tower defense"
node scripts/pack.mjs --profile block-sorting --template gameplay --lang ru "таймер, полки, молоток"
node scripts/pack.mjs --profile fantaser --template product --lang ru "бот дарит песню по анкете"
node scripts/pack.mjs --refresh --json "unitytips towerdefense"
```

`--refresh` is optional and slow (one HTTPS GET per candidate tag).
