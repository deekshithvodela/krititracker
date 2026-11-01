import { google, sheets_v4 } from 'googleapis';
import type { Task, ActivityLogItem, GlobalActivityItem, TeamOverview, UserProfile, AppConfig, TeamStatus } from '../../src/types';
import type { SheetRowTeamOverview, SheetRowUser, SheetRowConfig } from './types';

let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Sanitizes and normalizes Google Service Account private key strings from various environment variable formats.
 * Handles:
 * - Literal escaped newlines (\n, \r\n, \\n)
 * - Surrounding double ("...") or single ('...') quotes introduced by shell or UI pastes
 * - Full service account JSON pasted directly into GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * - Base64 encoded PEM keys
 */
export function sanitizePrivateKey(rawKey: string | undefined): string {
  if (!rawKey) return '';
  let str = String(rawKey).trim();

  // If user pasted full Service Account JSON into the private key variable
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.private_key) {
        return sanitizePrivateKey(parsed.private_key);
      }
    } catch {}
  }

  // Normalize all variations of escaped newlines
  str = str
    .replace(/\\r\\n/g, '\n')
    .replace(/\\\\r\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  // Regex extract exact PEM header, body, and footer (ignores surrounding quotes, prefixes, commas)
  const match = str.match(/(-----BEGIN[ A-Z_-]*PRIVATE KEY-----)([\s\S]*?)(-----END[ A-Z_-]*PRIVATE KEY-----)/);
  if (match) {
    const header = match[1];
    // Strip all non-base64 characters from body (removes quotes, spaces, backslashes, commas)
    const body = match[2].replace(/[^A-Za-z0-9+/=]/g, '');
    const footer = match[3];
    const chunks = body.match(/.{1,64}/g) || [];
    return `${header}\n${chunks.join('\n')}\n${footer}\n`;
  }

  // If missing standard PEM header, test if it was base64 encoded
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    if (decoded.includes('PRIVATE KEY') || decoded.startsWith('{')) {
      return sanitizePrivateKey(decoded);
    }
  } catch {}

  return str;
}


/**
 * Resolves Service Account credentials across multiple supported environment formats:
 * 1. GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 (Entire JSON encoded in Base64)
 * 2. Full Service Account JSON pasted in GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * 3. Separate GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */
export function resolveServiceAccountCredentials(): { clientEmail: string; privateKey: string } {
  // 1. Base64 encoded full JSON
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
    try {
      let b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64.trim();
      if ((b64.startsWith('"') && b64.endsWith('"')) || (b64.startsWith("'") && b64.endsWith("'"))) {
        b64 = b64.slice(1, -1).trim();
      }
      const decoded = Buffer.from(b64, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email.trim(),
          privateKey: sanitizePrivateKey(parsed.private_key),
        };
      }
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY_BASE64:', e);
    }
  }

  // 2. Full JSON pasted into GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  let rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || '';
  if (rawPrivateKey.startsWith('{') && rawPrivateKey.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawPrivateKey);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email.trim(),
          privateKey: sanitizePrivateKey(parsed.private_key),
        };
      }
    } catch {}
  }

  // 3. Separate variables
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
  if ((clientEmail.startsWith('"') && clientEmail.endsWith('"')) || (clientEmail.startsWith("'") && clientEmail.endsWith("'"))) {
    clientEmail = clientEmail.slice(1, -1).trim();
  }

  const cleanKey = sanitizePrivateKey(rawPrivateKey);

  if (!clientEmail || !cleanKey) {
    throw new Error(
      'Google Service Account credentials missing or invalid. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) in environment variables.'
    );
  }

  return {
    clientEmail,
    privateKey: cleanKey,
  };
}

export function getGoogleSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) {
    return sheetsClient;
  }

  const creds = resolveServiceAccountCredentials();

  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}


export function getMasterSpreadsheetId(): string {
  const id = process.env.MASTER_SPREADSHEET_ID;
  if (!id) {
    throw new Error('MASTER_SPREADSHEET_ID environment variable is not defined.');
  }
  return id;
}

export function getTeamSpreadsheetMap(): Record<string, string> {
  const envMap = process.env.TEAM_SPREADSHEET_IDS;
  if (!envMap) {
    const map: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      const pad = String(i).padStart(2, '0');
      const teamKey = `team-${pad}`;
      const envKey = `TEAM_${pad}_SPREADSHEET_ID`;
      if (process.env[envKey]) {
        map[teamKey] = process.env[envKey]!;
      }
    }
    return map;
  }

  try {
    return JSON.parse(envMap);
  } catch (err) {
    console.error('Failed to parse TEAM_SPREADSHEET_IDS JSON:', err);
    throw new Error('Invalid TEAM_SPREADSHEET_IDS JSON format.');
  }
}

export async function getTeamSpreadsheetId(teamId: string): Promise<string> {
  const map = getTeamSpreadsheetMap();
  if (map[teamId]) {
    return map[teamId];
  }

  try {
    const teams = await fetchMasterTeamOverview();
    const found = teams.find(t => t.id === teamId);
    if (found && found.spreadsheetId) {
      return found.spreadsheetId;
    }
  } catch (err) {
    console.warn(`Could not lookup dynamic team ${teamId} from master overview:`, err);
  }

  throw new Error(`Spreadsheet ID not found for team: ${teamId}.`);
}

// -----------------------------------------------------------------------------
// Team Spreadsheet Operations (Tasks & Activity_Log)
// -----------------------------------------------------------------------------

/**
 * Proactively verifies and provisions required 'Tasks' and 'Activity_Log' tabs
 * along with standardized column headers in any blank or newly linked Google Spreadsheet.
 */
export async function ensureTeamSpreadsheetInitialized(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId || spreadsheetId.trim() === '') return;
  const sheets = getGoogleSheetsClient();

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets || [];
    const sheetTitles = existingSheets.map(s => s.properties?.title).filter(Boolean);

    const requests: sheets_v4.Schema$Request[] = [];

    if (!sheetTitles.includes('Tasks')) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Tasks',
            gridProperties: { rowCount: 100, columnCount: 14 },
          },
        },
      });
    }

    if (!sheetTitles.includes('Activity_Log')) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Activity_Log',
            gridProperties: { rowCount: 100, columnCount: 7 },
          },
        },
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    // Populate standard headers if the sheets were newly created
    if (!sheetTitles.includes('Tasks')) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Tasks!A1:N1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
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
          ]],
        },
      });
    }

    if (!sheetTitles.includes('Activity_Log')) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Activity_Log!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'Log ID',
            'Task ID',
            'Action',
            'Previous Value',
            'New Value',
            'Performed By',
            'Timestamp',
          ]],
        },
      });
    }
  } catch (err: any) {
    console.error(`Failed to auto-provision team spreadsheet ${spreadsheetId}:`, err.message);
    throw err;
  }
}

export async function fetchTeamTasks(teamId: string): Promise<Task[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A2:N',
    });

    const rows = response.data.values || [];
    const tasks: Task[] = rows.map((row, index) => {
      return {
        id: row[0] ? String(row[0]).trim() : `TASK-${teamId}-${index + 1}`,
        title: row[1] ? String(row[1]).trim() : '',
        description: row[2] ? String(row[2]).trim() : '',
        assignedTo: row[3] ? String(row[3]).trim() : undefined,
        priority: (row[4] ? String(row[4]).trim() : 'Medium') as any,
        deadline: row[5] ? String(row[5]).trim() : '',
        status: ((row[6] && String(row[6]).trim().toLowerCase() === 'completed') ? 'Completed' : 'Pending') as any,
        remarks: row[7] ? String(row[7]).trim() : '',
        displayOrder: row[8] ? parseInt(String(row[8]), 10) || index + 1 : index + 1,
        createdAt: row[9] ? String(row[9]).trim() : new Date().toISOString(),
        updatedAt: row[10] ? String(row[10]).trim() : new Date().toISOString(),
        completedAt: row[11] ? String(row[11]).trim() : undefined,
        category: row[12] ? String(row[12]).trim() : 'General',
        isMandatory: row[13] ? String(row[13]).trim().toUpperCase() !== 'FALSE' : true,
      };
    }).filter(t => t.id && t.title);

    return tasks.sort((a, b) => a.displayOrder - b.displayOrder);
  } catch (err: any) {
    // If range is missing (e.g. freshly linked blank Google Sheet), auto-provision and return empty task list
    if (err.message?.includes('Unable to parse range') || err.message?.includes('not found') || err.code === 400) {
      console.log(`Auto-provisioning blank spreadsheet for team ${teamId} (${spreadsheetId})...`);
      await ensureTeamSpreadsheetInitialized(spreadsheetId);
      return [];
    }
    throw err;
  }
}

export async function findTaskRowIndex(teamId: string, taskId: string): Promise<number> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Tasks!A:A',
  });

  const rows = response.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && String(rows[i][0]).trim() === taskId) {
      return i + 1;
    }
  }

  return -1;
}

export async function updateTaskRow(teamId: string, rowIndex: number, task: Task): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  const values = [
    [
      task.id,
      task.title,
      task.description,
      task.assignedTo || '',
      task.priority,
      task.deadline,
      task.status,
      task.remarks || '',
      task.displayOrder,
      task.createdAt,
      task.updatedAt,
      task.completedAt || '',
      task.category || 'General',
      task.isMandatory !== false ? 'TRUE' : 'FALSE',
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Tasks!A${rowIndex}:N${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function appendTaskRow(teamId: string, task: Task): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  const values = [
    [
      task.id,
      task.title,
      task.description,
      task.assignedTo || '',
      task.priority,
      task.deadline,
      task.status,
      task.remarks || '',
      task.displayOrder,
      task.createdAt,
      task.updatedAt,
      task.completedAt || '',
      task.category || 'General',
      task.isMandatory !== false ? 'TRUE' : 'FALSE',
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Tasks!A:N',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function batchUpdateTaskRows(teamId: string, tasks: Task[]): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Tasks!A2:N',
  });

  if (tasks.length === 0) return;

  const values = tasks.map(task => [
    task.id,
    task.title,
    task.description,
    task.assignedTo || '',
    task.priority,
    task.deadline,
    task.status,
    task.remarks || '',
    task.displayOrder,
    task.createdAt,
    task.updatedAt,
    task.completedAt || '',
    task.category || 'General',
    task.isMandatory !== false ? 'TRUE' : 'FALSE',
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Tasks!A2:N${tasks.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function appendTeamActivityLog(teamId: string, item: ActivityLogItem): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  const values = [
    [
      item.id,
      item.taskId,
      item.action,
      item.previousValue || '',
      item.newValue || '',
      item.performedBy,
      item.timestamp,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Activity_Log!A:G',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function fetchTeamActivityLog(teamId: string, limit = 20): Promise<ActivityLogItem[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Activity_Log!A2:G',
  });

  const rows = response.data.values || [];
  const items: ActivityLogItem[] = rows.map((r, i) => ({
    id: r[0] || `ACT-${i}`,
    taskId: r[1] || '',
    action: (r[2] || 'TASK_EDITED') as any,
    previousValue: r[3] || '',
    newValue: r[4] || '',
    performedBy: r[5] || 'System',
    timestamp: r[6] || new Date().toISOString(),
  }));

  return items.reverse().slice(0, limit);
}

// -----------------------------------------------------------------------------
// Master Spreadsheet Operations
// -----------------------------------------------------------------------------

export async function fetchMasterTeamOverview(): Promise<TeamOverview[]> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Team_Overview!A2:M',
  });

  const rows = response.data.values || [];
  return rows.map(r => {
    const rawStatus = r[9] ? String(r[9]).trim() : 'Active';
    const status: TeamStatus = (['Active', 'Deactivated', 'Archived'].includes(rawStatus) ? rawStatus : 'Active') as TeamStatus;

    return {
      id: r[0] ? String(r[0]).trim() : '',
      name: r[1] ? String(r[1]).trim() : '',
      spreadsheetId: r[2] ? String(r[2]).trim() : '',
      totalTasks: parseInt(String(r[3] || '0'), 10),
      completedTasks: parseInt(String(r[4] || '0'), 10),
      pendingTasks: parseInt(String(r[5] || '0'), 10),
      completionPercentage: parseInt(String(r[6] || '0'), 10),
      latestPendingTask: r[7] ? String(r[7]).trim() : 'No tasks assigned yet.',
      lastUpdated: r[8] ? String(r[8]).trim() : new Date().toISOString(),
      status,
      department: r[10] ? String(r[10]).trim() : undefined,
      headEmail: r[11] ? String(r[11]).trim() : undefined,
      description: r[12] ? String(r[12]).trim() : undefined,
    };
  }).filter(t => t.id);
}

export async function updateMasterTeamOverviewRow(teamOverview: SheetRowTeamOverview): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Team_Overview!A:A',
  });

  const rows = response.data.values || [];
  let targetRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && String(rows[i][0]).trim() === teamOverview.teamId) {
      targetRowIndex = i + 1;
      break;
    }
  }

  const values = [
    [
      teamOverview.teamId,
      teamOverview.teamName,
      teamOverview.spreadsheetId,
      teamOverview.totalTasks,
      teamOverview.completedTasks,
      teamOverview.pendingTasks,
      teamOverview.completionPercentage,
      teamOverview.latestPendingTask,
      teamOverview.lastUpdated,
      teamOverview.status || 'Active',
      teamOverview.department || '',
      teamOverview.headEmail || '',
      teamOverview.description || '',
    ],
  ];

  if (targetRowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterId,
      range: `Team_Overview!A${targetRowIndex}:M${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: masterId,
      range: 'Team_Overview!A:M',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  }
}

export async function appendGlobalActivityLog(item: GlobalActivityItem): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const values = [
    [
      item.id,
      item.teamId,
      item.taskId,
      item.action,
      item.user,
      item.timestamp,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: masterId,
    range: 'Global_Activity!A:F',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function fetchGlobalActivityLog(limit = 50): Promise<GlobalActivityItem[]> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Global_Activity!A2:F',
  });

  const rows = response.data.values || [];
  const items: GlobalActivityItem[] = rows.map((r, i) => ({
    id: r[0] || `GACT-${i}`,
    teamId: r[1] || '',
    taskId: r[2] || '',
    action: r[3] || '',
    user: r[4] || 'System',
    timestamp: r[5] || new Date().toISOString(),
  }));

  return items.reverse().slice(0, limit);
}

// -----------------------------------------------------------------------------
// User Registry Operations (Email Whitelist)
// -----------------------------------------------------------------------------

export async function fetchUsersList(): Promise<UserProfile[]> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Users!A2:F',
  });

  const rows = response.data.values || [];
  return rows.map((r, i) => ({
    id: r[0] ? String(r[0]).trim() : `USR-${i + 1}`,
    name: r[1] ? String(r[1]).trim() : '',
    email: r[2] ? String(r[2]).trim().toLowerCase() : '',
    role: (r[3] ? String(r[3]).trim().toLowerCase() : 'viewer') as any,
    teamId: r[4] ? String(r[4]).trim() : '',
    active: r[5] ? String(r[5]).trim().toUpperCase() === 'TRUE' : true,
  })).filter(u => u.email);
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const users = await fetchUsersList();
  const normalized = email.trim().toLowerCase();
  return users.find(u => u.email.toLowerCase() === normalized) || null;
}

export async function upsertUser(user: UserProfile): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Users!C:C',
  });

  const rows = response.data.values || [];
  let targetRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && String(rows[i][0]).trim().toLowerCase() === user.email.toLowerCase()) {
      targetRowIndex = i + 1;
      break;
    }
  }

  const values = [
    [
      user.id,
      user.name,
      user.email.toLowerCase(),
      user.role,
      user.teamId,
      user.active ? 'TRUE' : 'FALSE',
    ],
  ];

  if (targetRowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterId,
      range: `Users!A${targetRowIndex}:F${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: masterId,
      range: 'Users!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  }
}

/**
 * Removes a user from the authorized whitelist in Master Users sheet
 */
export async function deleteUser(email: string): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const normalized = email.trim().toLowerCase();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: masterId,
    range: 'Users!A2:F',
  });

  const rows = response.data.values || [];
  const remainingRows = rows.filter(r => r[2] && String(r[2]).trim().toLowerCase() !== normalized);

  // Clear Users sheet and re-write remaining rows
  await sheets.spreadsheets.values.clear({
    spreadsheetId: masterId,
    range: 'Users!A2:F',
  });

  if (remainingRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterId,
      range: `Users!A2:F${remainingRows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: remainingRows },
    });
  }
}

// -----------------------------------------------------------------------------
// Dynamic Configuration Sheet Operations (Configuration)
// -----------------------------------------------------------------------------

export const DEFAULT_APP_CONFIG: AppConfig = {
  dashboardWidgets: {
    showKpiMetrics: true,
    showTeamOverviewTable: true,
    showGlobalActivityFeed: true,
    showOverdueAlerts: true,
    showSyncHealthStatus: true,
  },
  visibleTeamFields: ['teamName', 'progress', 'tasksCount', 'latestPending', 'lastUpdated', 'status'],
  categories: ['Core Deliverables', 'Quality Assurance', 'Deployment & Operations', 'Documentation', 'General'],
  appSettings: {
    companyName: 'Company Team Progress System',
    announcementBanner: '',
    allowTeamHeadReopen: true,
    requireRemarksOnCompletion: false,
  },
};

export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const sheets = getGoogleSheetsClient();
    const masterId = getMasterSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: 'Configuration!A2:E',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return DEFAULT_APP_CONFIG;
    }

    const config: AppConfig = { ...DEFAULT_APP_CONFIG };
    let latestTimestamp = '';
    let lastUser = '';

    for (const row of rows) {
      const key = row[0] ? String(row[0]).trim() : '';
      const valStr = row[1] ? String(row[1]).trim() : '';
      const updated = row[3] ? String(row[3]).trim() : '';
      const user = row[4] ? String(row[4]).trim() : '';

      if (updated && updated > latestTimestamp) {
        latestTimestamp = updated;
        lastUser = user;
      }

      if (!key || !valStr) continue;

      try {
        const parsed = JSON.parse(valStr);
        if (key === 'dashboard_widgets') {
          config.dashboardWidgets = { ...config.dashboardWidgets, ...parsed };
        } else if (key === 'visible_team_fields') {
          config.visibleTeamFields = Array.isArray(parsed) ? parsed : config.visibleTeamFields;
        } else if (key === 'categories') {
          config.categories = Array.isArray(parsed) ? parsed : config.categories;
        } else if (key === 'app_settings') {
          config.appSettings = { ...config.appSettings, ...parsed };
        }
      } catch (err) {
        console.warn(`Failed to parse config key ${key}:`, err);
      }
    }

    config.lastUpdated = latestTimestamp || new Date().toISOString();
    config.updatedBy = lastUser || 'System';

    return config;
  } catch (err) {
    console.warn('Configuration sheet not found or error reading, using defaults:', err);
    return DEFAULT_APP_CONFIG;
  }
}

export async function saveAppConfig(updatedConfig: Partial<AppConfig>, userEmail: string): Promise<AppConfig> {
  const current = await fetchAppConfig();
  const merged: AppConfig = {
    ...current,
    ...updatedConfig,
    dashboardWidgets: {
      ...current.dashboardWidgets,
      ...(updatedConfig.dashboardWidgets || {}),
    },
    appSettings: {
      ...current.appSettings,
      ...(updatedConfig.appSettings || {}),
    },
    lastUpdated: new Date().toISOString(),
    updatedBy: userEmail,
  };

  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const entries = [
    {
      key: 'dashboard_widgets',
      value: JSON.stringify(merged.dashboardWidgets),
      description: 'Visibility toggles for dashboard KPI, table, feed, alerts, and sync widgets',
    },
    {
      key: 'visible_team_fields',
      value: JSON.stringify(merged.visibleTeamFields),
      description: 'Columns displayed on the team overview table',
    },
    {
      key: 'categories',
      value: JSON.stringify(merged.categories),
      description: 'Standard checklist categories and sections',
    },
    {
      key: 'app_settings',
      value: JSON.stringify(merged.appSettings),
      description: 'Application branding, reopen rules, and company announcements',
    },
  ];

  const values = entries.map(e => [
    e.key,
    e.value,
    e.description,
    merged.lastUpdated,
    userEmail,
  ]);

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterId,
      range: 'Configuration!A2:E5',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: masterId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: 'Configuration' },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: 'Configuration!A1:E5',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['Key', 'Value (JSON)', 'Description', 'Last Updated', 'Updated By'],
            ...values,
          ],
        },
      });
    } else {
      throw err;
    }
  }

  return merged;
}
