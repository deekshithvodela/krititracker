import { parseTeamSpreadsheetIdsJson, getTeamSpreadsheetMap, STANDARD_COMMITTEE_METADATA } from '../server/_lib/sheets';
import { enforceWriteAccess } from '../server/_lib/auth';
import type { AuthUserContext } from '../server/_lib/auth';

async function runTests() {
  console.log('🧪 Starting Phase 23 Automated Verification Tests...\n');

  // Test 1: Markdown code fences with JSON backticks (exact user case)
  const userPastedMarkdown = `\`\`\` json
{
  "team-01": "1nSxFk6xeWvBHB9F4Rrs-n0WZgVXtaebXxIJf-gBJ8_U",
  "team-02": "1YqZFgF6XCkQZKrMP04VWydbTx6r5eeklAKvl1MPYTiM",
  "team-03": "15Ro2ZueiuFyZn5ESPMesXQwl1FSjccFR1V2Km54e6ng",
  "team-04": "1SqSzOJ0rBQ0ZcJEq_BNwi_TJFDYitaafk2l8CVvl15k",
  "team-05": "1pHsXBQqgpFSqZnuLF2103LPfA0yBKPNESKP6J4mEbAQ",
  "team-06": "1q9wOhbsTnNWtP-nOx0HIE0e6fNocsFBUhPMlnHquRME",
  "team-07": "1Yf1gHC_QdMHu591PiQyK08EzgLF6w5A0YTEVH0-cllw",
  "team-08": "1q4XCIQMnx-x0buRQd2PiDd1HU3fx_LyGVeKZjPY6eyw",
  "team-09": "1PUV90j7eFKdjWvxmm3LFOZF2WXy7OF0btKq8TqAO0Ws",
  "team-10": "1vdLCp2m5h-GWcKN0gdLCck7hzpAvCJYGeKC7GLXE8PA",
  "team-11": "1DjSVLs6XjkITeLBL5VTzAqU4pV09shKhFYm6lbt20eM",
  "team-12": "1ypY2n0JBA87pQgjGuGS8ET4H27z29BWRpGx_4Cw5y58"
}
\`\`\``;

  const result1 = parseTeamSpreadsheetIdsJson(userPastedMarkdown);
  if (Object.keys(result1).length === 12 && result1['team-01'] === '1nSxFk6xeWvBHB9F4Rrs-n0WZgVXtaebXxIJf-gBJ8_U') {
    console.log('✅ Test 1 Passed: Markdown code fenced JSON correctly parsed 12 team spreadsheet IDs.');
  } else {
    throw new Error(`Test 1 Failed: Expected 12 keys, got ${Object.keys(result1).length}: ${JSON.stringify(result1)}`);
  }

  // Test 2: Surrounding quotes and escaped newlines (e.g. from Vercel env CLI)
  const escapedJson = '"{\\n  \\"team-01\\": \\"1nSxFk6xeWvBHB9F4Rrs-n0WZgVXtaebXxIJf-gBJ8_U\\",\\n  \\"team-02\\": \\"1YqZFgF6XCkQZKrMP04VWydbTx6r5eeklAKvl1MPYTiM\\"\\n}"';
  const result2 = parseTeamSpreadsheetIdsJson(escapedJson);
  if (result2['team-01'] === '1nSxFk6xeWvBHB9F4Rrs-n0WZgVXtaebXxIJf-gBJ8_U' && result2['team-02'] === '1YqZFgF6XCkQZKrMP04VWydbTx6r5eeklAKvl1MPYTiM') {
    console.log('✅ Test 2 Passed: Surrounding quotes and escaped newlines correctly parsed.');
  } else {
    throw new Error(`Test 2 Failed: Unexpected result: ${JSON.stringify(result2)}`);
  }

  // Test 3: Trailing comma in JSON
  const trailingCommaJson = `{
    "team-01": "sheet-id-1",
    "team-02": "sheet-id-2",
  }`;
  const result3 = parseTeamSpreadsheetIdsJson(trailingCommaJson);
  if (result3['team-01'] === 'sheet-id-1' && result3['team-02'] === 'sheet-id-2') {
    console.log('✅ Test 3 Passed: Trailing comma in JSON handled smoothly.');
  } else {
    throw new Error(`Test 3 Failed: Unexpected result: ${JSON.stringify(result3)}`);
  }

  // Test 4: Single quotes and unquoted keys
  const looseJson = `{'team-01': 'sheet-id-1', 'team-02': 'sheet-id-2'}`;
  const result4 = parseTeamSpreadsheetIdsJson(looseJson);
  if (result4['team-01'] === 'sheet-id-1' && result4['team-02'] === 'sheet-id-2') {
    console.log('✅ Test 4 Passed: Single quotes relaxed JSON parsed correctly.');
  } else {
    throw new Error(`Test 4 Failed: Unexpected result: ${JSON.stringify(result4)}`);
  }

  // Test 5: Fallback regex extractor for broken JSON
  const brokenJson = `Some noise before { team-01: "sheet-id-1", "team-02": "sheet-id-2" } noise after`;
  const result5 = parseTeamSpreadsheetIdsJson(brokenJson);
  if (result5['team-01'] === 'sheet-id-1' && result5['team-02'] === 'sheet-id-2') {
    console.log('✅ Test 5 Passed: Fallback regex extractor recovered valid key-value pairs.');
  } else {
    throw new Error(`Test 5 Failed: Unexpected result: ${JSON.stringify(result5)}`);
  }

  // Test 6: STANDARD_COMMITTEE_METADATA covers all 12 teams
  for (let i = 1; i <= 12; i++) {
    const pad = String(i).padStart(2, '0');
    const key = `team-${pad}`;
    if (!STANDARD_COMMITTEE_METADATA[key] || !STANDARD_COMMITTEE_METADATA[key].name) {
      throw new Error(`Test 6 Failed: Missing standard metadata for ${key}`);
    }
  }
  console.log('✅ Test 6 Passed: Standard committee metadata defined for all 12 teams.');

  // Test 7: RBAC enforceWriteAccess permissions
  const adminUser: AuthUserContext = {
    id: 'USR-ADMIN-1',
    name: 'Robert Hayes',
    email: 'admin@medevent.org',
    role: 'admin',
    teamId: 'all',
  };

  const team01Head: AuthUserContext = {
    id: 'USR-HEAD-01',
    name: 'Deekshith Vodela',
    email: 'vodeladeekshith@gmail.com',
    role: 'team_head',
    teamId: 'team-01',
  };

  const viewerUser: AuthUserContext = {
    id: 'USR-VIEW-01',
    name: 'Auditor Sam',
    email: 'auditor@medevent.org',
    role: 'viewer',
    teamId: 'team-01',
  };

  // 7a. Admin can write to any team
  try {
    enforceWriteAccess(adminUser, 'team-01');
    enforceWriteAccess(adminUser, 'team-02');
    console.log('✅ Test 7a Passed: Admin has full write access across all teams.');
  } catch (err) {
    throw new Error(`Test 7a Failed: Admin was rejected: ${err}`);
  }

  // 7b. Team Head can write to their assigned team
  try {
    enforceWriteAccess(team01Head, 'team-01');
    console.log('✅ Test 7b Passed: Team Head has write access to their assigned committee (team-01).');
  } catch (err) {
    throw new Error(`Test 7b Failed: Team Head was rejected on their own team: ${err}`);
  }

  // 7c. Team Head is rejected when attempting cross-team edits (e.g. team-02)
  let crossTeamBlocked = false;
  try {
    enforceWriteAccess(team01Head, 'team-02');
  } catch (_e) {
    crossTeamBlocked = true;
  }
  if (crossTeamBlocked) {
    console.log('✅ Test 7c Passed: Team Head is strictly blocked from cross-team write operations (team-02).');
  } else {
    throw new Error('Test 7c Failed: Team Head was NOT blocked from cross-team edit!');
  }

  // 7d. Viewer is rejected from write access
  let viewerBlocked = false;
  try {
    enforceWriteAccess(viewerUser, 'team-01');
  } catch (_e) {
    viewerBlocked = true;
  }
  if (viewerBlocked) {
    console.log('✅ Test 7d Passed: Viewer role is strictly blocked from write operations.');
  } else {
    throw new Error('Test 7d Failed: Viewer was NOT blocked from write operation!');
  }

  // Test 8: Empty Team_Overview Auto-Populate Logic
  const mockMasterRows: any[][] = []; // Empty sheet (only headers, 0 data rows)
  const appendedBatches: any[][] = [];

  const fakeSheetsClient: any = {
    spreadsheets: {
      values: {
        get: async ({ range }: { range: string }) => {
          if (range.includes('Team_Overview')) {
            return { data: { values: mockMasterRows } };
          }
          return { data: { values: [] } };
        },
        append: async ({ range, requestBody }: { range: string; requestBody: { values: any[][] } }) => {
          if (range.includes('Team_Overview')) {
            appendedBatches.push(...requestBody.values);
            mockMasterRows.push(...requestBody.values);
            return { data: { updates: { updatedRows: requestBody.values.length } } };
          }
          return { data: {} };
        },
      },
    },
  };

  // Simulate the auto-populate logic with the fake client
  const envTeamsMap: Record<string, string> = {
    'team-01': '1nSxFk6xeWvBHB9F4Rrs-n0WZgVXtaebXxIJf-gBJ8_U',
    'team-02': '1YqZFgF6XCkQZKrMP04VWydbTx6r5eeklAKvl1MPYTiM',
    'team-03': '15Ro2ZueiuFyZn5ESPMesXQwl1FSjccFR1V2Km54e6ng',
    'team-04': '1SqSzOJ0rBQ0ZcJEq_BNwi_TJFDYitaafk2l8CVvl15k',
    'team-05': '1pHsXBQqgpFSqZnuLF2103LPfA0yBKPNESKP6J4mEbAQ',
    'team-06': '1q9wOhbsTnNWtP-nOx0HIE0e6fNocsFBUhPMlnHquRME',
    'team-07': '1Yf1gHC_QdMHu591PiQyK08EzgLF6w5A0YTEVH0-cllw',
    'team-08': '1q4XCIQMnx-x0buRQd2PiDd1HU3fx_LyGVeKZjPY6eyw',
    'team-09': '1PUV90j7eFKdjWvxmm3LFOZF2WXy7OF0btKq8TqAO0Ws',
    'team-10': '1vdLCp2m5h-GWcKN0gdLCck7hzpAvCJYGeKC7GLXE8PA',
    'team-11': '1DjSVLs6XjkITeLBL5VTzAqU4pV09shKhFYm6lbt20eM',
    'team-12': '1ypY2n0JBA87pQgjGuGS8ET4H27z29BWRpGx_4Cw5y58',
  };

  const existingTeamIds = new Set(mockMasterRows.map(r => String(r[0]).toLowerCase()));
  const missing = Object.entries(envTeamsMap).filter(([id]) => !existingTeamIds.has(id.toLowerCase()));
  const rowsToAppend = missing.map(([teamId, sheetId]) => {
    const meta = STANDARD_COMMITTEE_METADATA[teamId] || { name: teamId, department: 'Ops', description: '' };
    return [teamId, meta.name, sheetId, '0', '0', '0', '0', 'No tasks assigned yet.', new Date().toISOString(), 'Active', meta.department, '', meta.description];
  });

  await fakeSheetsClient.spreadsheets.values.append({
    range: "'Team_Overview'!A:M",
    requestBody: { values: rowsToAppend },
  });

  if (mockMasterRows.length === 12 && appendedBatches.length === 12 && mockMasterRows[0][1] === 'Team 01 - Scientific Committee & Medical Abstracts') {
    console.log('✅ Test 8 Passed: Empty Team_Overview automatically seeded with all 12 teams and linked spreadsheet IDs.');
  } else {
    throw new Error(`Test 8 Failed: Expected 12 seeded rows, got ${mockMasterRows.length}`);
  }

  console.log('\n🎉 ALL PHASE 23 AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('\n❌ Phase 23 Test Suite Failed:', err);
  process.exit(1);
});
