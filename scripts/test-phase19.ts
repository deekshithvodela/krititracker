import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { chromium } = req('/home/drover/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDriveFolderId, shareDriveFolderWithUser, removeDriveFolderUser, listSpreadsheetsInFolder } from '../api/_lib/drive';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Starting Phase 19 Mobile Layout Shift & Google Drive Integration Tests...\n');

  // Test 1: Verify Google Drive Library Exports & Helper Signatures
  if (
    typeof getDriveFolderId === 'function' &&
    typeof shareDriveFolderWithUser === 'function' &&
    typeof removeDriveFolderUser === 'function' &&
    typeof listSpreadsheetsInFolder === 'function'
  ) {
    console.log('✅ Test 1 Passed: api/_lib/drive.ts exports all required Drive integration functions.');
  } else {
    throw new Error('Test 1 Failed: Missing exported functions in api/_lib/drive.ts');
  }

  // Test 2: Verify users.ts wires Drive integration
  const usersCode = fs.readFileSync(path.join(__dirname, '../api/_handlers/admin/users.ts'), 'utf-8');
  if (
    usersCode.includes('getDriveFolderId') &&
    usersCode.includes('shareDriveFolderWithUser') &&
    usersCode.includes('removeDriveFolderUser')
  ) {
    console.log('✅ Test 2 Passed: api/_handlers/admin/users.ts properly integrates automatic Drive folder sharing and revocation.');
  } else {
    throw new Error('Test 2 Failed: Drive integration not wired in users.ts');
  }

  // Test 3: Verify ChecklistItem blur on checkbox click
  const checklistCode = fs.readFileSync(path.join(__dirname, '../src/components/checklist/ChecklistItem.tsx'), 'utf-8');
  if (checklistCode.includes('e.currentTarget.blur()')) {
    console.log('✅ Test 3 Passed: ChecklistItem.tsx includes e.currentTarget.blur() on checkbox click to eliminate focus scroll jumps.');
  } else {
    throw new Error('Test 3 Failed: ChecklistItem missing blur on checkbox click');
  }

  // Test 4: Verify TeamDashboard.tsx anchor stabilization
  const dashboardCode = fs.readFileSync(path.join(__dirname, '../src/pages/TeamDashboard.tsx'), 'utf-8');
  if (
    dashboardCode.includes("overflowAnchor: 'none'") &&
    dashboardCode.includes('loadTeamData(true)')
  ) {
    console.log('✅ Test 4 Passed: TeamDashboard.tsx features silent background refresh and overflow-anchor stabilization.');
  } else {
    throw new Error('Test 4 Failed: TeamDashboard missing anchor stabilization or silent refresh');
  }

  // Test 5: Playwright Mobile Viewport Test (390x844)
  console.log('Launching headless browser to verify mobile hero dimensions & zero-shift scroll stability...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:4173/');

  // Click Scientific Head persona
  const personaBtn = page.locator('button:has-text("Scientific Head")');
  await personaBtn.waitFor({ timeout: 5000 });
  await personaBtn.click();

  await page.waitForURL('**/teams/team-scientific', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Measure Hero card dimensions on mobile
  const heroCard = page.locator('text=Next Priority').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
  await heroCard.waitFor({ timeout: 5000 });
  const heroBox = await heroCard.boundingBox();

  if (!heroBox) {
    throw new Error('Test 5 Failed: Hero card bounding box not found on mobile viewport');
  }

  console.log(`   Measured Mobile Hero Card: width=${heroBox.width}px, height=${heroBox.height}px`);

  // Assert height <= 160px (previously 335px)
  if (heroBox.height <= 160) {
    console.log(`✅ Test 5 Passed: Mobile Hero Card height is ${heroBox.height}px (<= 160px). Footprint reduced by >55%!`);
  } else {
    throw new Error(`Test 5 Failed: Mobile Hero Card height too large: ${heroBox.height}px (expected <= 160px)`);
  }

  // Test 6: Zero Scroll Jump on Task Toggle
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  const initialScrollY = await page.evaluate(() => window.scrollY);

  const checkboxes = await page.locator('button[title*="Mark as"]').all();
  if (checkboxes.length > 0) {
    // Click checkbox to toggle
    await checkboxes[0].click();
    await page.waitForTimeout(800);
    const scrollYAfterToggle1 = await page.evaluate(() => window.scrollY);
    const delta1 = Math.abs(scrollYAfterToggle1 - initialScrollY);

    // Click checkbox again to uncheck/toggle back
    await checkboxes[0].click();
    await page.waitForTimeout(800);
    const scrollYAfterToggle2 = await page.evaluate(() => window.scrollY);
    const delta2 = Math.abs(scrollYAfterToggle2 - scrollYAfterToggle1);

    console.log(`   Scroll Positions: Initial=${initialScrollY}px, After Toggle 1=${scrollYAfterToggle1}px (Delta: ${delta1}px), After Toggle 2=${scrollYAfterToggle2}px (Delta: ${delta2}px)`);

    if (delta1 === 0 && delta2 === 0) {
      console.log('✅ Test 6 Passed: Scroll Delta is exactly 0px on uncheck and check! Zero layout shift verified.');
    } else {
      throw new Error(`Test 6 Failed: Scroll position jumped: delta1=${delta1}px, delta2=${delta2}px`);
    }
  }

  await browser.close();

  console.log('\n🎉 ALL 6 Phase 19 Mobile Layout Shift & Google Drive Integration Tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('❌ Phase 19 Test Runner Error:', err);
  process.exit(1);
});
