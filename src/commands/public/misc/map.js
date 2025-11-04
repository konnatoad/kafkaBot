const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function rosu() {
  const mod = await import('rosu-pp-js');
  if (typeof mod.default === 'function') await mod.default();
  return mod;
}

const MAP_DIR = path.join(__dirname, '../../../extra/maps/');
const MOD_OPTIONS = [
  { label: 'NM (No Mod)', value: 'NM' },
  { label: 'HD (Hidden)', value: 'HD' },
  { label: 'HR (HardRock)', value: 'HR' },
  { label: 'DT (DoubleTime)', value: 'DT' },
  { label: 'NC (Nightcore)', value: 'NC' },
  { label: 'EZ (Easy)', value: 'EZ' },
  { label: 'NF (NoFail)', value: 'NF' },
  { label: 'SO (SpunOut)', value: 'SO' },
  { label: 'FL (Flashlight)', value: 'FL' },
];

function ensureMapDir() {
  if (!fs.existsSync(MAP_DIR)) fs.mkdirSync(MAP_DIR, { recursive: true });
}

function parseBeatmapId(input) {
  if (!input) return null;
  if (/^\d{3,}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const p = url.pathname;
    const h = url.hash || '';
    let m = p.match(/\/b(?:eatmaps?)?\/(\d+)/i) || p.match(/\/beatmaps\/(\d+)/i);
    if (m) return m[1];
    m = h.match(/#\w+\/(\d+)/i);
    if (m) return m[1];
    const qBeatmap = url.searchParams.get('beatmap') || url.searchParams.get('beatmapId');
    if (qBeatmap && /^\d+$/.test(qBeatmap)) return qBeatmap;
    const qb = url.searchParams.get('b');
    if (qb && /^\d+$/.test(qb)) return qb;
  } catch { }
  return null;
}

function parseAccList(raw) {
  if (!raw) return [90, 95, 97, 98, 99, 100];
  const nums = raw.split(',').map((s) => s.trim()).filter(Boolean).map(Number).filter((n) => Number.isFinite(n)).map((n) => Math.max(70, Math.min(100, n)));
  return Array.from(new Set(nums)).sort((a, b) => a - b).slice(0, 10);
}

function normalizeMods(selected) {
  let set = new Set(selected);
  if (set.size > 1 && set.has('NM')) set.delete('NM');
  if (set.has('NC')) set.delete('DT');
  if (set.has('EZ') && set.has('HR')) return { ok: false, reason: "You can't combine **EZ** and **HR**." };
  const order = ['NF', 'EZ', 'HD', 'HR', 'DT', 'NC', 'SO', 'FL'];
  const list = order.filter((m) => set.has(m));
  const combined = list.join('');
  const display = set.has('NM') || !combined ? 'NM' : list.join('');
  return { ok: true, combined, display };
}

async function downloadBeatmapIfNeeded(beatmapId) {
  ensureMapDir();
  const beatmapPath = path.join(MAP_DIR, `${beatmapId}.osu`);
  if (fs.existsSync(beatmapPath) && fs.statSync(beatmapPath).size > 0) return beatmapPath;
  const url = `https://osu.ppy.sh/osu/${beatmapId}`;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'KafkaBot/1.0' }, validateStatus: (s) => s >= 200 && s < 400, maxRedirects: 5 });
    fs.writeFileSync(beatmapPath, res.data);
    if (!fs.existsSync(beatmapPath) || fs.statSync(beatmapPath).size === 0) {
      try { fs.unlinkSync(beatmapPath); } catch { }
      throw new Error('Downloaded file is empty');
    }
    return beatmapPath;
  } catch (e) {
    console.error(`Failed to download .osu for ${beatmapId}:`, e?.message || e);
    return null;
  }
}

function readOsuText(beatmapPath) {
  try {
    const txt = fs.readFileSync(beatmapPath, 'utf8');
    return txt.replace(/^\uFEFF/, '').trim();
  } catch (e) {
    console.error('Failed to read .osu:', beatmapPath, e?.message || e);
    return '';
  }
}

function extractMeta(osuText) {
  const get = (key) => {
    const m = osuText.match(new RegExp(`^${key}:(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const artist = get('ArtistUnicode') || get('Artist');
  const title = get('TitleUnicode') || get('Title');
  const version = get('Version');
  const mapper = get('Creator');
  const ar = parseFloat(get('ApproachRate')) || null;
  const od = parseFloat(get('OverallDifficulty')) || null;
  const cs = parseFloat(get('CircleSize')) || null;
  const hp = parseFloat(get('HPDrainRate')) || null;
  return { artist, title, version, mapper, ar, od, cs, hp };
}

function totalObjectsOf(map) {
  if (typeof map.nObjects === 'number') return map.nObjects;
  const a = ['nCircles', 'nSliders', 'nSpinners'].map((k) => Number(map[k] || 0)).reduce((s, x) => s + x, 0);
  return a || undefined;
}

function accFromCounts(n300, n100, n50, misses) {
  const total = n300 + n100 + n50 + misses;
  if (total <= 0) return 0;
  const points = 300 * n300 + 100 * n100 + 50 * n50;
  return (points / (300 * total)) * 100;
}

function estimateCountsFromAcc(total, acc, misses) {
  const miss = Math.max(0, Number(misses || 0));
  const nRemain = Math.max(0, total - miss);
  const target = Math.round((acc / 100) * 300 * (nRemain + miss));
  let drop = 300 * (nRemain + miss) - target - 300 * miss;
  if (drop <= 0) return { n300: nRemain, n100: 0, n50: 0, misses: miss };
  const r = ((drop % 200) + 200) % 200;
  let n50 = Math.min(3, Math.round(r / 50));
  let rest = drop - 250 * n50;
  if (rest < 0) { n50 = Math.max(0, Math.ceil(drop / 250)); rest = drop - 250 * n50; }
  let n100 = Math.max(0, Math.floor(rest / 200));
  if (n50 + n100 > nRemain) {
    if (n50 > nRemain) { n50 = nRemain; n100 = 0; }
    else n100 = nRemain - n50;
  }
  let n300 = Math.max(0, nRemain - n100 - n50);
  return { n300, n100, n50, misses: miss };
}

async function calcPP(osuText, modStr, accList, extras) {
  const ro = await rosu();
  const map = new ro.Beatmap(osuText);
  const diffInit = {};
  if (modStr) diffInit.mods = modStr;
  if (typeof extras?.lazer === 'boolean') diffInit.lazer = extras.lazer;
  const diffAttrs = new ro.Difficulty(diffInit).calculate(map);
  const total = totalObjectsOf(map);
  const table = {};
  let info = {};
  const countsProvided = Number.isFinite(extras?.n100) || Number.isFinite(extras?.n50) || Number.isFinite(extras?.misses);
  const singleAcc = !countsProvided && Array.isArray(accList) && accList.length === 1;
  if (countsProvided && Number.isFinite(total)) {
    const miss = Math.max(0, Number(extras?.misses || 0));
    const n100 = Math.max(0, Number(extras?.n100 || 0));
    const n50 = Math.max(0, Number(extras?.n50 || 0));
    let n300 = Math.max(0, total - miss - n100 - n50);
    const acc = accFromCounts(n300, n100, n50, miss);
    const p = {};
    if (modStr) p.mods = modStr;
    if (typeof extras?.lazer === 'boolean') p.lazer = extras.lazer;
    if (Number.isFinite(extras?.combo)) p.combo = extras.combo;
    p.n300 = n300; p.n100 = n100; p.n50 = n50; p.misses = miss;
    const perf = new ro.Performance(p).calculate(diffAttrs);
    table[Number(acc.toFixed(2))] = Math.round(perf.pp);
    info = { n300, n100, n50, misses: miss, combo: extras?.combo, estimated: false, acc: Number(acc.toFixed(2)) };
  } else if (singleAcc && Number.isFinite(total)) {
    const a = accList[0];
    const miss = Math.max(0, Number(extras?.misses || 0));
    const est = estimateCountsFromAcc(total, a, miss);
    const p = {};
    if (modStr) p.mods = modStr;
    if (typeof extras?.lazer === 'boolean') p.lazer = extras.lazer;
    if (Number.isFinite(extras?.combo)) p.combo = extras.combo;
    p.n300 = est.n300; p.n100 = est.n100; p.n50 = est.n50; p.misses = est.misses;
    const perf = new ro.Performance(p).calculate(diffAttrs);
    table[Number(a.toFixed(2))] = Math.round(perf.pp);
    info = { n300: est.n300, n100: est.n100, n50: est.n50, misses: est.misses, combo: extras?.combo, estimated: true, acc: Number(a.toFixed(2)) };
  } else {
    for (const acc of accList) {
      const p = { accuracy: acc, hitresultPriority: ro.HitResultPriority.Fastest };
      if (modStr) p.mods = modStr;
      if (typeof extras?.lazer === 'boolean') p.lazer = extras.lazer;
      const perf = new ro.Performance(p).calculate(diffAttrs);
      table[acc] = Math.round(perf.pp);
    }
    info = { estimated: false };
  }
  const stars = typeof diffAttrs.stars === 'number' ? diffAttrs.stars : null;
  map.free?.();
  return { stars, table, info };
}

function makeEmbed(meta, modsLabel, stars, table, info) {
  const title = `${meta.artist || 'Unknown'} - ${meta.title || 'Unknown'} [${meta.version || '?'}] (${modsLabel})`;
  const lines = Object.entries(table).sort((a, b) => Number(a[0]) - Number(b[0])).map(([acc, pp]) => `${acc}% -> ${pp}pp`);
  const stats = [];
  if (meta.ar != null) stats.push(`AR ${meta.ar}`);
  if (meta.od != null) stats.push(`OD ${meta.od}`);
  if (meta.cs != null) stats.push(`CS ${meta.cs}`);
  if (meta.hp != null) stats.push(`HP ${meta.hp}`);
  const extra = [];
  if (Number.isFinite(info?.combo)) extra.push(`Combo ${info.combo}`);
  if (Number.isFinite(info?.n100)) extra.push(`100s ${info.n100}${info.estimated ? ' (est.)' : ''}`);
  if (Number.isFinite(info?.n50)) extra.push(`50s ${info.n50}${info.estimated ? ' (est.)' : ''}`);
  if (Number.isFinite(info?.misses)) extra.push(`Misses ${info.misses}${info.estimated ? ' (est.)' : ''}`);
  if (Number.isFinite(info?.acc) && (info.n100 != null || info.n50 != null || info.misses != null)) extra.push(`Acc ${info.acc}%`);
  const desc = [stars ? `**${stars.toFixed(2)}★**` : null, stats.join(' '), extra.length ? extra.join(' • ') : null, meta.mapper ? `by **${meta.mapper}**` : null].filter(Boolean).join(' | ');
  return new EmbedBuilder().setTitle(title).setDescription(desc || null).addFields({ name: `PP (${modsLabel})`, value: lines.join('\n') });
}

module.exports = {
  deleted: false,
  devOnly: false,
  testOnly: true,
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('osu! beatmap info + potential PP')
    .addStringOption((opt) => opt.setName('map').setDescription('Beatmap link or beatmap ID').setRequired(true))
    .addStringOption((opt) => opt.setName('acc').setDescription('Comma-separated accuracies or single accuracy'))
    .addIntegerOption((opt) => opt.setName('combo').setDescription('Score combo'))
    .addIntegerOption((opt) => opt.setName('misses').setDescription('Miss count'))
    .addIntegerOption((opt) => opt.setName('n100').setDescription('Number of 100s'))
    .addIntegerOption((opt) => opt.setName('n50').setDescription('Number of 50s'))
    .addBooleanOption((opt) => opt.setName('lazer').setDescription('Use lazer ruleset (default: off)')),
  run: async ({ interaction }) => {
    const bmInput = interaction.options.getString('map', true);
    const accRaw = interaction.options.getString('acc') || '';
    const beatmapId = parseBeatmapId(bmInput);
    const accList = parseAccList(accRaw);
    if (!beatmapId) return interaction.reply({ content: 'Could not parse a beatmap ID from that input.', ephemeral: true });
    await interaction.deferReply();

    const select = new StringSelectMenuBuilder().setCustomId(`mods:${interaction.user.id}:${beatmapId}`).setPlaceholder('Select mods. Leave empty for NM.').setMinValues(0).setMaxValues(MOD_OPTIONS.length).addOptions(MOD_OPTIONS);
    const calcBtn = new ButtonBuilder().setCustomId(`calc:${interaction.user.id}:${beatmapId}`).setLabel('Calculate').setStyle(ButtonStyle.Primary);
    const row1 = new ActionRowBuilder().addComponents(select);
    const row2 = new ActionRowBuilder().addComponents(calcBtn);

    const extras = {
      combo: interaction.options.getInteger('combo') ?? undefined,
      misses: interaction.options.getInteger('misses') ?? undefined,
      n100: interaction.options.getInteger('n100') ?? undefined,
      n50: interaction.options.getInteger('n50') ?? undefined,
      lazer: interaction.options.getBoolean('lazer') ?? false,
    };

    const prompt = await interaction.editReply({
      content: `Beatmap ID: \`${beatmapId}\`\nAccuracies: \`${accList.join(', ')}\`${Number.isFinite(extras.combo) ? `\nCombo: \`${extras.combo}\`` : ''}${Number.isFinite(extras.misses) ? `\nMisses: \`${extras.misses}\`` : ''}${Number.isFinite(extras.n100) ? `\n100s: \`${extras.n100}\`` : ''}${Number.isFinite(extras.n50) ? `\n50s: \`${extras.n50}\`` : ''}\nRuleset: \`${extras.lazer ? 'lazer' : 'stable'}\``,
      components: [row1, row2],
    });

    let currentMods = ['NM'];
    const filter = (i) => {
      const [kind, uid, id] = i.customId.split(':');
      return uid === interaction.user.id && id === String(beatmapId) && (kind === 'mods' || kind === 'calc');
    };
    const collector = prompt.createMessageComponentCollector({ filter, time: 120000 });

    collector.on('collect', async (i) => {
      try {
        const [kind] = i.customId.split(':');
        if (kind === 'mods') {
          currentMods = i.values.length ? i.values : ['NM'];
          const norm = normalizeMods(currentMods);
          if (!norm.ok) return i.reply({ content: norm.reason, ephemeral: true });
          return i.update({
            content: `Beatmap ID: \`${beatmapId}\`\nAccuracies: \`${accList.join(', ')}\`\nSelected mods: \`${currentMods.join(', ')}\`${Number.isFinite(extras.combo) ? `\nCombo: \`${extras.combo}\`` : ''}${Number.isFinite(extras.misses) ? `\nMisses: \`${extras.misses}\`` : ''}${Number.isFinite(extras.n100) ? `\n100s: \`${extras.n100}\`` : ''}${Number.isFinite(extras.n50) ? `\n50s: \`${extras.n50}\`` : ''}\nRuleset: \`${extras.lazer ? 'lazer' : 'stable'}\``,
            components: [row1, row2],
          });
        }
        if (kind === 'calc') {
          const norm = normalizeMods(currentMods);
          if (!norm.ok) return i.reply({ content: norm.reason, ephemeral: true });
          await i.deferUpdate();
          let beatmapPath;
          try {
            beatmapPath = await downloadBeatmapIfNeeded(beatmapId);
            if (!beatmapPath) {
              collector.stop('error');
              return interaction.editReply({ content: 'Failed to download the .osu file for that beatmap.', components: [] });
            }
          } catch (err) {
            collector.stop('error');
            return interaction.editReply({ content: `Failed to download .osu: ${String(err?.message || err)}`, components: [] });
          }
          const osuText = readOsuText(beatmapPath);
          if (!osuText) {
            collector.stop('error');
            return interaction.editReply({ content: 'Could not read the downloaded .osu file.', components: [] });
          }
          const meta = extractMeta(osuText);
          try {
            const { stars, table, info } = await calcPP(osuText, norm.combined, accList, extras);
            const embed = makeEmbed(meta, norm.display, stars, table, info);
            collector.stop('done');
            return interaction.editReply({ content: null, embeds: [embed], components: [] });
          } catch (err) {
            collector.stop('error');
            return interaction.editReply({ content: `PP calculation failed: ${String(err?.message || err)}`, components: [] });
          }
        }
      } catch (err) {
        console.error('Component error:', err);
        try {
          await i.reply({ content: 'Unexpected error. Try again.', ephemeral: true });
        } catch (e) {
          console.error(e);
        }
      }
    });

    collector.on('end', async (_c, reason) => {
      if (reason === 'done') return;
      try {
        const disabledSelect = StringSelectMenuBuilder.from(select).setDisabled(true);
        const disabledBtn = ButtonBuilder.from(calcBtn).setDisabled(true);
        await interaction.editReply({ components: [new ActionRowBuilder().addComponents(disabledSelect), new ActionRowBuilder().addComponents(disabledBtn)] });
      } catch (err) {
        console.error(err);
      }
    });
  },
};
