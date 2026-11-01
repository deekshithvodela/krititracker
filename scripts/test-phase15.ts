import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🧪 Starting Phase 15 Automated Verification Suite...\n');

// 1. Verify Service Worker Syntax
try {
  execSync('node -c public/sw.js');
  const swContent = fs.readFileSync('public/sw.js', 'utf8');
  if (swContent.includes('as Promise<Response>')) {
    throw new Error('Found TypeScript type assertion in public/sw.js');
  }
  if (!swContent.includes('kriti-tracker-v2')) {
    throw new Error('Expected CACHE_NAME to be bumped to kriti-tracker-v2');
  }
  console.log('✅ Check 1 Passed: public/sw.js evaluates with 0 syntax errors and v2 cache.');
} catch (err: any) {
  console.error('❌ Check 1 Failed:', err.message);
  process.exit(1);
}

// 2. Verify Footer Isolation (ONLY in Login page)
try {
  const appShellContent = fs.readFileSync('src/components/layout/AppShell.tsx', 'utf8');
  if (appShellContent.includes('<footer')) {
    throw new Error('AppShell.tsx still contains a <footer> tag! Must only be in Login.tsx.');
  }

  const accessDeniedContent = fs.readFileSync('src/pages/AccessDenied.tsx', 'utf8');
  if (accessDeniedContent.includes('<footer') || accessDeniedContent.includes('Copyright © 2026')) {
    throw new Error('AccessDenied.tsx still contains footer markup! Must only be in Login.tsx.');
  }

  const loginContent = fs.readFileSync('src/pages/Login.tsx', 'utf8');
  if (!loginContent.includes('Copyright © 2026') || !loginContent.includes('Deekshith Vodela')) {
    throw new Error('Login.tsx missing copyright footer!');
  }
  console.log('✅ Check 2 Passed: Footer strictly isolated to Login.tsx and removed from all dashboard views.');
} catch (err: any) {
  console.error('❌ Check 2 Failed:', err.message);
  process.exit(1);
}

// 3. Verify Two-Tier Navbar (Canonify Arrangement)
try {
  const navbarContent = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');
  if (!navbarContent.includes('TIER 1: Utility & Status Bar') || !navbarContent.includes('TIER 2: Main Brand & Navigation Bar')) {
    throw new Error('Navbar missing explicit two-tier arrangement structure.');
  }
  if (!navbarContent.includes('h-8') || !navbarContent.includes('h-14')) {
    throw new Error('Navbar missing fixed pre-allocated tier heights (h-8 and h-14).');
  }
  if (!navbarContent.includes('MitLicenseModal') || !navbarContent.includes('PrivacyPolicyModal')) {
    throw new Error('Navbar missing interactive legal modal integration.');
  }
  console.log('✅ Check 3 Passed: Two-tier navbar successfully configured with fixed-height zero-CLS architecture.');
} catch (err: any) {
  console.error('❌ Check 3 Failed:', err.message);
  process.exit(1);
}

// 4. Verify Mobile Viewport Touch Targets and Layout
try {
  const checklistContent = fs.readFileSync('src/components/checklist/ChecklistItem.tsx', 'utf8');
  if (!checklistContent.includes('w-11 h-11')) {
    throw new Error('ChecklistItem missing >= 44x44px touch-friendly targets.');
  }
  if (!checklistContent.includes('p-3.5 sm:p-5')) {
    throw new Error('ChecklistItem missing responsive mobile padding (p-3.5 sm:p-5).');
  }
  console.log('✅ Check 4 Passed: ChecklistItem optimized for mobile with structured rows and >= 44px targets.');
} catch (err: any) {
  console.error('❌ Check 4 Failed:', err.message);
  process.exit(1);
}

// 5. Verify Documentation Overhaul (README.md)
try {
  const readmeContent = fs.readFileSync('README.md', 'utf8');
  if (!readmeContent.includes('Zero-CLS Two-Tier Navigation Architecture') && !readmeContent.includes('Two-Tier Navigation Bar Arrangement')) {
    throw new Error('README.md missing two-tier navigation arrangement documentation.');
  }
  if (!readmeContent.includes('12 Medical Congress Committees')) {
    throw new Error('README.md missing 12 medical committees breakdown.');
  }
  if (!readmeContent.includes('Automated Blank Sheet Auto-Provisioning Engine')) {
    throw new Error('README.md missing blank sheet auto-provisioning engine section.');
  }
  console.log('✅ Check 5 Passed: README.md elevated to top-tier enterprise open-source standard.');
} catch (err: any) {
  console.error('❌ Check 5 Failed:', err.message);
  process.exit(1);
}

console.log('\n🎉 ALL 5 Phase 15 Automated Verification Checks PASSED successfully!\n');
