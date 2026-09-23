import type { Browser } from 'puppeteer';

// Transforme une page HTML (rendue depuis views/rapport.ejs) en PDF.
// Les tests utilisent une version factice pour ne pas lancer de navigateur.
export type PdfRenderer = (html: string, options: { landscape: boolean }) => Promise<Buffer>;

// Le navigateur est lancé au premier export puis réutilisé (un lancement prend ~3 s)
let browserPromise: Promise<Browser> | undefined;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    // Puppeteer n'est chargé qu'au premier export PDF (module lourd, inutile dans les tests)
    browserPromise = import('puppeteer').then(({ default: puppeteer }) =>
      puppeteer.launch({ headless: true, args: ['--no-sandbox'] }),
    );
    browserPromise.then((browser) =>
      browser.on('disconnected', () => {
        browserPromise = undefined;
      }),
    );
  }
  return browserPromise;
}

export const puppeteerPdfRenderer: PdfRenderer = async (html, { landscape }) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape,
      printBackground: true,
      margin: { top: '15mm', bottom: '18mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:8px;color:#8a96aa;text-align:center;font-family:Arial">' +
        'Portail Web Monétique — page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
};
