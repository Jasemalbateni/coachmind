/**
 * generate-pdf.js
 * Converts Coach-Drill-Designer-Full-Documentation.html → .pdf using Puppeteer.
 * Run: node docs/generate-pdf.js
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const HTML_FILE = path.resolve(__dirname, 'Coach-Drill-Designer-Full-Documentation.html');
const PDF_FILE  = path.resolve(__dirname, 'Coach-Drill-Designer-Full-Documentation.pdf');

(async () => {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Load the local HTML file
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Set viewport wide enough for the layout to render correctly before print
  await page.setViewport({ width: 1200, height: 900 });

  // Give fonts/SVGs a moment to fully render
  await new Promise(r => setTimeout(r, 1200));

  console.log('Generating PDF...');
  await page.pdf({
    path: PDF_FILE,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '14mm', bottom: '18mm', left: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:9px;color:#999;width:100%;text-align:right;padding-right:14mm;">Coach Drill Designer — Technical Documentation</div>`,
    footerTemplate: `<div style="font-size:9px;color:#999;width:100%;display:flex;justify-content:space-between;padding:0 14mm;"><span>© CoachDesigner 2026</span><span class="pageNumber"></span></div>`,
  });

  await browser.close();

  const stats = fs.statSync(PDF_FILE);
  const kb = (stats.size / 1024).toFixed(1);
  console.log(`\nPDF generated successfully:`);
  console.log(`  Path: ${PDF_FILE}`);
  console.log(`  Size: ${kb} KB`);
})();
