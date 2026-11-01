/**
 * Automated Verification Script for Phase 17:
 * Branding Refinement & Mobile Hamburger Menu Decluttering
 * 
 * Verifications:
 * 1. src/components/layout/Navbar.tsx:
 *    - "MedEvent" badge completely removed from brand area.
 *    - "MIT License" and "Privacy Policy" buttons completely removed from mobile hamburger drawer.
 * 2. src/pages/Login.tsx:
 *    - <h1> is "KRITI Tracker" (no "MedEvent").
 *    - <p> subtitle is "Kakatiya Research Initiative for Transformative Innovation".
 * 3. index.html:
 *    - <title> is "KRITI Tracker | Kakatiya Research Initiative for Transformative Innovation".
 * 4. src/hooks/useConfig.tsx:
 *    - Default companyName is "Kakatiya Research Initiative for Transformative Innovation".
 * 5. src/services/mockApi.ts:
 *    - Default companyName is "Kakatiya Research Initiative for Transformative Innovation".
 */

import fs from 'fs';
import path from 'path';

function runPhase17Tests() {
  console.log('🧪 Starting Phase 17 Verification Suite...\n');
  let passCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${testName}\n   Detail: ${detail}`);
    }
  }

  const workspaceRoot = process.cwd();

  // Test 1: Navbar Brand Monogram & MedEvent Removal
  const navbarPath = path.join(workspaceRoot, 'src', 'components', 'layout', 'Navbar.tsx');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');

  assert(
    !navbarContent.includes('>MedEvent<') && !navbarContent.includes('MedEvent</span>'),
    'Navbar: MedEvent Badge Completely Removed from Brand Title',
    'Navbar brand logo should only display "KRITI" without the MedEvent badge.'
  );

  // Test 2: Hamburger Menu Decluttering
  // The mobile menu drawer (inside {mobileMenuOpen && ( ... )}) must NOT have MIT License or Privacy Policy
  const mobileDrawerMatch = navbarContent.match(/\{mobileMenuOpen && \(([\s\S]*?)\)\}/);
  const mobileDrawerContent = mobileDrawerMatch ? mobileDrawerMatch[1] : '';

  assert(
    !mobileDrawerContent.includes('MIT License') && !mobileDrawerContent.includes('Privacy Policy'),
    'Navbar: MIT License & Privacy Policy Removed from Mobile Hamburger Drawer',
    'The mobile drawer must not contain legal modal buttons, keeping it strictly focused on navigation and sign out.'
  );

  // Test 3: Login.tsx Title & Subtitle
  const loginPath = path.join(workspaceRoot, 'src', 'pages', 'Login.tsx');
  const loginContent = fs.readFileSync(loginPath, 'utf8');

  assert(
    loginContent.includes('KRITI Tracker') && !loginContent.includes('KRITI MedEvent Tracker'),
    'Login.tsx: Title Updated to "KRITI Tracker"',
    'Login page title must be "KRITI Tracker" without MedEvent.'
  );

  assert(
    loginContent.includes('Kakatiya Research Initiative for Transformative Innovation'),
    'Login.tsx: Subtitle Updated to "Kakatiya Research Initiative for Transformative Innovation"',
    'Login subtitle must read "Kakatiya Research Initiative for Transformative Innovation".'
  );

  // Test 4: index.html Document Title
  const indexPath = path.join(workspaceRoot, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  assert(
    indexContent.includes('<title>KRITI Tracker | Kakatiya Research Initiative for Transformative Innovation</title>'),
    'index.html: Title Updated to KRITI Tracker | Kakatiya Research Initiative for Transformative Innovation',
    'Document title in index.html must reflect the official organization title.'
  );

  // Test 5: Default Config in useConfig and mockApi
  const useConfigPath = path.join(workspaceRoot, 'src', 'hooks', 'useConfig.tsx');
  const useConfigContent = fs.readFileSync(useConfigPath, 'utf8');
  assert(
    useConfigContent.includes("'Kakatiya Research Initiative for Transformative Innovation'"),
    'useConfig.tsx: Default companyName Updated',
    'Default appSettings companyName must be "Kakatiya Research Initiative for Transformative Innovation".'
  );

  const mockApiPath = path.join(workspaceRoot, 'src', 'services', 'mockApi.ts');
  const mockApiContent = fs.readFileSync(mockApiPath, 'utf8');
  assert(
    mockApiContent.includes("'Kakatiya Research Initiative for Transformative Innovation'"),
    'mockApi.ts: Default companyName Updated',
    'Default mockApi companyName must be "Kakatiya Research Initiative for Transformative Innovation".'
  );

  console.log(`\n========================================`);
  console.log(`Phase 17 Verification Results: ${passCount}/${totalTests} Passed`);
  console.log(`========================================\n`);

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runPhase17Tests();
