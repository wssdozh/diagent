---
name: shortform-pack
description: >
  Turn a raw idea into a TikTok/Shorts/Reels pack: titles, hook, OCR sticker, 6-beat
  storyboard, caption, and a 2+2+2 hashtag ladder (macro → mid → micro). Uses the
  local pack CLI plus Fetchira for live counts. Use for TikTok scripts, hashtags,
  content gaps, storyboards, captions, or "like TikTok Studio but offline".
---

# Shortform pack

Same job as TikTok Studio's idea → titles / tags / hook / script, without the app.
Hashtags are a **ladder**, not a vibe list: 2 macro (category), 2 mid (genre/tool), 2 micro (search pocket).

## When to use

User dumps a topic, a game, a bot, or "сделай описание как в тиктоке". Also when they ask for hashtags, a hook, a storyboard, or a caption for 15–60s vertical video.

Do **not** scrape TikTok Creative Center, `ads.tiktok.com`, or logged-in Studio. Those endpoints are auth-gated. Do **not** install unofficial TikTok scrapers.

## Workflow

1. Load this skill, then read `data/profiles.json` if the idea matches a known project (`block-sorting`, `fantaser`, `voiceover`, generic `gamedev`).
2. Run the mixer from this skill directory:

```text
node scripts/pack.mjs --profile <gamedev|block-sorting|fantaser|voiceover> --template <devlog|gameplay|product> --lang <en|ru> "<idea>"
```

Optional: `--refresh` pulls Instagram post counts from best-hashtags.com as a public competition proxy. `--json` if you need the object. `--out pack.json` to save.

3. After the CLI, **live-check the 6 tags** with Fetchira (MCP if listed, else `fetchira` CLI). Do not invent TikTok publication counts.
4. Rewrite the 6 beats so they fit *this* idea. CLI fills a template; you fill the actual VO + B-roll.
5. Return the pack in the output shape below. Keep it copy-pasteable.

If the CLI fails, mix by hand from `data/ladders.json` using the same 2+2+2 rule.

## Live-check (required)

For each chosen tag, search then read — stop at the first source that yields a number:

1. Fetchira `search` `"tiktok #TAG videos"` / `"#TAG site:tiktok.com/tag"` — look for "videos", "posts", "публикаций".
2. Fetchira `read` `https://best-hashtags.com/hashtag/TAG/` — Instagram post count is a **proxy**, label it `ig`.
3. If the user pasted a TikTok Studio screenshot, **prefer those TikTok numbers** over any proxy.

Then re-band:

- **macro** — TikTok ≥ 1M posts (or IG ≥ 5M)
- **mid** — TikTok 50k–1M (or IG 400k–5M)
- **micro** — TikTok < 50k (or IG < 400k)

If a "micro" is actually a millionaire, demote it and pick a longer-tail from the same ladder (or invent a 2–4 word search tag that is still true: `#unity2d`, `#eggtd`, `#blocksorting`). Never pad with `#fyp` / `#viral` / `#foryou`.

Cite the URLs you actually read.

## Mix rules

- **2 macro** teach the algo the bucket (`#gamedev`, `#unity`, `#puzzle`, `#telegram`).
- **2 mid** hit people who already watch that genre/tool (`#towerdefense`, `#indiegame`, `#madewithunity`, `#telegrambot`).
- **2 micro** are where a new video can sit on page 1 of search (`#unitytips` 1.6K, `#gamebuilder` 1.3K, product-name tags).
- Max **6** tags on TikTok. Spoken hook + on-screen text matter more than tag 7.
- First 2 seconds of **speech** must contain a searchable phrase (TikTok ASR). On-screen sticker ≤ 5 words (OCR).
- Language: follow `--lang` / profile. Gamedev wishlist content → English. Fantaser / RU bots → Russian. Don't mix unless asked.
- Ban: `#fyp`, `#foryou`, `#viral`, `#trending`, `#tiktok`.

## Output shape

Always emit:

```text
## Titles
- 3 options

## Hashtags
- #tag  [macro|mid|micro · tiktok 2.81M | ig 2.8M | no count]  why

## Hook
spoken line
on-screen: ≤5 words

## Storyboard
for each of 6 beats (Hook 0–3 / Value 3–8 / Twist 8–15 / Show 15–28 / Peak 28–33 / CTA last):
- say
- show
- s

## Caption
ready to paste (body + CTA + 6 tags)
```

Beat jobs match TikTok Studio: Вступление, Описание, Идея, Шоу, Главный момент, Завершение.

## Profiles (local resources)

Read `data/profiles.json`. Known:

| profile | what | default lang |
|---|---|---|
| `gamedev` | generic Unity / indie | en |
| `block-sorting` | Unity casual puzzle, Yandex Games / WebGL | ru |
| `fantaser` | Telegram bot «Подари песню» | ru |
| `voiceover` | Telegram Kie TTS bot | ru |

If the workspace is one of those repos, auto-pick the profile even if the user didn't name it. Pull CTA, facts, and handles from the profile — don't invent Steam links or @handles.

To add a project later: one object in `profiles.json` + optional extra ladder in `ladders.json`.

## Templates

- `devlog` — process / WIP / "watch me build"
- `gameplay` — the loop is the joke
- `product` — bot / tool demo, result first

Default: `devlog` unless the idea is clearly a finished loop or a bot.

## If Fetchira is missing

Still run `pack.mjs`. Say the counts are **cached last-seen**, not live. Offer `--refresh` (IG proxy) or a pasted Studio screenshot for real TikTok numbers.
