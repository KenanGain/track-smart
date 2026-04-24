const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  console.log('Navigating to http://localhost:5173/account/profile...');
  await page.goto('http://localhost:5173/account/profile', { waitUntil: 'networkidle2' });

  console.log('Taking full page screenshot...');
  await page.screenshot({ path: 'Carrier_Profile_Page_Screenshot.png', fullPage: true });

  console.log('Generating PDF of the page...');
  await page.pdf({ path: 'Carrier_Profile_Page_Webpage.pdf', format: 'A4', printBackground: true });

  await browser.close();
  console.log('Done.');
})();
