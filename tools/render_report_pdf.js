/**
 * Renders tools/coachmind_report_ar.html to CoachMind_Product_Review_AR.pdf
 * via the locally-installed puppeteer + Chromium.
 *
 * Run from project root:
 *   node tools/render_report_pdf.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const INPUT  = path.join(__dirname, 'coachmind_report_ar.html');
const OUTPUT = path.join(__dirname, '..', 'CoachMind_Product_Review_AR.pdf');

if (!fs.existsSync(INPUT)) {
  console.error('HTML source not found:', INPUT);
  process.exit(1);
}

(async () => {
  console.log('Launching headless Chrome…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'],
  });

  try {
    const page = await browser.newPage();
    // Match the @page A4 + a wide viewport so layout settles before paginating.
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    const fileUrl = 'file://' + INPUT.replace(/\\/g, '/');
    console.log('Loading:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60_000 });

    // Wait for Google Fonts (Cairo / IBM Plex Sans Arabic) to actually settle.
    // Puppeteer's networkidle0 covers stylesheets but the @font-face fetches
    // resolve async; document.fonts.ready waits for every face to be loaded.
    await page.evaluate(() => document.fonts && document.fonts.ready);

    console.log('Rendering PDF…');
    await page.pdf({
      path: OUTPUT,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },  // @page in CSS owns the margins
    });

    const stat = fs.statSync(OUTPUT);
    console.log('PDF written:', OUTPUT);
    console.log('Size:', (stat.size / 1024).toFixed(1), 'KB');
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
