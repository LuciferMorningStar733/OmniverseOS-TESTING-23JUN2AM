const { chromium } = require('./frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1800 } });
  
  const pdfBytes = fs.readFileSync('OMNIVERSEOS_LOGIN_REPAIR.pdf');
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
          const context = canvas.getContext('2d');
          await page.render({ canvasContext: context, viewport: viewport }).promise;
        }
        window.renderComplete = true;
      }
      renderAll();
    </script>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => window.renderComplete === true, { timeout: 30000 });
  
  const totalPages = await page.evaluate(() => window.totalPages);
  console.log('PDF rendered successfully with pages:', totalPages);

  const outDir = path.resolve(__dirname, 'screenshots_login_repair_pages');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (let i = 1; i <= totalPages; i++) {
    const canvas = page.locator('#page-' + i);
    const outPath = path.join(outDir, 'page_' + i + '.png');
    await canvas.screenshot({ path: outPath });
    console.log('Saved page screenshot:', outPath);
  }

  await browser.close();
  console.log('All PDF pages verified and rendered.');
}

main().catch(console.error);
