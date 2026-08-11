import { chromium } from 'file:///C:/Users/kenan/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
const EXE = 'C:/Users/kenan/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => localStorage.setItem('app_current_user_id', 'u-001'));
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

await page.getByText('Settings', { exact: true }).first().click().catch(() => {});
await page.waitForTimeout(400);
await page.getByText('Default Compliance & Monitoring', { exact: true }).first().click();
await page.waitForTimeout(600);
await page.getByText('Create role', { exact: true }).first().click();
await page.waitForTimeout(500);

// Order of group headers inside the assign list
const groupHeaders = await page.evaluate(() => {
  const list = [...document.querySelectorAll('div')].find(d => d.querySelector('input[placeholder="Search people…"]'));
  if (!list) return [];
  return [...list.querySelectorAll('div')]
    .filter(e => /^(Users|Drivers|Roles)$/i.test(e.textContent.trim()) && e.children.length === 0)
    .map(e => e.textContent.trim());
});

// Is "Users" group above "Roles" group vertically?
const yOf = async (t) => {
  const el = page.getByText(t, { exact: true }).first();
  const box = await el.boundingBox().catch(() => null);
  return box ? Math.round(box.y) : null;
};
const usersY = await yOf('Users');
const rolesY = await yOf('Roles');
const firstUserVisible = await page.getByText('Kenan Gain', { exact: true }).first().isVisible().catch(() => false);

await browser.close();
console.log('RESULT', JSON.stringify({ groupHeaders, usersY, rolesY, usersAboveRoles: usersY != null && rolesY != null && usersY < rolesY, firstUserVisible, errors }, null, 2));
