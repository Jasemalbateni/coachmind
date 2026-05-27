/**
 * Renders tools/coachmind_strategy_report_ar.html to
 * Strategy_Report_Academies_AR.pdf via locally-installed puppeteer.
 *
 * Run from project root:
 *   node tools/render_strategy_pdf.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const INPUT  = path.join(__dirname, 'coachmind_strategy_report_ar.html');
const OUTPUT = path.join(__dirname, '..', 'Strategy_Report_Academies_AR.pdf');

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
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    const fileUrl = 'file://' + INPUT.replace(/\\/g, '/');
    console.log('Loading:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 90_000 });

    // Wait for all webfonts to be ready before paginating.
    await page.evaluate(() => document.fonts && document.fonts.ready);

    console.log('Rendering PDF…');
    await page.pdf({
      path: OUTPUT,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
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
