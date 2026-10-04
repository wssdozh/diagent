#!/usr/bin/env node
/**
 * Mix a shortform pack: ladder hashtags (macro → mid → micro) + storyboard.
 *
 *   node pack.mjs "egg player top-down unity tower defense"
 *   node pack.mjs --profile block-sorting --template gameplay "таймер и полки"
 *   node pack.mjs --refresh --json "unitytips towerdefense"
 *
 * --refresh hits best-hashtags.com (Instagram post counts as a public proxy).
 * TikTok Creative Center is not a public API. Do not scrape ads.tiktok.com.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

const GLOSS = {
  яйцо: "egg",
  яйца: "egg",
  игрок: "player",
  сверху: "top-down",
  девблог: "devlog",
  разработке: "dev",
  игры: "game",
  видео: "video",
  башен: "tower defense",
  вид: "view",
};
const SYN = {
  девблог: ["devlog", "gamedev"],
  яйцо: ["egg"],
  яйца: ["egg"],
  игрок: ["player"],
  сверху: ["topdown", "top-down"],
  unity: ["unity", "madewithunity"],
  tower: ["towerdefense"],
  defense: ["towerdefense"],
  defence: ["towerdefense"],
  puzzle: ["puzzle", "puzzlegame"],
  бот: ["bot", "telegrambot"],
  песн: ["aisong"],
  песня: ["aisong"],
};

const args = process.argv.slice(2);
const flags = {
  profile: take("--profile", "gamedev"),
  template: take("--template", ""),
  lang: take("--lang", ""),
  json: has("--json"),
  refresh: has("--refresh"),
  out: take("--out", ""),
  help: has("--help") || has("-h"),
};
const idea = args.filter((a) => !a.startsWith("--")).join(" ").trim();

if (flags.help || !idea) {
  process.stderr.write(`usage: node pack.mjs [--profile NAME] [--template devlog|gameplay|product] [--lang en|ru] [--refresh] [--json] [--out file] <idea>\n`);
  process.exit(flags.help ? 0 : 2);
}

const ladders = JSON.parse(readFileSync(join(DATA, "ladders.json"), "utf8"));
const profiles = JSON.parse(readFileSync(join(DATA, "profiles.json"), "utf8"));
const beats = JSON.parse(readFileSync(join(DATA, "beats.json"), "utf8"));

const profileName = flags.profile in profiles.profiles ? flags.profile : profiles.default;
const profile = profiles.profiles[profileName];
const lang = flags.lang || profile.lang || "en";
const templateName = flags.template || guessTemplate(idea, profileName);
const template = beats.templates[templateName] || beats.templates.devlog;

const tokens = tokenize(idea);
const selectedLadders = pickLadders(tokens, profile.ladders, ladders.ladders);
let catalog = mergeCatalog(selectedLadders, ladders.ladders);

if (flags.refresh) {
  const names = unique(catalog.map((t) => t.tag)).slice(0, 12);
  const live = await refreshCounts(names);
  catalog = catalog.map((t) => {
    const ig = live.get(t.tag);
    if (!ig) return t;
    return { ...t, ig_posts: ig, band: bandOf({ ...t, ig_posts: ig }, ladders.bands) };
  });
}

const mix = mixTags(catalog, tokens, ladders.never, profile.ladders);
const slots = fillSlots(idea, profile, lang);
const storyboard = renderBeats(template, slots, lang, beats.tiktok_studio);
const titles = makeTitles(slots, lang);
const hook = storyboard[0]?.say || "";
const caption = makeCaption(slots, mix, lang);
const pack = {
  idea,
  profile: profileName,
  template: templateName,
  lang,
  refreshed: Boolean(flags.refresh),
  sources: flags.refresh
    ? ["best-hashtags.com (ig post counts)", "local ladders"]
    : ["local ladders (TikTok Studio last-seen + IG proxy)"],
  titles,
  hook,
  on_screen: clipWords(slots.twist, 5),
  hashtags: mix,
  caption,
  storyboard,
  cta: slots.cta,
};

if (flags.out) writeFileSync(flags.out, JSON.stringify(pack, null, 2));
process.stdout.write(flags.json ? JSON.stringify(pack, null, 2) + "\n" : formatHuman(pack));

function take(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v ?? fallback;
}
function has(name) {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}
function tokenize(text) {
  const raw = text
    .toLowerCase()
    .replace(/[#]/g, " ")
    .split(/[^a-z0-9а-яё_+-]+/i)
    .filter((w) => w.length > 1);
  const extra = [];
  for (const w of raw) {
    extra.push(...(SYN[w] || []));
    for (const [k, vs] of Object.entries(SYN)) if (w.includes(k)) extra.push(...vs);
  }
  return unique([...raw, ...extra]);
}
function toLang(s, lang) {
  if (lang !== "en") return s;
  let out = String(s);
  for (const [ru, en] of Object.entries(GLOSS)) {
    out = out.replace(new RegExp(ru, "ig"), en);
  }
  return out.replace(/\s+/g, " ").trim();
}
function unique(xs) {
  return [...new Set(xs)];
}
function guessTemplate(text, profile) {
  if (profile === "fantaser" || profile === "voiceover") return "product";
  if (/\b(gameplay|play|loop|run|клип|геймплей)\b/i.test(text)) return "gameplay";
  if (/\b(bot|бот|song|песн|tts|озвуч)\b/i.test(text)) return "product";
  return "devlog";
}
function pickLadders(tokens, preferred, all) {
  const hit = Object.entries(all)
    .filter(([, lad]) => lad.seeds?.some((s) => tokens.includes(s) || tokens.some((t) => t.includes(s) || s.includes(t))))
    .map(([name]) => name);
  return unique([...hit, ...preferred]).filter((n) => all[n]);
}
function mergeCatalog(names, all) {
  const out = [];
  for (const name of names) {
    for (const tag of all[name].tags) out.push({ ...tag, ladder: name });
  }
  return out;
}
function bandOf(tag, bands) {
  const tk = tag.tiktok_posts || 0;
  const ig = tag.ig_posts || 0;
  if (tk >= bands.macro.tiktok_min || ig >= bands.macro.ig_min) return "macro";
  if (tk >= bands.mid.tiktok_min || ig >= bands.mid.ig_min) return "mid";
  return "micro";
}
function scoreTag(tag, tokens) {
  const name = tag.tag.toLowerCase();
  let s = 0;
  if (tokens.includes(name)) s += 50;
  for (const t of tokens) {
    if (t.length > 3 && name.includes(t)) s += 12;
    if (t.length > 3 && t.includes(name)) s += 8;
  }
  if (tag.tiktok_posts) s += 8 + Math.min(6, Math.log10(tag.tiktok_posts));
  else if (tag.ig_posts) s += 3 + Math.min(4, Math.log10(tag.ig_posts) / 2);
  else s -= 4;
  return s;
}
function mixTags(catalog, tokens, never, preferred = []) {
  const seen = new Set(never.map((n) => n.toLowerCase()));
  const primary = preferred[0];
  const pick = (band, n, preferLadder) => {
    const pool = catalog
      .filter((t) => (t.band || "micro") === band && !seen.has(t.tag.toLowerCase()))
      .sort((a, b) => scoreTag(b, tokens) - scoreTag(a, tokens));
    const out = [];
    const take = (t) => {
      if (!t || out.length >= n || seen.has(t.tag.toLowerCase())) return;
      seen.add(t.tag.toLowerCase());
      out.push({
        tag: `#${t.tag}`,
        band,
        tiktok_posts: t.tiktok_posts || null,
        ig_posts: t.ig_posts || null,
        why: t.why,
      });
    };
    if (preferLadder) take(pool.find((t) => t.ladder === preferLadder));
    for (const t of pool) take(t);
    return out;
  };
  return [...pick("macro", 2), ...pick("mid", 2, primary), ...pick("micro", 2, primary)];
}
function fillSlots(idea, profile, lang) {
  const facts = profile.facts || [];
  const genre = extractGenre(idea, facts);
  const engine = extractEngine(idea, facts);
  const twist = toLang(extractTwist(idea), lang);
  const cta = (profile.cta && profile.cta[lang]) || profile.cta?.en || "Comment the weirder version.";
  let one_liner;
  if (genre === "bot") {
    one_liner = clip(toLang(idea.replace(/^\s*бот\s+/i, "").replace(/\s+/g, " "), lang), 90);
  } else if (lang === "en") {
    one_liner = clip(`${engine} ${genre} where the player is ${twist}`, 90);
  } else {
    one_liner = clip(idea.replace(/\s+/g, " "), 90);
  }
  return { one_liner, twist, genre, engine, cta, facts };
}
function extractTwist(idea) {
  const assigned = idea.match(/(?:player|игрок|герой)\s*[=:]\s*(.+)$/i);
  if (assigned) return clip(assigned[1], 40);
  const egg = idea.match(/\b(яйц\w*|egg)\b/i);
  if (egg) return egg[1];
  const leftover = idea
    .replace(/\b(unity|godot|unreal|telegram|tower\s*defen[cs]e|top-?down|devlog|video|game|player|indie|бот|песн\w*)\b/gi, " ")
    .replace(/[,.=]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clip(leftover || idea, 40);
}
function extractGenre(idea, facts = []) {
  const blob = `${idea} ${facts.join(" ")}`;
  const map = [
    [/tower\s*defen[cs]e|тд|башен/i, "tower defense"],
    [/puzzle|сортир|block|полк/i, "puzzle"],
    [/roguelike|рогалик/i, "roguelike"],
    [/platform/i, "platformer"],
    [/песн|song|telegram|бот/i, "bot"],
  ];
  for (const [re, g] of map) if (re.test(blob)) return g;
  return "game";
}
function extractEngine(idea, facts) {
  if (/\bgodot\b/i.test(idea)) return "Godot";
  if (/\bunreal\b/i.test(idea)) return "Unreal";
  if (/\bunity\b/i.test(idea) || facts.some((f) => /unity/i.test(f))) return "Unity";
  if (/\btelegram\b/i.test(idea) || facts.some((f) => /telegram|бот/i.test(f))) return "Telegram";
  return "the engine";
}
function renderBeats(template, slots, lang, meta) {
  const key = lang === "ru" ? "say_ru" : "say_en";
  return meta.map((beat) => {
    const node = template[beat.id] || {};
    return {
      id: beat.id,
      label: lang === "ru" ? beat.label_ru : beat.label_en,
      s: beat.s,
      job: beat.job,
      say: subst(node[key] || node.say_en || "", slots),
      show: subst(node.show || "", slots),
    };
  });
}
function subst(s, slots) {
  return s.replace(/\{(\w+)\}/g, (_, k) => slots[k] ?? "");
}
function clip(s, n) {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
}
function clipWords(s, n) {
  return s.split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}
function makeTitles(slots, lang) {
  if (lang === "ru") {
    return [
      clip(`${cap(slots.twist)} — ${slots.genre}`, 48),
      clip(`${slots.engine}: ${slots.one_liner}`, 48),
      clip(`Девблог: ${slots.twist}`, 48),
    ];
  }
  return [
    clip(`${cap(slots.twist)} ${cap(slots.genre)}`, 48),
    clip(`${slots.engine} Dev: ${slots.twist}`, 48),
    clip(`Weird ${slots.genre}: ${slots.one_liner}`, 48),
  ];
}
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function makeCaption(slots, mix, lang) {
  const tags = mix.map((t) => t.tag).join(" ");
  if (lang === "ru") return `${slots.one_liner}\n\n${slots.cta}\n\n${tags}`;
  return `${slots.one_liner}\n\n${slots.cta}\n\n${tags}`;
}
function formatHuman(pack) {
  const lines = [];
  lines.push(`# ${pack.titles[0]}`);
  lines.push(`profile: ${pack.profile} · template: ${pack.template} · lang: ${pack.lang}`);
  lines.push("");
  lines.push("## Titles");
  for (const t of pack.titles) lines.push(`- ${t}`);
  lines.push("");
  lines.push("## Hashtags  (macro → mid → micro)");
  for (const t of pack.hashtags) {
    const n = t.tiktok_posts ? `tiktok ${fmt(t.tiktok_posts)}` : t.ig_posts ? `ig ${fmt(t.ig_posts)}` : "no count";
    lines.push(`- ${t.tag}  [${t.band} · ${n}]  ${t.why}`);
  }
  lines.push("");
  lines.push("## Hook");
  lines.push(pack.hook);
  lines.push(`on-screen (OCR): ${pack.on_screen}`);
  lines.push("");
  lines.push("## Storyboard");
  for (const b of pack.storyboard) {
    lines.push(`### ${b.label}  (${b.s})`);
    lines.push(`say: ${b.say}`);
    lines.push(`show: ${b.show}`);
    lines.push("");
  }
  lines.push("## Caption");
  lines.push(pack.caption);
  lines.push("");
  lines.push(`sources: ${pack.sources.join("; ")}`);
  return lines.join("\n") + "\n";
}
function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 2).replace(/\.00$/, "") + "K";
  return String(n);
}
async function refreshCounts(names) {
  const out = new Map();
  for (const name of names) {
    try {
      const html = await get(`https://best-hashtags.com/hashtag/${encodeURIComponent(name)}/`);
      const m = html.match(/Post using this hashtag:\s*<\/?\w*.*?>?\s*([0-9,]+)/i) || html.match(/Post using this hashtag:[^0-9]*([0-9,]+)/i);
      if (m) out.set(name, Number(m[1].replace(/,/g, "")));
    } catch {
      /* keep local */
    }
  }
  return out;
}
function get(url) {
  return new Promise((resolve, reject) => {
    import("node:https").then(({ default: https }) => {
      https
        .get(url, { headers: { "User-Agent": "shortform-pack/1.0" } }, (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        })
        .on("error", reject);
    });
  });
}
