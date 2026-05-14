/**
 * pdf-renderer.ts
 *
 * Production PDF rendering pipeline using Puppeteer (headless Chromium).
 *
 * Design decisions:
 *  - Puppeteer is loaded lazily (dynamic import) to avoid startup cost
 *    and allow the server to boot even if Puppeteer is not installed.
 *  - Falls back gracefully to HTML-only output when Puppeteer is unavailable.
 *  - Browser instance is reused across renders within the same process lifecycle.
 *  - Isolated from route handlers — called only by the report generation service.
 *
 * Production notes:
 *  - Requires puppeteer or puppeteer-core in node_modules.
 *  - In Docker/CI environments, use --no-sandbox flag (included).
 *  - For ARM/Linux environments, puppeteer-core with chromium-bidi may be needed.
 *
 * Limitations:
 *  - Map snapshots (live tile layers) cannot be rendered without a real browser
 *    with network access to the tile CDN. Thumbnail file:// paths work fine.
 *  - Large reports (>50 pages) may require increased timeout/maxBuffer settings.
 */

import path from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import crypto from "crypto";

const LOG = "[Reports:PDFRenderer]";

// ─── Browser singleton ────────────────────────────────────────────────────────

let browserInstance: unknown = null;
let puppeteerAvailable: boolean | null = null;

async function checkPuppeteerAvailability(): Promise<boolean> {
  if (puppeteerAvailable !== null) return puppeteerAvailable;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await (Function('return import')()("puppeteer") as Promise<any>);
    puppeteerAvailable = true;
  } catch {
    try {
      await (Function('return import')()("puppeteer-core") as Promise<any>);
      puppeteerAvailable = true;
    } catch {
      puppeteerAvailable = false;
      console.info(`${LOG} Puppeteer not installed. PDF rendering will produce HTML-only output.`);
    }
  }
  return puppeteerAvailable;
}

async function getBrowser(): Promise<unknown> {
  if (browserInstance) return browserInstance;
  const hasPuppeteer = await checkPuppeteerAvailability();
  if (!hasPuppeteer) return null;

  try {
    // Try puppeteer first, fall back to puppeteer-core
    let puppeteer: { launch: (opts: unknown) => Promise<unknown> };
    try {
      puppeteer = (await (Function('return import')()("puppeteer") as Promise<any>)) as typeof puppeteer;
    } catch {
      puppeteer = (await (Function('return import')()("puppeteer-core") as Promise<any>)) as typeof puppeteer;
    }

    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });
    console.log(`${LOG} Puppeteer browser launched`);
  } catch (err: unknown) {
    console.warn(`${LOG} Failed to launch Puppeteer browser:`, err instanceof Error ? err.message : err);
    browserInstance = null;
    puppeteerAvailable = false;
  }

  return browserInstance;
}

// ─── Render pipeline ──────────────────────────────────────────────────────────

export interface PdfRenderOptions {
  format?: "A4" | "Letter";
  /** CSS media type to emulate: print or screen */
  media?: "print" | "screen";
  /** Milliseconds to wait after content is set before generating PDF */
  waitMs?: number;
  /** Margin overrides */
  margins?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface PdfRenderResult {
  pdfPath: string;
  htmlPath: string;
  /** SHA-256 content hash of the PDF for integrity verification */
  contentHash: string;
  /** True if Puppeteer was used; false means HTML-only fallback */
  pdfRendered: boolean;
  fileSizeBytes: number;
}

/**
 * Render an HTML string to PDF via Puppeteer.
 * Falls back to HTML-only output when Puppeteer is unavailable.
 *
 * @param html      - Full HTML document string
 * @param outputDir - Directory to write output files
 * @param fileId    - Base filename (without extension)
 * @param opts      - PDF rendering options
 */
export async function renderHtmlToPdf(
  html: string,
  outputDir: string,
  fileId: string,
  opts: PdfRenderOptions = {}
): Promise<PdfRenderResult> {
  await mkdir(outputDir, { recursive: true });

  const htmlPath = path.join(outputDir, `${fileId}.html`);
  const pdfPath  = path.join(outputDir, `${fileId}.pdf`);

  // Always write HTML (used for preview and fallback)
  await writeFile(htmlPath, html, "utf-8");

  const browser = await getBrowser();

  if (!browser) {
    // Puppeteer unavailable: write a placeholder PDF file
    const placeholder = `NEVARA PDF Report — Puppeteer not available.\nHTML version: ${htmlPath}\nGenerated: ${new Date().toISOString()}`;
    await writeFile(pdfPath, placeholder, "utf-8");
    const hash = crypto.createHash("sha256").update(html, "utf-8").digest("hex");
    const stat = Buffer.byteLength(placeholder, "utf-8");
    console.info(`${LOG} PDF placeholder written to ${pdfPath} (Puppeteer unavailable)`);
    return { pdfPath, htmlPath, contentHash: hash, pdfRendered: false, fileSizeBytes: stat };
  }

  try {
    const br = browser as {
      newPage: () => Promise<{
        setContent: (html: string, opts: Record<string, unknown>) => Promise<void>;
        emulateMediaType: (type: string) => Promise<void>;
        pdf: (opts: Record<string, unknown>) => Promise<Buffer>;
        close: () => Promise<void>;
      }>;
    };

    const page = await br.newPage();

    // Set content and wait for fonts/images to settle
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    await page.emulateMediaType(opts.media ?? "print");

    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: opts.format ?? "A4",
      margin: {
        top:    opts.margins?.top    ?? "18mm",
        bottom: opts.margins?.bottom ?? "20mm",
        left:   opts.margins?.left   ?? "15mm",
        right:  opts.margins?.right  ?? "15mm",
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:8px;width:100%;text-align:center;color:#888;padding:0 15mm;">
          NEVARA Environmental Monitoring Report
        </div>`,
      footerTemplate: `
        <div style="font-size:8px;width:100%;text-align:center;color:#888;padding:0 15mm;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
    });

    await page.close();

    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
    const fileSizeBytes = pdfBuffer.byteLength;

    console.log(`${LOG} PDF rendered → ${pdfPath} (${Math.round(fileSizeBytes / 1024)}KB, sha256:${hash.slice(0, 12)}…)`);
    return { pdfPath, htmlPath, contentHash: hash, pdfRendered: true, fileSizeBytes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`${LOG} PDF render failed, falling back to HTML: ${message}`);

    // Write an error-annotated placeholder
    const placeholder = `NEVARA PDF Report — Render failed: ${message}\nHTML version: ${htmlPath}`;
    await writeFile(pdfPath, placeholder, "utf-8");
    const hash = crypto.createHash("sha256").update(html, "utf-8").digest("hex");
    return { pdfPath, htmlPath, contentHash: hash, pdfRendered: false, fileSizeBytes: html.length };
  }
}

/**
 * Compute SHA-256 hash of an existing PDF file for integrity verification.
 */
export async function computeFileHash(filePath: string): Promise<string> {
  if (!existsSync(filePath)) return "";
  const buffer = await readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Close the Puppeteer browser instance gracefully on process shutdown.
 */
export async function closePdfRenderer(): Promise<void> {
  if (!browserInstance) return;
  try {
    const br = browserInstance as { close: () => Promise<void> };
    await br.close();
    browserInstance = null;
    console.log(`${LOG} Puppeteer browser closed`);
  } catch (err: unknown) {
    console.warn(`${LOG} Error closing browser:`, err instanceof Error ? err.message : err);
  }
}
