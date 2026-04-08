import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { marked } from "marked";

// Default input: pass a requirement.md path as first argument
// Example: node build-prd-preview.mjs projects/my-project/sprints/v1.0/requirement.md
const DEFAULT_INPUT = "projects";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildHtml(contentHtml, meta) {
  const contentLiteral = JSON.stringify(contentHtml);
  const titleLiteral = JSON.stringify(meta.title);
  const sourceLiteral = JSON.stringify(meta.sourcePath);
  const assetPrefixLiteral = JSON.stringify(meta.assetPrefix);
  const sprintsLiteral = JSON.stringify(meta.sprints || []);
  const currentSprintLiteral = JSON.stringify(meta.currentSprint || "");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title} · PRD 预览</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%233b82f6'/%3E%3Cpath d='M8 9h16v2H8zm0 4h16v2H8zm0 4h12v2H8z' fill='white'/%3E%3C/svg%3E">
  <style>
    :root {
      --bg: #f8f9fb;
      --panel: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
      --line: #e2e8f0;
      --accent: #3b82f6;
      --content-max: 920px;
      --toc-width: 320px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    }
    .layout {
      display: grid;
      grid-template-columns: 1fr var(--toc-width);
      min-height: 100vh;
      transition: grid-template-columns .25s ease;
    }
    .layout.toc-hidden {
      grid-template-columns: 1fr 0;
    }
    .main {
      padding: 20px 28px 48px 28px;
      overflow-x: auto;
    }
    .main-inner {
      max-width: var(--content-max);
      margin: 0 auto;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(180deg, rgba(248,249,251,0.97), rgba(248,249,251,0.88));
      border-bottom: 1px solid var(--line);
      padding: 12px 0;
      margin-bottom: 16px;
      backdrop-filter: blur(8px);
    }
    .title-wrap h1 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
    }
    .title-wrap p {
      margin: 4px 0 0 0;
      color: var(--muted);
      font-size: 12px;
      word-break: break-all;
    }
    .btn {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn:hover { border-color: #94a3b8; color: #1e293b; background: #f1f5f9; }
    .sprint-select {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 28px 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
    }
    .sprint-select:hover { border-color: #94a3b8; background-color: #f8fafc; }
    .sprint-select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .toolbar-right { display: flex; gap: 8px; align-items: center; }
    .content {
      line-height: 1.7;
      color: var(--text);
    }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
      color: #0f172a;
      scroll-margin-top: 68px;
      margin-top: 1.4em;
      margin-bottom: .6em;
    }
    .content h1 { font-size: 32px; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
    .content h2 { font-size: 26px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .content h3 { font-size: 22px; }
    .content h4 { font-size: 18px; }
    .content p { margin: 10px 0; }
    .content code {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 2px 6px;
      color: #6366f1;
      font-size: .92em;
    }
    .content pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      overflow: auto;
    }
    .content pre code {
      border: none;
      background: transparent;
      color: #334155;
      padding: 0;
    }
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .content th, .content td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    .content th { background: #f1f5f9; color: #334155; font-weight: 600; }
    .content img {
      max-width: 280px;
      max-height: 180px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: inline-block;
      margin: 8px 4px;
      background: #ffffff;
      cursor: pointer;
      transition: box-shadow .2s, transform .15s;
    }
    .content img:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      transform: scale(1.02);
    }
    .lb-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.85);
      display: none; align-items: center; justify-content: center;
    }
    .lb-overlay.open { display: flex; }
    .lb-wrap {
      position: relative;
      max-width: 95vw; max-height: 95vh;
      overflow: hidden;
      cursor: grab;
    }
    .lb-wrap.dragging { cursor: grabbing; }
    .lb-wrap img {
      display: block;
      max-width: none;
      transform-origin: 0 0;
      user-select: none;
      -webkit-user-drag: none;
    }
    .lb-bar {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      z-index: 1001; display: none;
      gap: 8px; align-items: center;
      background: rgba(30,41,59,0.9); border-radius: 12px; padding: 8px 16px;
    }
    .lb-bar.open { display: flex; }
    .lb-bar button {
      background: transparent; border: 1px solid rgba(255,255,255,0.2);
      color: #e2e8f0; font-size: 13px; padding: 4px 12px; border-radius: 8px;
      cursor: pointer;
    }
    .lb-bar button:hover { background: rgba(255,255,255,0.1); }
    .lb-bar span { color: #94a3b8; font-size: 12px; min-width: 50px; text-align: center; }
    .content blockquote {
      margin: 12px 0;
      padding: 8px 12px;
      border-left: 3px solid var(--accent);
      color: #475569;
      background: #f1f5f9;
    }
    .content ul, .content ol {
      padding-left: 1.5em;
    }
    .content li { margin: 4px 0; }
    .content hr {
      border: none;
      border-top: 1px solid var(--line);
      margin: 24px 0;
    }
    .content a { color: var(--accent); text-decoration: none; }
    .content a:hover { text-decoration: underline; }
    .content strong { color: #0f172a; }
    .toc {
      border-left: 1px solid var(--line);
      background: #ffffff;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      padding: 14px 10px 16px 12px;
    }
    .toc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      position: sticky;
      top: 0;
      background: #ffffff;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--line);
      z-index: 5;
    }
    .toc-header h3 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--accent);
    }
    .toc details {
      margin: 3px 0;
    }
    .toc summary {
      list-style: none;
      cursor: pointer;
      color: #334155;
      padding: 2px 4px;
      border-radius: 6px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .toc summary::-webkit-details-marker { display: none; }
    .toc summary:hover { background: #f1f5f9; }
    .toc a {
      color: #475569;
      text-decoration: none;
      display: block;
      padding: 2px 4px 2px 22px;
      border-radius: 6px;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .toc a:hover { background: #f1f5f9; color: #1e293b; }
    .toc a.active { background: #dbeafe; color: #1d4ed8; }
    .toc-children { margin-left: 10px; border-left: 1px dashed #cbd5e1; padding-left: 8px; }
    .hidden { display: none !important; }
    @media (max-width: 1200px) {
      .layout { grid-template-columns: 1fr; }
      .toc { display: none; }
    }
  </style>
</head>
<body>
  <div class="layout" id="layout">
    <main class="main">
      <div class="main-inner">
        <div class="toolbar">
          <div class="title-wrap">
            <h1 id="doc-title"></h1>
            <p id="doc-source"></p>
          </div>
          <div class="toolbar-right">
            <select class="sprint-select" id="sprint-select" title="切换迭代"></select>
            <button class="btn" id="toc-toggle">隐藏目录</button>
          </div>
        </div>
        <article class="content" id="content"></article>
      </div>
    </main>
    <aside class="toc" id="toc-panel">
      <div class="toc-header">
        <h3>目录</h3>
        <button class="btn" id="toc-expand">展开全部</button>
      </div>
      <nav id="toc"></nav>
    </aside>
  </div>

  <div class="lb-overlay" id="lb-overlay">
    <div class="lb-wrap" id="lb-wrap"><img id="lb-img" /></div>
  </div>
  <div class="lb-bar" id="lb-bar">
    <button id="lb-prev">&#9664; 上一张</button>
    <span id="lb-counter">1 / 1</span>
    <button id="lb-next">下一张 &#9654;</button>
    <button id="lb-zoom-in">+</button>
    <button id="lb-zoom-out">&minus;</button>
    <button id="lb-close">ESC 关闭</button>
  </div>

  <script>
    const contentHtml = ${contentLiteral};
    const sourcePath = ${sourceLiteral};
    const titleText = ${titleLiteral};
    const assetPrefix = ${assetPrefixLiteral};

    const sprints = ${sprintsLiteral};
    const currentSprint = ${currentSprintLiteral};

    const contentEl = document.getElementById("content");
    contentEl.innerHTML = contentHtml;

    function normalizeAssetPath(src) {
      if (!src) {
        return src;
      }
      if (/^(https?:|data:|file:|#|[/])/i.test(src)) {
        return src;
      }
      if (!assetPrefix || assetPrefix === ".") {
        return src;
      }
      return assetPrefix + "/" + src;
    }

    contentEl.querySelectorAll("img").forEach((img) => {
      const raw = img.getAttribute("src");
      img.setAttribute("src", normalizeAssetPath(raw));
    });

    const headings = Array.from(contentEl.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    const usedIds = new Map();

    headings.forEach((h) => {
      const raw = h.textContent.trim();
      let id = ${slugify.toString()}(raw) || "section";
      const count = usedIds.get(id) || 0;
      if (count > 0) {
        id = id + "-" + count;
      }
      usedIds.set(id, count + 1);
      h.id = id;
    });

    function buildTocTree(items) {
      const root = [];
      const stack = [{ level: 0, children: root }];
      items.forEach((h) => {
        const node = {
          id: h.id,
          text: h.textContent.trim(),
          level: Number(h.tagName[1]),
          children: []
        };
        while (stack.length > 1 && node.level <= stack[stack.length - 1].level) {
          stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push(node);
      });
      return root;
    }

    function renderNode(node) {
      const hasChildren = node.children.length > 0;
      if (!hasChildren) {
        return '<a href="#' + node.id + '" data-id="' + node.id + '">' + node.text + '</a>';
      }
      const childHtml = node.children.map(renderNode).join("");
      return (
        '<details open>' +
        '<summary><a href="#' + node.id + '" data-id="' + node.id + '" style="padding:0;margin:0;">' + node.text + '</a></summary>' +
        '<div class="toc-children">' + childHtml + '</div>' +
        '</details>'
      );
    }

    const tocTree = buildTocTree(headings);
    const tocEl = document.getElementById("toc");
    tocEl.innerHTML = tocTree.map(renderNode).join("");

    const docTitleEl = document.getElementById("doc-title");
    const docSourceEl = document.getElementById("doc-source");
    docTitleEl.textContent = titleText;
    docSourceEl.textContent = "来源：" + sourcePath;

    const tocToggle = document.getElementById("toc-toggle");
    const layout = document.getElementById("layout");
    const tocPanel = document.getElementById("toc-panel");
    let tocHidden = false;
    tocToggle.addEventListener("click", () => {
      tocHidden = !tocHidden;
      layout.classList.toggle("toc-hidden", tocHidden);
      tocPanel.classList.toggle("hidden", tocHidden);
      tocToggle.textContent = tocHidden ? "显示目录" : "隐藏目录";
    });

    let allExpanded = true;
    const tocExpandBtn = document.getElementById("toc-expand");
    tocExpandBtn.addEventListener("click", () => {
      allExpanded = !allExpanded;
      document.querySelectorAll("#toc details").forEach((d) => {
        d.open = allExpanded;
      });
      tocExpandBtn.textContent = allExpanded ? "收起全部" : "展开全部";
    });
    tocExpandBtn.textContent = "收起全部";

    const tocLinks = Array.from(document.querySelectorAll("#toc a[data-id]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocLinks.forEach((a) => {
              a.classList.toggle("active", a.dataset.id === id);
            });
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));

    /* ---- Sprint switcher ---- */
    const sprintSelect = document.getElementById("sprint-select");
    if (sprints.length > 0) {
      sprints.forEach(function(s) {
        const opt = document.createElement("option");
        opt.value = s.file;
        opt.textContent = s.label;
        if (s.label === currentSprint) { opt.selected = true; }
        sprintSelect.appendChild(opt);
      });
      sprintSelect.addEventListener("change", function() {
        if (sprintSelect.value) { window.location.href = sprintSelect.value; }
      });
    } else {
      sprintSelect.style.display = "none";
    }

    /* ---- Lightbox ---- */
    const lbOverlay = document.getElementById("lb-overlay");
    const lbBar = document.getElementById("lb-bar");
    const lbImg = document.getElementById("lb-img");
    const lbWrap = document.getElementById("lb-wrap");
    const lbCounter = document.getElementById("lb-counter");
    const allImages = Array.from(contentEl.querySelectorAll("img"));
    let lbIdx = 0, lbScale = 1, lbTx = 0, lbTy = 0;
    let dragging = false, dragStartX = 0, dragStartY = 0, dragTx0 = 0, dragTy0 = 0;

    function lbApply() {
      lbImg.style.transform = "translate(" + lbTx + "px," + lbTy + "px) scale(" + lbScale + ")";
    }
    function lbShow(idx) {
      lbIdx = ((idx % allImages.length) + allImages.length) % allImages.length;
      lbImg.src = allImages[lbIdx].src;
      lbScale = 1; lbTx = 0; lbTy = 0; lbApply();
      lbCounter.textContent = (lbIdx + 1) + " / " + allImages.length;
      lbOverlay.classList.add("open");
      lbBar.classList.add("open");
    }
    function lbClose() {
      lbOverlay.classList.remove("open");
      lbBar.classList.remove("open");
    }

    allImages.forEach(function(img, i) {
      img.addEventListener("click", function(e) { e.stopPropagation(); lbShow(i); });
    });

    lbOverlay.addEventListener("click", function(e) {
      if (e.target === lbOverlay) { lbClose(); }
    });

    document.getElementById("lb-prev").addEventListener("click", function(e) { e.stopPropagation(); lbShow(lbIdx - 1); });
    document.getElementById("lb-next").addEventListener("click", function(e) { e.stopPropagation(); lbShow(lbIdx + 1); });
    document.getElementById("lb-zoom-in").addEventListener("click", function(e) { e.stopPropagation(); lbScale = Math.min(lbScale * 1.3, 8); lbApply(); });
    document.getElementById("lb-zoom-out").addEventListener("click", function(e) { e.stopPropagation(); lbScale = Math.max(lbScale / 1.3, 0.2); lbApply(); });
    document.getElementById("lb-close").addEventListener("click", function(e) { e.stopPropagation(); lbClose(); });

    document.addEventListener("keydown", function(e) {
      if (!lbOverlay.classList.contains("open")) { return; }
      if (e.key === "Escape") { lbClose(); }
      else if (e.key === "ArrowRight" || e.key === " ") { lbShow(lbIdx + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { lbShow(lbIdx - 1); }
      else if (e.key === "+" || e.key === "=") { lbScale = Math.min(lbScale * 1.3, 8); lbApply(); }
      else if (e.key === "-") { lbScale = Math.max(lbScale / 1.3, 0.2); lbApply(); }
    });

    lbOverlay.addEventListener("wheel", function(e) {
      e.preventDefault();
      lbScale = e.deltaY < 0 ? Math.min(lbScale * 1.15, 8) : Math.max(lbScale / 1.15, 0.2);
      lbApply();
    }, { passive: false });

    lbWrap.addEventListener("mousedown", function(e) {
      e.preventDefault(); e.stopPropagation();
      dragging = true; lbWrap.classList.add("dragging");
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragTx0 = lbTx; dragTy0 = lbTy;
    });
    document.addEventListener("mousemove", function(e) {
      if (!dragging) { return; }
      lbTx = dragTx0 + (e.clientX - dragStartX);
      lbTy = dragTy0 + (e.clientY - dragStartY);
      lbApply();
    });
    document.addEventListener("mouseup", function() {
      dragging = false; lbWrap.classList.remove("dragging");
    });
  </script>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
  const shouldOpen = flags.has("--open");

  const inputArg = args[0];
  const outputArg = args[1];

  if (!inputArg) {
    console.error("Usage: node build-prd-preview.mjs <requirement.md path> [output.html]");
    console.error("Example: node build-prd-preview.mjs projects/my-project/sprints/v1.0/requirement.md");
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const sourcePath = path.relative(process.cwd(), inputPath).replace(/\\/g, "/");

  const sourceParts = sourcePath.split("/");
  const projectsIdx = sourceParts.indexOf("projects");
  let title = path.basename(inputPath, path.extname(inputPath));
  let outputPath;
  let sprintName = "";
  let projectName = "";

  if (projectsIdx >= 0 && sourceParts[projectsIdx + 1]) {
    projectName = sourceParts[projectsIdx + 1];
    const sprintIdx = sourceParts.indexOf("sprints");
    const docsIdx = sourceParts.indexOf("docs");

    if (sprintIdx >= 0 && sourceParts[sprintIdx + 1]) {
      sprintName = sourceParts[sprintIdx + 1];
    } else if (docsIdx >= 0) {
      const basename = path.basename(inputPath, path.extname(inputPath));
      const versionMatch = basename.match(/^TC\s*([\d.]+)/i);
      if (versionMatch) {
        sprintName = `TC-${versionMatch[1]}`;
      }
    }

    title = sprintName ? `${projectName} · ${sprintName}` : projectName;

    if (!outputArg) {
      if (sprintName) {
        let tail = "";
        const basename = path.basename(inputPath, path.extname(inputPath));
        if (docsIdx >= 0) {
          tail = basename
            .replace(/^TC\s*[\d.]+\s*/i, "")
            .trim()
            .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
        } else if (sprintIdx >= 0 && basename.toLowerCase() !== "requirement") {
          tail = basename
            .replace(/^TC\s*[\d.]+\s*/i, "")
            .trim()
            .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
        }
        const previewName = tail
          ? `prd-preview-${sprintName.toLowerCase()}-${tail}.html`
          : `prd-preview-${sprintName.toLowerCase()}.html`;
        outputPath = path.resolve(
          "projects",
          projectName,
          "sprints",
          sprintName,
          previewName,
        );
      } else {
        outputPath = path.resolve(
          "projects",
          projectName,
          "previews",
          "prd-preview.html",
        );
      }
    }
  }

  if (outputArg) {
    outputPath = path.resolve(outputArg);
  }

  if (!outputPath) {
    outputPath = path.resolve("output", "prd-preview.html");
  }

  const outputDir = path.dirname(outputPath);
  const assetPrefix = path.relative(outputDir, process.cwd()).replace(/\\/g, "/") || ".";

  let sprints = [];
  if (projectsIdx >= 0 && projectName) {
    const sprintsDir = path.resolve("projects", projectName, "sprints");
    try {
      const entries = await fs.readdir(sprintsDir, { withFileTypes: true });
      const sprintDirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      sprints = sprintDirs.map((name) => ({
        label: name,
        file: `../${name}/prd-preview-${name.toLowerCase()}.html`,
      }));
    } catch (_) {
      sprints = [];
    }
  }

  const markdown = await fs.readFile(inputPath, "utf-8");
  let contentHtml = marked.parse(markdown, {
    gfm: true,
    breaks: false,
  });

  const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };

  contentHtml = contentHtml.replace(
    /(<img\s[^>]*?\bsrc=")([^"]+)("[^>]*?>)/gi,
    (_match, before, src, after) => {
      if (/^(https?:|data:|file:)/i.test(src)) {
        return before + src + after;
      }
      let srcPath = src;
      try {
        srcPath = decodeURIComponent(src);
      } catch (_) {
        // keep original if not valid URI
      }
      let absPath = path.resolve(path.dirname(inputPath), srcPath);
      if (!fsSync.existsSync(absPath)) {
        absPath = path.resolve(process.cwd(), srcPath);
      }
      if (!fsSync.existsSync(absPath)) {
        return before + src + after;
      }
      const ext = path.extname(absPath).toLowerCase();
      const mime = MIME[ext];
      if (!mime) {
        return before + src + after;
      }
      const b64 = fsSync.readFileSync(absPath).toString("base64");
      return before + `data:${mime};base64,${b64}` + after;
    },
  );

  const html = buildHtml(contentHtml, { title, sourcePath, assetPrefix, sprints, currentSprint: sprintName });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf-8");

  const relOutput = path.relative(process.cwd(), outputPath).replace(/\\\\/g, "/");
  console.log("PRD preview generated:");
  console.log(`- source: ${sourcePath}`);
  if (!outputArg && projectsIdx >= 0) {
    console.log("- mode: project preview (default)");
  }
  console.log(`- output: ${relOutput}`);

  if (shouldOpen) {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    execSync(`${opener} "${outputPath}"`);
    console.log("- opened in browser");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
