import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const target = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);

  if (target) {
    const content = fs.readFileSync(target, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const DEFAULT_TEAMS_METADATA = [
  { id: 'team-01', name: 'Engineering', department: 'Technology', headEmail: 'eng-lead@example.com', desc: 'Core product architecture, backend APIs, and frontend systems.' },
  { id: 'team-02', name: 'Product Management', department: 'Product', headEmail: 'product-lead@example.com', desc: 'Roadmap planning, requirements specification, and sprint coordination.' },
  { id: 'team-03', name: 'UI/UX Design', department: 'Design', headEmail: 'design-lead@example.com', desc: 'User experience research, wireframing, and design system components.' },
  { id: 'team-04', name: 'Quality Assurance', department: 'Technology', headEmail: 'qa-lead@example.com', desc: 'Automated testing, regression suites, and bug triaging.' },
  { id: 'team-05', name: 'DevOps & Infrastructure', department: 'Technology', headEmail: 'devops-lead@example.com', desc: 'Cloud deployments, CI/CD pipelines, and server reliability.' },
  { id: 'team-06', name: 'Growth Marketing', department: 'Marketing', headEmail: 'marketing-lead@example.com', desc: 'Campaign launches, user acquisition, and branding assets.' },
  { id: 'team-07', name: 'Customer Success', department: 'Operations', headEmail: 'cs-lead@example.com', desc: 'User onboarding, support ticket resolution, and satisfaction.' },
  { id: 'team-08', name: 'Enterprise Sales', department: 'Sales', headEmail: 'sales-lead@example.com', desc: 'Lead generation, client proposals, and deal closures.' },
  { id: 'team-09', name: 'Finance & Accounts', department: 'Finance', headEmail: 'finance-lead@example.com', desc: 'Budget tracking, vendor payments, and monthly reporting.' },
  { id: 'team-10', name: 'Legal & Compliance', department: 'Legal', headEmail: 'legal-lead@example.com', desc: 'Regulatory compliance, contract reviews, and privacy policies.' },
  { id: 'team-11', name: 'People & HR', department: 'Human Resources', headEmail: 'hr-lead@example.com', desc: 'Recruiting, employee engagement, and culture initiatives.' },
  { id: 'team-12', name: 'Business Operations', department: 'Operations', headEmail: 'ops-lead@example.com', desc: 'Cross-functional efficiency, logistics, and process automation.' },
];

const SAMPLE_TASKS_POOL: Record<string, Array<{ title: string; desc: string; priority: string; category: string; daysOffset: number; status: string }>> = {
  'team-01': [
    { title: 'Migrate Core Services to Node 20', desc: 'Upgrade dependencies and run regression tests across microservices.', priority: 'High', category: 'Core Deliverables', daysOffset: 3, status: 'Pending' },
    { title: 'Refactor Google Sheets API Batch Client', desc: 'Implement exponential backoff retry and request deduplication.', priority: 'Critical', category: 'Core Deliverables', daysOffset: -1, status: 'Pending' }, // overdue
    { title: 'Set up Vite Production Bundle Analysis', desc: 'Analyze bundle size to keep client chunk under 250KB.', priority: 'Medium', category: 'Deployment & Operations', daysOffset: 7, status: 'Pending' },
    { title: 'Audit OAuth Token Revocation Flow', desc: 'Ensure token revocation invalidates server-side session immediately.', priority: 'High', category: 'Quality Assurance', daysOffset: 5, status: 'Completed' },
  ],
  'team-02': [
    { title: 'Draft Q3 Feature Roadmap Spec', desc: 'Gather requirements from 12 team leads and prioritize deliverables.', priority: 'High', category: 'Core Deliverables', daysOffset: 4, status: 'Pending' },
    { title: 'Define Task Reorder UX Spec', desc: 'Document drag and drop interactions and keyboard shortcuts.', priority: 'Medium', category: 'Core Deliverables', daysOffset: 6, status: 'Pending' },
    { title: 'Review Sprint Velocity Metrics', desc: 'Compile burndown chart and retrospective feedback.', priority: 'Low', category: 'Documentation', daysOffset: 10, status: 'Completed' },
  ],
  'team-03': [
    { title: 'Finalize Design Tokens for Dark/Light Themes', desc: 'Export CSS variables for semantic backgrounds and borders.', priority: 'High', category: 'Core Deliverables', daysOffset: 2, status: 'Pending' },
    { title: 'Mobile Responsiveness Component Audit', desc: 'Verify touch targets are minimum 44px on mobile breakpoints.', priority: 'Critical', category: 'Quality Assurance', daysOffset: -2, status: 'Pending' }, // overdue
    { title: 'Publish Icon Suite Guidelines', desc: 'Document Lucide icon conventions across dashboards.', priority: 'Low', category: 'Documentation', daysOffset: 12, status: 'Completed' },
  ],
};

function getSampleTasksForTeam(teamId: string) {
  if (SAMPLE_TASKS_POOL[teamId]) {
    return SAMPLE_TASKS_POOL[teamId];
  }
  // Generic template
  return [
    { title: 'Quarterly Milestone Review', desc: 'Review team milestones and deliverables against targets.', priority: 'High', category: 'Core Deliverables', daysOffset: 3, status: 'Pending' },
    { title: 'Process Documentation Update', desc: 'Update standard operating procedures in knowledge base.', priority: 'Medium', category: 'Documentation', daysOffset: 7, status: 'Pending' },
    { title: 'Security & Access Control Review', desc: 'Ensure team permissions follow principle of least privilege.', priority: 'Critical', category: 'Quality Assurance', daysOffset: -1, status: 'Pending' }, // overdue
    { title: 'Initial Sprint Kickoff', desc: 'Kick off weekly sprint planning and task assignments.', priority: 'Low', category: 'Operations', daysOffset: 14, status: 'Completed' },
  ];
}

async function ensureSheetExists(sheets: any, spreadsheetId: string, sheetTitle: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetList: any[] = meta.data.sheets || [];
  const exists = sheetList.some(s => s.properties?.title === sheetTitle);

  if (!exists) {
    console.log(`   Adding sheet "${sheetTitle}" to ${spreadsheetId}...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetTitle },
            },
          },
        ],
      },
    });
  }
}

async function setup() {
  console.log('🚀 Starting Automated Google Sheets Setup for KRITI Tracker...\n');

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const masterId = process.env.MASTER_SPREADSHEET_ID;
  const initialAdmin = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com';

  if (!email || !key || !masterId) {
    console.error('❌ Environment configuration missing. Please check .env or .env.local.');
    process.exit(1);
  }

  key = key.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  console.log(`✅ Authenticated with Google Service Account: ${email}`);

  // ---------------------------------------------------------------------------
  // 1. Setup Master Spreadsheet
  // ---------------------------------------------------------------------------
  console.log(`\n📋 1. Setting up Master Spreadsheet (${masterId})...`);

  // Ensure sheets exist
  await ensureSheetExists(sheets, masterId, 'Team_Overview');
  await ensureSheetExists(sheets, masterId, 'Users');
  await ensureSheetExists(sheets, masterId, 'Global_Activity');
  await ensureSheetExists(sheets, masterId, 'Configuration');

  // Master: Team_Overview Headers
  const teamOverviewHeaders = [
    'Team ID',
    'Team Name',
    'Spreadsheet ID',
    'Total Tasks',
    'Completed Tasks',
    'Pending Tasks',
    'Completion %',
    'Latest Pending Task',
    'Last Updated',
    'Status',
    'Department',
    'Head Email',
    'Description',
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: masterId,
    range: 'Team_Overview!A1:M1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [teamOverviewHeaders] },
  });

  // Master: Users Headers & Seed Admin
  const usersHeaders = ['User ID', 'Name', 'Email', 'Role', 'Team ID', 'Active'];
  const initialUsers = [
    usersHeaders,
    ['USR-ADMIN-001', 'System Administrator', initialAdmin.toLowerCase(), 'admin', 'all', 'TRUE'],
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: masterId,
    range: 'Users!A1:F2',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: initialUsers },
  });

  // Master: Global_Activity Headers
  const globalActivityHeaders = ['Activity ID', 'Team ID', 'Task ID', 'Action', 'User', 'Timestamp'];
  await sheets.spreadsheets.values.update({
    spreadsheetId: masterId,
    range: 'Global_Activity!A1:F1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [globalActivityHeaders] },
  });

  // Master: Configuration Headers & Defaults
  const configHeaders = ['Key', 'Value (JSON)', 'Description', 'Last Updated', 'Updated By'];
  const defaultWidgets = JSON.stringify({
    showKpiMetrics: true,
    showTeamOverviewTable: true,
    showGlobalActivityFeed: true,
    showOverdueAlerts: true,
    showSyncHealthStatus: true,
  });
  const defaultFields = JSON.stringify(['teamName', 'progress', 'tasksCount', 'latestPending', 'lastUpdated', 'status']);
  const defaultCategories = JSON.stringify(['Core Deliverables', 'Quality Assurance', 'Deployment & Operations', 'Documentation', 'General']);
  const defaultAppSettings = JSON.stringify({
    companyName: 'Company Team Progress System',
    announcementBanner: 'Welcome to KRITI Tracker. Centralised Checklist & Progress Tracking.',
    allowTeamHeadReopen: true,
    requireRemarksOnCompletion: false,
  });

  const now = new Date().toISOString();
  const configValues = [
    configHeaders,
    ['dashboard_widgets', defaultWidgets, 'Visibility toggles for dashboard widgets', now, initialAdmin],
    ['visible_team_fields', defaultFields, 'Columns displayed on team overview table', now, initialAdmin],
    ['categories', defaultCategories, 'Task categories and sections', now, initialAdmin],
    ['app_settings', defaultAppSettings, 'Application-wide branding and rules', now, initialAdmin],
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: masterId,
    range: 'Configuration!A1:E5',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: configValues },
  });

  console.log('   ✅ Master Spreadsheet sheets formatted and seeded.');

  // ---------------------------------------------------------------------------
  // 2. Setup Team Spreadsheets
  // ---------------------------------------------------------------------------
  const teamEnv = process.env.TEAM_SPREADSHEET_IDS;
  if (!teamEnv) {
    console.warn('⚠️  No TEAM_SPREADSHEET_IDS found in environment. Skipping individual team sheets.');
    return;
  }

  const teamMap: Record<string, string> = JSON.parse(teamEnv);
  const teamIds = Object.keys(teamMap);
  console.log(`\n📋 2. Setting up ${teamIds.length} Team Spreadsheets...`);

  const teamOverviewRows: any[][] = [];

  for (let i = 0; i < teamIds.length; i++) {
    const teamId = teamIds[i];
    const sId = teamMap[teamId];
    const meta = DEFAULT_TEAMS_METADATA.find(t => t.id === teamId) || {
      id: teamId,
      name: `Team ${teamId.replace('team-', '')}`,
      department: 'General',
      headEmail: `lead-${teamId}@example.com`,
      desc: `Operations for ${teamId}`,
    };

    console.log(`   ⚙️ Formatting ${teamId} (${meta.name}) -> ${sId}...`);

    try {
      await ensureSheetExists(sheets, sId, 'Tasks');
      await ensureSheetExists(sheets, sId, 'Activity_Log');

      // Team: Tasks Headers
      const tasksHeaders = [
        'Task ID',
        'Task Title',
        'Description',
        'Assigned To',
        'Priority',
        'Deadline',
        'Status',
        'Remarks',
        'Display Order',
        'Created At',
        'Updated At',
        'Completed At',
        'Category',
        'Is Mandatory',
      ];

      // Sample tasks for this team
      const sampleDefs = getSampleTasksForTeam(teamId);
      const today = new Date();

      const taskRows: any[][] = sampleDefs.map((def, idx) => {
        const deadlineDate = new Date();
        deadlineDate.setDate(today.getDate() + def.daysOffset);
        const deadlineStr = deadlineDate.toISOString().split('T')[0];
        const isCompleted = def.status === 'Completed';

        return [
          `TASK-${teamId.replace('team-', '')}-${String(idx + 1).padStart(3, '0')}`,
          def.title,
          def.desc,
          meta.headEmail,
          def.priority,
          deadlineStr,
          def.status,
          isCompleted ? 'Verified and signed off.' : '',
          idx + 1,
          now,
          now,
          isCompleted ? now : '',
          def.category,
          'TRUE',
        ];
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: sId,
        range: 'Tasks!A1:N' + (taskRows.length + 1),
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [tasksHeaders, ...taskRows] },
      });

      // Team: Activity_Log Headers
      const activityLogHeaders = [
        'Activity ID',
        'Task ID',
        'Action',
        'Previous Value',
        'New Value',
        'Performed By',
        'Timestamp',
      ];
      await sheets.spreadsheets.values.update({
        spreadsheetId: sId,
        range: 'Activity_Log!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [activityLogHeaders] },
      });

      // Calculate initial metrics for Master Team_Overview
      const totalTasks = sampleDefs.length;
      const completedTasks = sampleDefs.filter(t => t.status === 'Completed').length;
      const pendingTasks = totalTasks - completedTasks;
      const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
      const firstPending = sampleDefs.find(t => t.status !== 'Completed');
      const latestPendingTask = firstPending ? firstPending.title : 'All tasks completed.';

      teamOverviewRows.push([
        meta.id,
        meta.name,
        sId,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionPercentage,
        latestPendingTask,
        now,
        'Active',
        meta.department,
        meta.headEmail,
        meta.desc,
      ]);

      console.log(`      ✅ Initialized with ${totalTasks} tasks (${completionPercentage}% completed). Next: "${latestPendingTask}"`);
    } catch (err: any) {
      console.error(`      ❌ Failed to setup ${teamId} (${sId}):`, err.message);
    }
  }

  // Write all seeded rows to Master Spreadsheet Team_Overview
  if (teamOverviewRows.length > 0) {
    console.log(`\n🔄 Updating Master Team_Overview with ${teamOverviewRows.length} team summaries...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterId,
      range: `Team_Overview!A2:M${teamOverviewRows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: teamOverviewRows },
    });
    console.log('   ✅ Master Team_Overview updated successfully.');
  }

  console.log('\n✨ Setup completed! All 13 spreadsheets are configured and ready.');
}

setup();
