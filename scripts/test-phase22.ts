import {
  resolveUserSheetMetadata,
  resolveGlobalActivityTabName,
  resolveConfigTabName,
  ensureMasterSpreadsheetInitialized,
  invalidateMasterSheetCache,
  UserSheetMetadata,
} from '../server/_lib/sheets';
import type { UserProfile } from '../src/types';

async function runTests() {
  console.log('🧪 Starting Phase 22 Master Spreadsheet Auto-Discovery & Multi-Schema Tests...\n');

  // Test 1: Format A - Manual / DEPLOYMENT_GUIDE.md ('Authorized_Users')
  invalidateMasterSheetCache();
  const mockSheetsAuthorizedUsers: any = {
    spreadsheets: {
      get: async () => ({
        data: {
          sheets: [
            { properties: { title: 'Authorized_Users' } },
            { properties: { title: 'Team_Overview' } },
            { properties: { title: 'Global_Activity_Log' } },
            { properties: { title: 'App_Config' } },
          ],
        },
      }),
      values: {
        get: async ({ range }: { range: string }) => {
          if (range.includes('Authorized_Users') && range.includes('1:1')) {
            return {
              data: {
                values: [['Email', 'Name', 'Role', 'Team_ID', 'Active', 'Added_By', 'Added_At', 'Last_Login']],
              },
            };
          }
          return { data: { values: [] } };
        },
      },
    },
  };

  const metaA = await resolveUserSheetMetadata(mockSheetsAuthorizedUsers, 'mock-master-id');
  if (
    metaA.tabName === 'Authorized_Users' &&
    metaA.emailColIndex === 0 &&
    metaA.nameColIndex === 1 &&
    metaA.roleColIndex === 2 &&
    metaA.teamIdColIndex === 3 &&
    metaA.activeColIndex === 4
  ) {
    console.log('✅ Test 1 Passed: Format A (Authorized_Users tab with Email in Col 0) resolved correctly.');
  } else {
    throw new Error(`Test 1 Failed: Unexpected metadata for Format A: ${JSON.stringify(metaA)}`);
  }

  // Test 2: Format B - CLI / setup-sheets.ts ('Users')
  invalidateMasterSheetCache();
  const mockSheetsUsers: any = {
    spreadsheets: {
      get: async () => ({
        data: {
          sheets: [
            { properties: { title: 'Users' } },
            { properties: { title: 'Team_Overview' } },
            { properties: { title: 'Global_Activity' } },
            { properties: { title: 'Configuration' } },
          ],
        },
      }),
      values: {
        get: async ({ range }: { range: string }) => {
          if (range.includes('Users') && range.includes('1:1')) {
            return {
              data: {
                values: [['User ID', 'Name', 'Email', 'Role', 'Team ID', 'Active']],
              },
            };
          }
          return { data: { values: [] } };
        },
      },
    },
  };

  const metaB = await resolveUserSheetMetadata(mockSheetsUsers, 'mock-master-id');
  if (
    metaB.tabName === 'Users' &&
    metaB.idColIndex === 0 &&
    metaB.nameColIndex === 1 &&
    metaB.emailColIndex === 2 &&
    metaB.roleColIndex === 3 &&
    metaB.teamIdColIndex === 4 &&
    metaB.activeColIndex === 5
  ) {
    console.log('✅ Test 2 Passed: Format B (Users tab with Email in Col 2) resolved correctly.');
  } else {
    throw new Error(`Test 2 Failed: Unexpected metadata for Format B: ${JSON.stringify(metaB)}`);
  }

  // Test 3: Blank Master Sheet Auto-Provisioning (Only 'Sheet1')
  invalidateMasterSheetCache();
  let createdSheets: string[] = [];
  let updatedRanges: string[] = [];

  const mockBlankMasterSheets: any = {
    spreadsheets: {
      get: async () => ({
        data: {
          sheets: [{ properties: { title: 'Sheet1' } }],
        },
      }),
      batchUpdate: async ({ requestBody }: any) => {
        for (const req of requestBody.requests || []) {
          if (req.addSheet?.properties?.title) {
            createdSheets.push(req.addSheet.properties.title);
          }
        }
        return { data: {} };
      },
      values: {
        update: async ({ range }: any) => {
          updatedRanges.push(range);
          return { data: {} };
        },
        get: async () => ({
          data: {
            values: [['User ID', 'Name', 'Email', 'Role', 'Team ID', 'Active', 'Added By', 'Added At', 'Last Login']],
          },
        }),
      },
    },
  };

  // Set mock initial admin email
  process.env.INITIAL_ADMIN_EMAIL = 'admin.dr@kriti.org';
  const metaBlank = await resolveUserSheetMetadata(mockBlankMasterSheets, 'mock-blank-master-id');

  if (
    metaBlank.tabName === 'Users' &&
    createdSheets.includes('Users') &&
    createdSheets.includes('Team_Overview') &&
    createdSheets.includes('Global_Activity') &&
    createdSheets.includes('Configuration')
  ) {
    console.log('✅ Test 3 Passed: Blank spreadsheet auto-provisioned all 4 required tabs.');
  } else {
    throw new Error(`Test 3 Failed: Missing created sheets: ${JSON.stringify(createdSheets)}`);
  }

  // Test 4: Dynamic Activity Tab Name Resolution
  invalidateMasterSheetCache();
  const actTabLog = await resolveGlobalActivityTabName(mockSheetsAuthorizedUsers, 'mock-master');
  invalidateMasterSheetCache();
  const actTabStd = await resolveGlobalActivityTabName(mockSheetsUsers, 'mock-master');

  if (actTabLog === 'Global_Activity_Log' && actTabStd === 'Global_Activity') {
    console.log('✅ Test 4 Passed: Global Activity tab name resolved across both variants.');
  } else {
    throw new Error(`Test 4 Failed: actTabLog=${actTabLog}, actTabStd=${actTabStd}`);
  }

  // Test 5: Dynamic Configuration Tab Name Resolution
  invalidateMasterSheetCache();
  const cfgTabApp = await resolveConfigTabName(mockSheetsAuthorizedUsers, 'mock-master');
  invalidateMasterSheetCache();
  const cfgTabStd = await resolveConfigTabName(mockSheetsUsers, 'mock-master');

  if (cfgTabApp === 'App_Config' && cfgTabStd === 'Configuration') {
    console.log('✅ Test 5 Passed: Configuration tab name resolved across both variants.');
  } else {
    throw new Error(`Test 5 Failed: cfgTabApp=${cfgTabApp}, cfgTabStd=${cfgTabStd}`);
  }

  // Test 6: Robust Multi-Schema Row Parsing Verification
  const rawRowA = ['doctor@medevent.org', 'Dr. Radhika Sharma', 'admin', 'team-01', 'TRUE', 'SysAdmin', '2026-11-01', ''];
  const userFromA: UserProfile = {
    id: metaA.idColIndex >= 0 ? rawRowA[metaA.idColIndex] : 'USR-1',
    name: rawRowA[metaA.nameColIndex],
    email: rawRowA[metaA.emailColIndex].toLowerCase(),
    role: rawRowA[metaA.roleColIndex].toLowerCase() as any,
    teamId: rawRowA[metaA.teamIdColIndex],
    active: rawRowA[metaA.activeColIndex].toUpperCase() === 'TRUE',
  };

  const rawRowB = ['USR-99', 'Dr. A. Verma', 'verma@medevent.org', 'team_head', 'team-02', 'TRUE'];
  const userFromB: UserProfile = {
    id: rawRowB[metaB.idColIndex],
    name: rawRowB[metaB.nameColIndex],
    email: rawRowB[metaB.emailColIndex].toLowerCase(),
    role: rawRowB[metaB.roleColIndex].toLowerCase() as any,
    teamId: rawRowB[metaB.teamIdColIndex],
    active: rawRowB[metaB.activeColIndex].toUpperCase() === 'TRUE',
  };

  if (
    userFromA.email === 'doctor@medevent.org' &&
    userFromA.role === 'admin' &&
    userFromA.active === true &&
    userFromB.email === 'verma@medevent.org' &&
    userFromB.role === 'team_head' &&
    userFromB.id === 'USR-99'
  ) {
    console.log('✅ Test 6 Passed: Dynamic row extraction maps both Format A and Format B cleanly.');
  } else {
    throw new Error('Test 6 Failed: Row parsing output mismatch.');
  }

  console.log('\n🎉 ALL 6 PHASE 22 AUTO-DISCOVERY & MULTI-SCHEMA TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Phase 22 Test Suite Failed:', err);
  process.exit(1);
});
