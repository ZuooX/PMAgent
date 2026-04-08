import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

// Usage: node snapshot-prototypes.mjs <html-dir> [output-dir]
// Example: node snapshot-prototypes.mjs output/my-project/v1.0
const DEFAULT_OUTPUT_SUBDIR = "screenshots";
const BROWSER_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
];

function resolveBrowserPath() {
  if (process.env.BROWSER_PATH) {
    return process.env.BROWSER_PATH;
  }

  return BROWSER_CANDIDATES.find((candidate) => {
    try {
      return fsSync.existsSync(candidate);
    } catch {
      return false;
    }
  });
}

function detectViewport(fileName) {
  const lower = fileName.toLowerCase();

  if (lower.includes("h5") || lower.includes("mobile")) {
    return { width: 390, height: 844, deviceScaleFactor: 2 };
  }

  return { width: 1440, height: 1024, deviceScaleFactor: 2 };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function captureOne(page, htmlPath, outPath, viewport) {
  await page.setViewport(viewport);
  await page.goto(pathToFileURL(htmlPath).toString(), {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  await page.screenshot({
    path: outPath,
    fullPage: true,
  });
}

async function main() {
  const inputDir = path.resolve(process.argv[2]);
  if (!process.argv[2]) {
    console.error("Usage: node snapshot-prototypes.mjs <html-dir> [output-dir]");
    console.error("Example: node snapshot-prototypes.mjs output/my-project/v1.0");
    process.exit(1);
  }

  const outputDir = path.resolve(
    process.argv[3] || path.join(inputDir, DEFAULT_OUTPUT_SUBDIR),
  );

  const browserPath = resolveBrowserPath();
  if (!browserPath) {
    throw new Error(
      "No supported browser found. Set BROWSER_PATH to a Chromium executable.",
    );
  }

  await ensureDir(outputDir);

  const files = await fs.readdir(inputDir);
  const htmlFiles = files
    .filter((file) => file.toLowerCase().endsWith(".html"))
    .sort((a, b) => a.localeCompare(b));

  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in: ${inputDir}`);
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  console.log(`Input dir:  ${inputDir}`);
  console.log(`Output dir: ${outputDir}`);
  console.log(`Browser:    ${browserPath}`);

  for (const fileName of htmlFiles) {
    const htmlPath = path.join(inputDir, fileName);
    const screenshotName = fileName.replace(/\.html$/i, ".png");
    const outPath = path.join(outputDir, screenshotName);
    const viewport = detectViewport(fileName);

    await captureOne(page, htmlPath, outPath, viewport);
    console.log(`Captured:   ${fileName} -> ${path.relative(process.cwd(), outPath)}`);
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
