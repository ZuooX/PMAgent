import fs from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = "output/manifest.json";
const OUTPUT_PATH = "output/index.html";

const FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='32' y2='32' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23f7931e'/%3E%3Cstop offset='1' stop-color='%23e85d04'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='6' fill='url(%23g)'/%3E%3Crect x='6' y='7' width='20' height='14' rx='2' fill='none' stroke='white' stroke-width='2'/%3E%3Crect x='10' y='24' width='12' height='2' rx='1' fill='white' opacity='.7'/%3E%3Crect x='9' y='11' width='6' height='6' rx='1' fill='white' opacity='.85'/%3E%3Crect x='17' y='11' width='6' height='2' rx='1' fill='white' opacity='.6'/%3E%3Crect x='17' y='15' width='6' height='2' rx='1' fill='white' opacity='.4'/%3E%3C/svg%3E`;

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeTag() {
  return `<span class="type type-proto">Prototype</span>`;
}

function renderCard(page) {
  const featsHtml = (page.features || [])
    .slice(0, 8)
    .map((f) => `<span class="feat">${escapeHtml(f)}</span>`)
    .join("");
  const layoutLabel = [page.product, page.layout].filter(Boolean).join(" · ");

  return `        <a class="card" href="${escapeHtml(page.file)}">
          <div class="card-top">
            <h3>${escapeHtml(page.title)} ${typeTag()}</h3>
            <p>${escapeHtml(page.description || "")}</p>
            <div class="features">${featsHtml}</div>
          </div>
          <div class="card-bottom">
            <span class="prod">${escapeHtml(layoutLabel)}</span>
            <div class="arrow"><svg fill="none" stroke="#fff" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></div>
          </div>
        </a>`;
}

async function main() {
  const raw = await fs.readFile(path.resolve(MANIFEST_PATH), "utf-8");
  const manifest = JSON.parse(raw);
  const pages = manifest.pages || [];

  const groups = new Map();
  for (const page of pages) {
    const key = page.tcVersion || page.version || "other";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(page);
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const na = parseFloat(a.replace(/[^\d.]/g, "")) || 0;
    const nb = parseFloat(b.replace(/[^\d.]/g, "")) || 0;
    return nb - na;
  });

  let sectionsHtml = "";
  for (const key of sortedKeys) {
    const groupPages = groups.get(key);
    const sectionTitle = key === "other" ? "其他" : `版本 ${key}`;

    const cardsHtml = groupPages.map(renderCard).join("\n");

    sectionsHtml += `
    <div class="section">
      <div class="section-title">
        <h2>${escapeHtml(sectionTitle)}</h2>
        <span class="badge">${groupPages.length} page${groupPages.length > 1 ? "s" : ""}</span>
      </div>
      <div class="grid">
${cardsHtml}
      </div>
    </div>`;
  }

  const totalPages = pages.length;
  const versionSummary = sortedKeys.filter((k) => k !== "other").join(" / ") || "—";

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PM Agent — 交互稿预览</title>
  <link rel="icon" type="image/svg+xml" href="${FAVICON}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',-apple-system,sans-serif;background:#f8f9fb;color:#333;min-height:100vh}
    .header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:48px 0 40px;text-align:center}
    .header h1{font-size:28px;font-weight:800;color:#fff;margin-bottom:6px}
    .header p{font-size:14px;color:rgba(255,255,255,.55);font-weight:400}
    .container{max-width:1100px;margin:0 auto;padding:0 24px}
    .section{margin-top:36px}
    .section-title{display:flex;align-items:center;gap:10px;margin-bottom:16px}
    .section-title h2{font-size:18px;font-weight:700;color:#111}
    .section-title .badge{background:#f7931e;color:#fff;font-size:11px;font-weight:600;padding:2px 10px;border-radius:10px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
    .card{background:#fff;border-radius:14px;border:1px solid #e8eaed;overflow:hidden;transition:all .2s;text-decoration:none;color:inherit;display:flex;flex-direction:column}
    .card:hover{box-shadow:0 8px 30px rgba(0,0,0,.1);transform:translateY(-2px);border-color:#d0d3d8}
    .card-top{padding:20px 20px 12px;flex:1}
    .card-top h3{font-size:15px;font-weight:600;color:#111;margin-bottom:4px;display:flex;align-items:center;gap:8px}
    .card-top .type{font-size:9px;font-weight:600;padding:2px 7px;border-radius:4px;text-transform:uppercase;flex-shrink:0}
    .type-proto{background:#eef2ff;color:#6366f1}
    .card-top p{font-size:12px;color:#888;line-height:1.5;margin-bottom:10px}
    .features{display:flex;flex-wrap:wrap;gap:4px}
    .feat{font-size:10px;color:#666;background:#f5f5f5;padding:2px 8px;border-radius:4px;white-space:nowrap}
    .card-bottom{padding:12px 20px;border-top:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
    .card-bottom .prod{font-size:11px;color:#999;font-weight:500}
    .card-bottom .arrow{width:24px;height:24px;background:#f7931e;border-radius:50%;display:flex;align-items:center;justify-content:center}
    .card-bottom .arrow svg{width:12px;height:12px}
    .footer{text-align:center;padding:40px 0 32px;font-size:12px;color:#bbb}
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>PM Agent</h1>
      <p>交互稿预览中心 · 共 ${totalPages} 个页面</p>
    </div>
  </div>
  <div class="container">${sectionsHtml}
  </div>
  <div class="footer">PM Agent · ${versionSummary} 交互稿</div>
</body>
</html>
`;

  await fs.writeFile(path.resolve(OUTPUT_PATH), html, "utf-8");
  console.log(
    `output/index.html generated: ${totalPages} pages in ${sortedKeys.length} groups`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
