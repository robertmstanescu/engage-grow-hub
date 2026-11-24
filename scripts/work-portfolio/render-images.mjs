/**
 * Draw the Work diagrams and social cards with the site's look.
 *
 *   node scripts/work-portfolio/render-images.mjs <manifest.json> <public dir>
 *
 * For every entry it writes, under <public>/work/<slug>/:
 *   diagram.webp  1600x900, liquid-glass cards on the Isabelline mesh,
 *                 tinted with the pillar's partner colour (lighter pair)
 *   og.jpg        1200x630 social card: the cover, a Revolver veil, the
 *                 type chip, the title and the emblem
 *
 * Brand: headings Funnel Display, body Inter, small labels pure black,
 * no coloured edge stripes and no underlines (owner's rules, 10 Nov
 * 2026). Pillar pairs come from lib/constants/pillarColors.ts.
 *
 * Needs: the pre-installed Playwright Chromium, and network access to
 * Google Fonts. The covers (cover.webp) must exist first; run
 * make-covers.py before this script.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [manifestPath, publicDir] = process.argv.slice(2);
if (!manifestPath || !publicDir) {
  console.error("usage: node scripts/work-portfolio/render-images.mjs <manifest.json> <public dir>");
  process.exit(2);
}

/* Accent and lighter partner per pillar (owner's palette, 10 Nov 2026). */
const PILLARS = {
  ic: { name: "Internal Communications", accent: "#3D348B", tint: "#6B61C3" },
  ex: { name: "Employee Experience", accent: "#0047AB", tint: "#307FEF" },
  ops: { name: "People Operations", accent: "#B11226", tint: "#F8465C" },
  hrbp: { name: "Fractional HRBP", accent: "#005C42", tint: "#1A8164" },
  pay: { name: "Pay Transparency", accent: "#E36414", tint: "#FF8D45" },
  mgr: { name: "Manager Enablement", accent: "#702963", tint: "#9D4D8E" },
};
const TYPE_CHIP = { case: "Case", artefact: "Artefact", playbook: "Playbook" };
const RAG = { red: "#C62828", amber: "#E39B14", green: "#1A8164" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const emblem = `data:image/png;base64,${fs.readFileSync(new URL("./assets/emblem.png", import.meta.url)).toString("base64")}`;

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=block">';

const baseCss = (p) => `
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1600px;height:900px;overflow:hidden;font-family:Inter,sans-serif;color:#000;
    background:
      radial-gradient(60% 70% at 12% 18%, ${p.tint}40 0%, transparent 60%),
      radial-gradient(55% 60% at 88% 85%, ${p.accent}33 0%, transparent 62%),
      radial-gradient(40% 45% at 75% 10%, #4D1B5E22 0%, transparent 60%),
      #F4F0EC;}
  .frame{position:absolute;inset:64px 72px;display:flex;flex-direction:column;gap:40px}
  .eyebrow{font:600 18px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:#000;display:flex;align-items:center;gap:12px}
  .dot{width:12px;height:12px;border-radius:50%;background:${p.accent}}
  h1{font:700 54px/1.08 'Funnel Display',sans-serif;color:#2A0E33;letter-spacing:-.01em;max-width:1200px}
  .glass{background:linear-gradient(160deg,rgba(255,255,255,.72),rgba(255,255,255,.42));
    border:1px solid rgba(255,255,255,.85);border-radius:22px;
    box-shadow:0 18px 40px -18px ${p.accent}55, inset 0 1px 0 rgba(255,255,255,.9);
    backdrop-filter:blur(18px)}
  .foot{position:absolute;left:72px;right:72px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:500 17px/1 Inter;color:#000}
  .brand{display:flex;align-items:center;gap:12px;font:600 18px/1 'Funnel Display'}
  .brand img{height:30px}
  .label{padding:9px 16px;border-radius:999px;background:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.9)}
`;

const footer = (e) => `
  <div class="foot">
    <span class="label">${esc(e.honestyLabel)}</span>
    <span class="brand"><img src="${emblem}" alt="">The Magic Coffin</span>
  </div>`;

function flowHtml(e, p) {
  const nodes = e.diagram.nodes;
  const cards = nodes
    .map(
      (n, i) => `
      <div class="node glass">
        <span class="num" style="background:${p.tint}">${String(i + 1).padStart(2, "0")}</span>
        <h2>${esc(n.label)}</h2>
        <p>${esc(n.note)}</p>
      </div>${i < nodes.length - 1 ? '<div class="arrow"><svg width="34" height="20" viewBox="0 0 34 20"><path d="M0 10h30M22 2l8 8-8 8" fill="none" stroke="#2A0E33" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' : ""}`,
    )
    .join("");
  return `<style>
    .row{display:flex;align-items:stretch;height:430px;margin:auto 0 96px}
    .node{flex:1;padding:44px 28px 36px;display:flex;flex-direction:column;justify-content:flex-start;gap:18px;min-width:0}
    .num{align-self:flex-start;color:#fff;font:600 17px/1 Inter;padding:9px 13px;border-radius:999px}
    .node h2{font:600 ${nodes.length > 5 ? 30 : nodes.length > 3 ? 34 : 42}px/1.15 'Funnel Display';color:#2A0E33}
    .node p{font:400 ${nodes.length > 5 ? 21 : nodes.length > 3 ? 24 : 28}px/1.4 Inter;color:#000}
    .arrow{display:flex;align-items:center;padding:0 10px}
  </style>
  <div class="row">${cards}</div>`;
}

function docHtml(e) {
  const d = e.diagram;
  const blocks = d.blocks
    .map(
      (b) => `<div class="blk"><span class="bl">${esc(b.label)}</span>${b.lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>`,
    )
    .join("");
  return `<style>
    .paper{margin:auto 0 90px;padding:44px 52px;display:flex;flex-direction:column;gap:30px}
    .paper h2{font:600 34px/1.15 'Funnel Display';color:#2A0E33}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:22px 48px}
    .blk{display:flex;flex-direction:column;gap:6px;padding:22px 24px;border-radius:16px;background:rgba(255,255,255,.55)}
    .bl{font:600 16px/1 Inter;letter-spacing:.12em;text-transform:uppercase;color:#000;margin-bottom:8px}
    .blk p{font:400 25px/1.4 Inter;color:#000}
  </style>
  <div class="paper glass"><h2>${esc(d.heading)}</h2><div class="grid">${blocks}</div></div>`;
}

function ragHtml(e) {
  const rows = e.diagram.rows
    .map(
      (r) => `<div class="r">
        <span class="chk">${esc(r.check)}</span>
        <span class="st" style="background:${RAG[r.status]}">${r.status === "red" ? "Red" : r.status === "amber" ? "Amber" : "Green"}</span>
        <span class="nt">${esc(r.note)}</span>
      </div>`,
    )
    .join("");
  return `<style>
    .tbl{margin:auto 0 90px;padding:30px 44px;display:flex;flex-direction:column;justify-content:center}
    .r{display:grid;grid-template-columns:1.2fr 160px 1.3fr;align-items:center;gap:32px;padding:26px 0;border-bottom:1px solid rgba(42,14,51,.14)}
    .r:last-child{border-bottom:0}
    .chk{font:600 30px/1.2 'Funnel Display';color:#2A0E33}
    .st{justify-self:start;color:#fff;font:600 20px/1 Inter;padding:12px 22px;border-radius:999px}
    .nt{font:400 23px/1.35 Inter;color:#000}
  </style>
  <div class="tbl glass">${rows}</div>`;
}

function diagramPage(e) {
  const p = PILLARS[e.pillar];
  const body = e.diagram.kind === "flow" ? flowHtml(e, p) : e.diagram.kind === "doc" ? docHtml(e) : ragHtml(e);
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${baseCss(p)}</style></head>
  <body><div class="frame">
    <span class="eyebrow"><span class="dot"></span>${esc(p.name)} · ${esc(TYPE_CHIP[e.type])}</span>
    <h1>${esc(e.diagram.title)}</h1>
    ${body}
  </div>${footer(e)}</body></html>`;
}

function ogPage(e, coverDataUrl) {
  const p = PILLARS[e.pillar];
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{width:1200px;height:630px;overflow:hidden;font-family:Inter,sans-serif;color:#F4F0EC;
      background:#2A0E33 url(${coverDataUrl}) center/cover no-repeat}
    .veil{position:absolute;inset:0;background:linear-gradient(100deg,rgba(42,14,51,.94) 0%,rgba(42,14,51,.82) 48%,rgba(42,14,51,.35) 100%)}
    .in{position:absolute;inset:56px 64px;display:flex;flex-direction:column;justify-content:space-between}
    .top{display:flex;gap:12px;align-items:center}
    .chip{font:600 17px/1 Inter;letter-spacing:.12em;text-transform:uppercase;padding:10px 16px;border-radius:999px;
      background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);backdrop-filter:blur(12px)}
    .pill{display:flex;align-items:center;gap:10px;font:500 18px/1 Inter}
    .dot{width:12px;height:12px;border-radius:50%;background:${p.tint}}
    h1{font:700 62px/1.05 'Funnel Display';letter-spacing:-.01em;max-width:860px;text-wrap:balance}
    .foot{display:flex;justify-content:space-between;align-items:center;font:500 19px/1 Inter}
    .brand{display:flex;align-items:center;gap:12px;font:600 22px/1 'Funnel Display'}
    .em{width:24px;height:36px;background:#F4F0EC;-webkit-mask:url(${emblem}) center/contain no-repeat;mask:url(${emblem}) center/contain no-repeat}
  </style></head><body><div class="veil"></div>
  <div class="in">
    <div class="top"><span class="chip">${esc(TYPE_CHIP[e.type])}</span><span class="pill"><span class="dot"></span>${esc(p.name)}</span></div>
    <h1>${esc(e.title)}</h1>
    <div class="foot"><span>${esc(e.honestyLabel)}</span><span class="brand"><span class="em"></span>The Magic Coffin</span></div>
  </div></body></html>`;
}

const main = async () => {
  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // CHROMIUM_PATH lets a machine with a different Playwright build point at its browser.
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    for (const e of entries) {
      const dir = path.join(publicDir, "work", e.slug);
      const coverFile = path.join(dir, "cover.webp");
      if (!fs.existsSync(coverFile)) throw new Error(`${e.slug}: run make-covers.py first (no ${coverFile})`);

      await page.setViewportSize({ width: 1600, height: 900 });
      await page.setContent(diagramPage(e), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({ type: "png" });
      fs.writeFileSync(path.join(dir, "diagram.png"), png);

      const cover = `data:image/webp;base64,${fs.readFileSync(coverFile).toString("base64")}`;
      await page.setViewportSize({ width: 1200, height: 630 });
      await page.setContent(ogPage(e, cover), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ type: "jpeg", quality: 82, path: path.join(dir, "og.jpg") });
      console.log(`${e.slug}: diagram + og`);
    }
  } finally {
    await browser.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
