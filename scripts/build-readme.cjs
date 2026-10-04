const fs = require('fs');
const path = require('path');

const skillsDir = 'C:/Users/morii/OneDrive/Dokumenter/GitHub/diagent/skills';
const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const categoryTitles = {
  'design-ui': 'Дизайн, UI/UX и визуальные системы',
  'gamedev': 'Разработка игр (Game Development)',
  'ponytail': 'Ponytail: Борьба с over-engineering и аудит кода',
  'security': 'Безопасность и тестирование LLM',
  'agent-workflow': 'Маршрутизация и координация агентов',
  'writing-voice': 'Текст, тон и борьба с нейрослопом',
  'tools-creative': 'Инструменты и креатив',
  'other': 'Прочее'
};

const catalog = [];

for (const dirName of dirs) {
  const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
  let desc = '';
  let name = dirName;

  if (fs.existsSync(skillFile)) {
    const content = fs.readFileSync(skillFile, 'utf8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const descMatch = fm.match(/description:\s*>?-?\s*([^\n\r]+(?:\r?\n\s+[^\n\r]+)*)/);
      if (descMatch) {
        desc = descMatch[1].replace(/\r?\n\s*/g, ' ').replace(/^["']|["']$/g, '').trim();
      }
      const nameMatch = fm.match(/name:\s*([^\r\n]+)/);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }
    }
    if (!desc) {
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && trimmed.length > 15) {
          desc = trimmed;
          break;
        }
      }
    }
  }

  let category = 'other';
  if (dirName.startsWith('gamedev-') || ['game-feel', 'level-design', 'card-game'].includes(dirName)) {
    category = 'gamedev';
  } else if (dirName.startsWith('ponytail')) {
    category = 'ponytail';
  } else if (dirName.startsWith('security-') || dirName === 'llm-testing') {
    category = 'security';
  } else if (['apple-design', 'better-ui', 'design', 'design-system', 'banner-design', 'palette-craft', 'slides', 'ui-styling', 'ui-ux-pro-max', 'brand'].includes(dirName)) {
    category = 'design-ui';
  } else if (['slopotron', 'subculture-chat', 'shortform-pack'].includes(dirName)) {
    category = 'writing-voice';
  } else if (['delegation-planner', 'laya-routing'].includes(dirName)) {
    category = 'agent-workflow';
  } else if (['fetchira', 'ip-as-logo'].includes(dirName)) {
    category = 'tools-creative';
  }

  catalog.push({ id: dirName, name, category, description: desc });
}

fs.writeFileSync(path.join(skillsDir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');

const grouped = {};
for (const item of catalog) {
  const cat = item.category || 'other';
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(item);
}

let md = '# Библиотека навыков (Skills Library)\n\n';
md += 'Автономная коллекция из 51 навыка для автономных ИИ-агентов (DeepSeek Harness, Claude Code, Cursor, Codex).\n';
md += 'Каждый навык следует открытому стандарту `SKILL.md` (с фронтматтером, инструкциями и справочными материалами).\n\n';

for (const [catKey, items] of Object.entries(grouped)) {
  const title = categoryTitles[catKey] || catKey;
  md += '## ' + title + '\n\n';
  md += '| Навык | Описание |\n';
  md += '| :--- | :--- |\n';
  for (const item of items) {
    let cleanDesc = (item.description || '—').replace(/\|/g, '—').replace(/\r?\n/g, ' ').trim();
    if (cleanDesc.length > 140) cleanDesc = cleanDesc.substring(0, 137) + '...';
    md += `| [\`${item.id}\`](./${item.id}/SKILL.md) | ${cleanDesc} |\n`;
  }
  md += '\n';
}

fs.writeFileSync(path.join(skillsDir, 'README.md'), md, 'utf8');
console.log('Regenerated catalog.json and README.md with pristine UTF-8');
