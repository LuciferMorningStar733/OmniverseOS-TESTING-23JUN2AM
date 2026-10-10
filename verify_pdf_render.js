const { chromium } = require('./frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1800 } });
  
  const pdfBytes = fs.readFileSync('OMNIVERSEOS_FINAL_VISUAL_UX_AUDIT.pdf');
  const pdfBase64 = pdfBytes.toString('base64');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  </head>
  <body style="margin:0; background:#333;">
    <div id="container"></div>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const raw = atob('${pdfBase64}');
      const uint8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

      async function renderAll() {
        const loadingTask = pdfjsLib.getDocument({ data: uint8 });
        const pdf = await loadingTask.promise;
        window.totalPages = pdf.numPages;
        console.log('Total pages:', pdf.numPages);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.id = 'page-' + i;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.margin = '20px auto';
          canvas.style.display = 'block';
          canvas.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
          document.getElementById('container').appendChild(canvas);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        }
        window.renderDone = true;
      }
      renderAll();
    </script>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => window.renderDone === true, { timeout: 45000 });
  const count = await page.evaluate(() => window.totalPages);
  console.log('PDF rendered successfully! Total pages verified:', count);

  for (let i = 6; i <= count; i++) {
    const el = await page.$('#page-' + i);
    if (el) {
      await el.screenshot({ path: `pdf_rendered_page_${i}.png` });
      console.log(`Page ${i} screenshot captured: pdf_rendered_page_${i}.png`);
    }
  }

  await browser.close();
}

main().catch(console.error);
