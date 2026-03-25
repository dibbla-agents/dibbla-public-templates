#!/usr/bin/env npx tsx

/**
 * Static PDF Generator for Presentations
 *
 * Generates a PDF by capturing each slide via Playwright.
 * The output filename is derived from package.json "name" field.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. In another terminal: npm run generate-pdf
 *
 * Or use the combined command:
 *   npm run generate-pdf:full (starts server, generates PDF, stops server)
 */

import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const pdfFilename = 'presentation.pdf';

const CONFIG = {
  baseUrl: process.env.PDF_BASE_URL || 'http://localhost:5173',
  outputPath: `./public/${pdfFilename}`,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
};

async function mergePdfBuffers(pdfBuffers: Buffer[]): Promise<Buffer> {
  if (pdfBuffers.length === 0) {
    throw new Error('No PDF pages to merge');
  }

  if (pdfBuffers.length === 1) {
    return pdfBuffers[0];
  }

  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfBuffers) {
    const pdf = await PDFDocument.load(pdfBuffer);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  return Buffer.from(mergedPdfBytes);
}

async function generatePDF() {
  console.log('Starting PDF generation...');
  console.log(`  Base URL: ${CONFIG.baseUrl}`);
  console.log(`  Output: ${CONFIG.outputPath}`);
  console.log('');

  let browser = null;

  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: CONFIG.viewport,
      deviceScaleFactor: CONFIG.deviceScaleFactor,
    });

    const page = await context.newPage();

    const exportUrl = `${CONFIG.baseUrl}?export=true`;
    console.log(`Navigating to ${exportUrl}`);

    await page.goto(exportUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const totalSlides = await page.evaluate(() => {
      const nav = document.querySelector('[data-total-slides]');
      return nav ? parseInt(nav.getAttribute('data-total-slides') || '0', 10) : 0;
    });

    if (totalSlides === 0) {
      throw new Error('Could not detect slide count. Ensure data-total-slides attribute exists.');
    }

    console.log(`Detected ${totalSlides} slides`);

    const pdfPages: Buffer[] = [];

    for (let i = 0; i < totalSlides; i++) {
      const progress = `[${String(i + 1).padStart(2, '0')}/${totalSlides}]`;
      process.stdout.write(`\rCapturing slide ${progress}`);

      await page.waitForTimeout(500);

      const pdfBuffer = await page.pdf({
        width: '1920px',
        height: '1080px',
        printBackground: true,
        scale: 1,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      pdfPages.push(pdfBuffer);

      if (i < totalSlides - 1) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
      }
    }

    console.log('\n');
    await browser.close();
    browser = null;

    console.log('Merging PDF pages...');
    const mergedPdf = await mergePdfBuffers(pdfPages);

    const outputDir = path.dirname(CONFIG.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.outputPath, mergedPdf);

    const fileSizeKB = Math.round(mergedPdf.length / 1024);
    const fileSizeMB = (mergedPdf.length / (1024 * 1024)).toFixed(2);

    console.log('');
    console.log('PDF generated successfully!');
    console.log(`  File: ${CONFIG.outputPath}`);
    console.log(`  Size: ${fileSizeMB} MB (${fileSizeKB} KB)`);
    console.log(`  Pages: ${totalSlides}`);
    console.log('');
    console.log(`The PDF will be served at /${pdfFilename}`);

  } catch (error) {
    console.error('\nPDF generation failed:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

generatePDF();
