import PptxGenJS from 'pptxgenjs';

// ── Color palette ─────────────────────────────────────────────────
const C = {
  bg:          '0a0f1e',
  card:        '111827',
  cardBorder:  '1e2d45',
  teal:        '0d9488',
  tealLight:   '14b8a6',
  gold:        'f59e0b',
  orange:      'ea580c',
  red:         'ef4444',
  green:       '22c55e',
  greenDark:   '16a34a',
  purple:      '7c3aed',
  white:       'FFFFFF',
  dim:         '94a3b8',
  body:        'cbd5e1',
  sub:         '64748b',
};

const FONT = 'Anek Malayalam';

// ── Fetch & embed Anek Malayalam font ─────────────────────────────
// Google Fonts GitHub repo hosts the actual TTF files.
// We fetch it at export time and embed it so viewers don't need it installed.
async function embedAnekMalayalamFont(pres) {
  const FONT_URL =
    'https://raw.githubusercontent.com/google/fonts/main/ofl/anekmalayalam/AnekMalayalam%5Bwdth%2Cwght%5D.ttf';

  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    const bytes  = new Uint8Array(buffer);

    // Convert to base64 in chunks (avoid call-stack limits)
    let base64 = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      base64 += btoa(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
    }

    // pptxgenjs v4 font embedding API
    // Embeds the font into the PPTX zip so it renders without installation
    if (pres.fonts === undefined) pres.fonts = [];
    pres.fonts.push({ name: FONT, data: base64, type: 'regular' });

    console.log('✅ Anek Malayalam font embedded in PPT');
  } catch (err) {
    console.warn('⚠️  Could not embed Anek Malayalam font – viewers need it installed:', err.message);
  }
}

// ── Slide helpers ─────────────────────────────────────────────────
function addBg(slide) {
  slide.background = { fill: C.bg };
}

function addBar(slide, x, y, w, h, pct, color = C.teal) {
  slide.addShape('rect', { x, y, w, h, fill: { type: 'solid', color: '1e2d45' }, line: { color: '1e2d45' } });
  if (pct > 0) {
    slide.addShape('rect', { x, y, w: w * Math.min(pct, 1), h, fill: { type: 'solid', color }, line: { color } });
  }
}

function addTopAccent(slide, color = C.teal) {
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.07, fill: { type: 'solid', color }, line: { color } });
}

function addPageNum(slide, n, total) {
  slide.addText(`${n} / ${total}`, {
    x: 11.6, y: 6.95, w: 1.5, h: 0.3,
    fontSize: 9, color: C.sub, align: 'right', italic: true, fontFace: FONT,
  });
}

function addHeading(slide, icon, text, y = 0.3) {
  slide.addText(`${icon}  ${text}`, {
    x: 0.35, y, w: 12.3, h: 0.75,
    fontSize: 28, bold: true, color: C.white, fontFace: FONT,
  });
}

function addSub(slide, text, y = 1.1) {
  slide.addText(text, {
    x: 0.35, y, w: 12.3, h: 0.4,
    fontSize: 13, color: C.dim, italic: true, fontFace: FONT,
  });
}

// ── Slide builders ────────────────────────────────────────────────

function buildOverview(pres, data, n, total) {
  const slide = pres.addSlide();
  addBg(slide);
  addTopAccent(slide);
  addPageNum(slide, n, total);

  slide.addText('✨', { x: 5.9, y: 0.45, w: 1.5, h: 1, fontSize: 44, align: 'center' });
  slide.addText('QHLS Report', {
    x: 0, y: 1.4, w: '100%', h: 0.9,
    fontSize: 44, bold: true, color: C.white, align: 'center', fontFace: FONT,
  });

  const totalQhls = data.syllabusStats.totalQhls;
  const totalUnits = data.totalUnits;
  const missing    = totalUnits - totalQhls;
  const pct        = totalUnits > 0 ? Math.round((totalQhls / totalUnits) * 100) : 0;

  const stats = [
    { val: String(totalQhls),  lbl: 'QHLS ഉള്ള ശാഖകൾ',    col: C.teal },
    { val: String(missing),    lbl: 'QHLS ഇല്ലാത്ത ശാഖകൾ', col: C.orange },
    { val: String(totalUnits), lbl: 'ആകെ ശാഖകൾ',          col: C.gold },
    { val: `${pct}%`,          lbl: 'കവറേജ്',              col: C.green },
  ];

  const cW = 2.75, cH = 1.65, gap = 0.28;
  const startX = (13.33 - stats.length * cW - (stats.length - 1) * gap) / 2;
  const cY = 2.75;

  stats.forEach((s, i) => {
    const x = startX + i * (cW + gap);
    slide.addShape('rect', { x, y: cY, w: cW, h: cH, fill: { type: 'solid', color: C.card }, line: { color: C.cardBorder, pt: 1 }, rectRadius: 0.1 });
    slide.addText(s.val, { x, y: cY + 0.14, w: cW, h: 0.85, fontSize: 38, bold: true, color: s.col, align: 'center', fontFace: FONT });
    slide.addText(s.lbl,  { x, y: cY + 1.05, w: cW, h: 0.5,  fontSize: 12, color: C.dim,   align: 'center', fontFace: FONT });
  });
}

function buildZoneGroup(pres, missingCount, zones, n, total) {
  const slide = pres.addSlide();
  addBg(slide);

  const cnt = parseInt(missingCount);
  let title, icon, accent;
  if (cnt === 0)      { title = '100% QHLS – എല്ലാ ശാഖകളിലും ഉണ്ട്';    icon = '🏆'; accent = C.green;  }
  else if (cnt === 1) { title = 'ഒരു ശാഖ ഇല്ലാത്ത മണ്ഡലങ്ങൾ';           icon = '🟡'; accent = C.gold;   }
  else if (cnt === 2) { title = 'രണ്ട് ശാഖ ഇല്ലാത്ത മണ്ഡലങ്ങൾ';         icon = '🟠'; accent = C.orange; }
  else                { title = `${cnt} ശാഖകൾ ഇല്ലാത്ത മണ്ഡലങ്ങൾ`;      icon = '🔴'; accent = C.red;    }

  addTopAccent(slide, accent);
  addHeading(slide, icon, title);
  addSub(slide, `${zones.length} മണ്ഡലം`);
  addPageNum(slide, n, total);

  const cols    = Math.min(zones.length <= 4 ? zones.length : Math.ceil(Math.sqrt(zones.length)), 5);
  const rows    = Math.ceil(zones.length / cols);
  const cW      = (12.6 / cols) - 0.14;
  const cH      = Math.min(1.05, (5.3 / rows) - 0.13);
  const startX  = 0.35;
  const startY  = 1.65;

  zones.forEach((z, i) => {
    const x = startX + (i % cols) * (cW + 0.14);
    const y = startY + Math.floor(i / cols) * (cH + 0.13);
    slide.addShape('rect', { x, y, w: cW, h: cH, fill: { type: 'solid', color: C.card }, line: { color: accent, pt: 1 }, rectRadius: 0.07 });
    slide.addText(z.zoneName,               { x: x + 0.1, y: y + 0.06, w: cW - 0.2, h: cH * 0.56, fontSize: Math.min(15, cH * 30), bold: true,  color: C.white,  fontFace: FONT });
    slide.addText(`${z.qhlsCount}/${z.totalUnits}`, { x: x + 0.1, y: y + cH * 0.56, w: cW - 0.2, h: cH * 0.4,  fontSize: Math.min(12, cH * 24), bold: false, color: accent, fontFace: FONT });
  });
}

function buildSyllabus(pres, tab, totalQhls, n, total) {
  const slide  = pres.addSlide();
  addBg(slide);
  const accent = tab.color.replace('#', '');
  addTopAccent(slide, accent);
  addHeading(slide, '📚', `${tab.label} – ${tab.labelMl}`);
  addSub(slide, `${tab.count} / ${totalQhls} ശാഖകൾ`);
  addPageNum(slide, n, total);

  const units = tab.units || [];
  if (units.length === 0) {
    slide.addText('ഒരു ശാഖയും ഇല്ല', { x: 0, y: 3.5, w: '100%', h: 0.8, fontSize: 22, color: C.dim, align: 'center', fontFace: FONT });
    return;
  }

  const cols   = Math.min(units.length <= 4 ? units.length : Math.ceil(Math.sqrt(units.length)), 5);
  const rows   = Math.ceil(units.length / cols);
  const cW     = (12.6 / cols) - 0.13;
  const cH     = Math.min(1.05, (5.2 / rows) - 0.11);
  const startX = 0.35;
  const startY = 1.72;

  units.forEach((u, i) => {
    const x = startX + (i % cols) * (cW + 0.13);
    const y = startY + Math.floor(i / cols) * (cH + 0.11);
    slide.addShape('rect', { x, y, w: cW, h: cH, fill: { type: 'solid', color: C.card }, line: { color: accent, pt: 1 }, rectRadius: 0.07 });
    slide.addText(u.unit, { x: x + 0.1, y: y + 0.06, w: cW - 0.2, h: cH * 0.56, fontSize: Math.min(14, cH * 28), bold: true,  color: C.white, fontFace: FONT });
    slide.addText(u.zone, { x: x + 0.1, y: y + cH * 0.56, w: cW - 0.2, h: cH * 0.4,  fontSize: Math.min(11, cH * 22), bold: false, color: accent, fontFace: FONT });
  });
}

function buildAfterRamadan(pres, data, n, total) {
  const slide = pres.addSlide();
  addBg(slide);
  addTopAccent(slide, C.green);
  addHeading(slide, '🌙', 'റമദാനിന് ശേഷവും QHLS ഉള്ള ശാഖകൾ');
  addPageNum(slide, n, total);

  const totalAfter = Object.values(data.zoneStats).reduce((s, z) => s + z.afterRamadanCount, 0);
  const totalQhls  = data.syllabusStats.totalQhls;

  // Global summary boxes
  slide.addShape('rect', { x: 0.35, y: 1.15, w: 8.1, h: 0.72, fill: { type: 'solid', color: '052e16' }, line: { color: C.greenDark, pt: 1 }, rectRadius: 0.07 });
  slide.addText(`${totalAfter} / ${totalQhls} QHLS ശാഖകൾ തുടരുന്നു`, { x: 0.55, y: 1.2, w: 7.7, h: 0.62, fontSize: 18, bold: true, color: C.green, fontFace: FONT });
  slide.addShape('rect', { x: 8.65, y: 1.15, w: 4.1, h: 0.72, fill: { type: 'solid', color: C.teal }, line: { color: C.teal, pt: 1 }, rectRadius: 0.07 });
  slide.addText(`${data.zonesWith100PercentAfterRamadan} മണ്ഡലം 100% തുടരുന്നു`, { x: 8.75, y: 1.2, w: 3.9, h: 0.62, fontSize: 13, bold: true, color: C.white, align: 'center', fontFace: FONT });

  const zones = Object.keys(data.zoneStats)
    .filter(z => data.zoneStats[z].qhlsCount > 0)
    .sort((a, b) => {
      const za = data.zoneStats[a], zb = data.zoneStats[b];
      return (zb.afterRamadanCount / zb.qhlsCount) - (za.afterRamadanCount / za.qhlsCount);
    })
    .slice(0, 18);

  const rowH   = Math.min(0.34, 5.0 / zones.length);
  const startY = 2.05;

  zones.forEach((zone, i) => {
    const z     = data.zoneStats[zone];
    const ratio = z.qhlsCount > 0 ? z.afterRamadanCount / z.qhlsCount : 0;
    const pct   = Math.round(ratio * 100);
    const y     = startY + i * (rowH + 0.05);
    const fs    = Math.min(11, rowH * 26);

    slide.addText(zone, { x: 0.35, y, w: 3.6, h: rowH, fontSize: fs, bold: true, color: C.body, valign: 'middle', fontFace: FONT });
    slide.addText(`${z.afterRamadanCount}/${z.qhlsCount}`, { x: 3.95, y, w: 1.05, h: rowH, fontSize: fs - 1, color: C.teal, align: 'center', valign: 'middle', fontFace: FONT });
    addBar(slide, 5.1, y + (rowH - 0.12) / 2, 7.0, 0.12, ratio, pct === 100 ? C.green : C.teal);
    slide.addText(`${pct}%`, { x: 12.2, y, w: 0.8, h: rowH, fontSize: fs - 1, color: C.sub, align: 'right', valign: 'middle', fontFace: FONT });
  });
}

function buildStopped(pres, data, n, total) {
  const slide = pres.addSlide();
  addBg(slide);
  addTopAccent(slide, C.red);
  addHeading(slide, '⛔', 'റമദാനിന് ശേഷം QHLS ആരംഭിക്കാത്ത ശാഖകൾ');
  addPageNum(slide, n, total);

  const units = data.afterRamadanStoppedUnits || [];
  if (units.length === 0) {
    slide.addText('🎉 എല്ലാ ശാഖകളും തുടരുന്നു!', { x: 0, y: 3.3, w: '100%', h: 0.9, fontSize: 30, bold: true, color: C.green, align: 'center', fontFace: FONT });
    return;
  }

  const cols   = Math.min(units.length <= 4 ? units.length : Math.ceil(Math.sqrt(units.length)), 5);
  const rows   = Math.ceil(units.length / cols);
  const cW     = (12.6 / cols) - 0.13;
  const cH     = Math.min(1.05, (5.2 / rows) - 0.11);
  const startX = 0.35;
  const startY = 1.72;

  units.forEach((u, i) => {
    const x = startX + (i % cols) * (cW + 0.13);
    const y = startY + Math.floor(i / cols) * (cH + 0.11);
    slide.addShape('rect', { x, y, w: cW, h: cH, fill: { type: 'solid', color: '1a0a0a' }, line: { color: C.red, pt: 1 }, rectRadius: 0.07 });
    slide.addText(u.unit, { x: x + 0.1, y: y + 0.06, w: cW - 0.2, h: cH * 0.56, fontSize: Math.min(14, cH * 28), bold: true,  color: 'fca5a5', fontFace: FONT });
    slide.addText(u.zone, { x: x + 0.1, y: y + cH * 0.56, w: cW - 0.2, h: cH * 0.4,  fontSize: Math.min(11, cH * 22), bold: false, color: C.red,    fontFace: FONT });
  });
}

// ── Main export ───────────────────────────────────────────────────
export async function exportReportToPpt(data) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in, 16:9

  // Embed Anek Malayalam font so it renders on any machine
  await embedAnekMalayalamFont(pres);

  const syllabusTabs = [
    { key: 'hajj',    label: 'സൂറത്ത് ഹജ്ജ്',     labelMl: 'Surah Hajj',     color: '#0d9488', count: data.syllabusStats.hajj,    units: data.syllabusLists?.hajj    || [] },
    { key: 'muminun', label: 'സൂറത്ത് മുഅ്മിനൂൻ', labelMl: "Surah Mu'minun", color: '#7c3aed', count: data.syllabusStats.muminun,  units: data.syllabusLists?.muminun || [] },
    { key: 'others',  label: 'മറ്റ് സിലബസ്',       labelMl: 'Others',          color: '#ea580c', count: data.syllabusStats.others,   units: data.syllabusLists?.others  || [] },
  ];

  const missingKeys  = Object.keys(data.zonesByMissingCount).sort((a, b) => parseInt(a) - parseInt(b));
  const totalSlides  = 1 + missingKeys.length + syllabusTabs.length + 1 + 1;
  let sn = 1;

  buildOverview(pres, data, sn++, totalSlides);
  missingKeys.forEach(k  => buildZoneGroup(pres, k, data.zonesByMissingCount[k], sn++, totalSlides));
  syllabusTabs.forEach(t => buildSyllabus(pres, t, data.syllabusStats.totalQhls, sn++, totalSlides));
  buildAfterRamadan(pres, data, sn++, totalSlides);
  buildStopped(pres, data, sn++, totalSlides);

  await pres.writeFile({ fileName: 'QHLS_Report.pptx' });
}
