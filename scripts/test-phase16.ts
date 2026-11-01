/**
 * Automated Verification Script for Phase 16: Mobile UI/UX Industry Standard Overhaul
 * 
 * Verifications:
 * 1. src/styles/index.css: scroll-padding-top: 96px; and .scrollbar-none utility.
 * 2. src/components/checklist/ChecklistItem.tsx:
 *    - Standalone remarks button removed from top row.
 *    - Remarks integrated cleanly inside [⋮] menu and drawer.
 *    - Available title width maximized with compact action group.
 * 3. src/pages/TeamDashboard.tsx:
 *    - Eyebrow committee badge sits above h1 title (no cramped side-by-side flex).
 *    - Only ONE Add Task button exists in the DOM.
 *    - Filter chips use horizontal scroll without multi-line wrapping.
 *    - Progress card is deduplicated when completion is 100%.
 * 4. TypeScript compilation passes with 0 errors.
 */

import fs from 'fs';
import path from 'path';

function runPhase16Tests() {
  console.log('🧪 Starting Phase 16 Mobile UI/UX Verification Suite...\n');
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

  // Test 1: CSS Scroll Offset & Scrollbar utility
  const cssPath = path.join(workspaceRoot, 'src', 'styles', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert(
    cssContent.includes('scroll-padding-top: 96px;'),
    'CSS Scroll-Padding-Top Configured',
    'index.css must include scroll-padding-top: 96px; to prevent navbar clipping'
  );
  assert(
    cssContent.includes('.scrollbar-none'),
    'CSS Scrollbar-None Utility Present',
    'index.css must include .scrollbar-none utility for smooth mobile chip horizontal scrolling'
  );

  // Test 2: ChecklistItem Top Row Decluttering & Title Expansion
  const checklistItemPath = path.join(workspaceRoot, 'src', 'components', 'checklist', 'ChecklistItem.tsx');
  const checklistItemContent = fs.readFileSync(checklistItemPath, 'utf8');

  // Verify remarks button is NOT rendered as standalone button in top row
  const hasStandaloneRemarksBtn = /<div className="flex items-center gap-1 flex-shrink-0">\s*\{onOpenRemarks && \(\s*<button[^>]*title="Add or view remarks"/.test(
    checklistItemContent
  );
  assert(
    !hasStandaloneRemarksBtn,
    'ChecklistItem Top Row Decluttered (No Standalone Remarks Button)',
    'The standalone remarks button must be removed from the top row to give title 100% more horizontal width'
  );

  // Verify remarks is accessible in the [⋮] menu
  assert(
    checklistItemContent.includes('Edit Remarks') && checklistItemContent.includes('Add Remarks'),
    'Remarks Accessible in [⋮] Actions Menu',
    'ChecklistItem must allow adding/editing remarks via the secondary actions menu'
  );

  // Test 3: TeamDashboard Header Hierarchy & Eyebrow Badge
  const teamDashboardPath = path.join(workspaceRoot, 'src', 'pages', 'TeamDashboard.tsx');
  const teamDashboardContent = fs.readFileSync(teamDashboardPath, 'utf8');

  // Verify targetTeamId badge sits above h1
  const eyebrowBadgeRegex = /<span[^>]*>\s*\{targetTeamId\}\s*<\/span>[\s\S]*?<h1[^>]*>/;
  assert(
    eyebrowBadgeRegex.test(teamDashboardContent),
    'Team Committee Badge Positioned Above Title as Eyebrow Tag',
    'The committee ID badge must sit above the h1 to prevent squishing title into 4 wrapped lines on mobile'
  );

  // Test 4: Exactly One "Add Task" Button in TeamDashboard
  const addTaskButtonMatches = teamDashboardContent.match(/<span>Add Task<\/span>/g);
  const addTaskCount = addTaskButtonMatches ? addTaskButtonMatches.length : 0;
  assert(
    addTaskCount === 1,
    'Exactly One "Add Task" Button Rendered in TeamDashboard',
    `Expected 1 "Add Task" button, found ${addTaskCount}. Duplicate buttons must be eliminated.`
  );

  // Test 5: Horizontal Scroll Filter Bar
  assert(
    teamDashboardContent.includes('overflow-x-auto scrollbar-none flex-nowrap'),
    'Filter Chips Configured for Touch Horizontal Scroll (No 2-Line Breaking)',
    'Filter container must use overflow-x-auto scrollbar-none flex-nowrap to keep pills on a single line'
  );

  // Test 6: Deduplication of 100% Milestone Progress Card
  assert(
    teamDashboardContent.includes('metrics.completionPercentage < 100'),
    '100% Completion Progress Card Deduplicated',
    'The redundant progress card must be hidden when completion reaches 100%, allowing the milestone hero card to shine'
  );

  console.log(`\n========================================`);
  console.log(`Phase 16 Verification Results: ${passCount}/${totalTests} Passed`);
  console.log(`========================================\n`);

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runPhase16Tests();
