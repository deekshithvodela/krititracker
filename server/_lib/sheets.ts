import { google, sheets_v4 } from 'googleapis';
import type { Task, ActivityLogItem, GlobalActivityItem, TeamOverview, UserProfile, AppConfig, TeamStatus, UserRole } from '../../src/types';
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

/**
 * Resilient JSON parser for TEAM_SPREADSHEET_IDS environment variable.
 * Handles markdown code fences, surrounding quotes, escaped newlines, trailing commas,
 * and falls back to regex key-value extraction without throwing unhandled errors.
 */
export function parseTeamSpreadsheetIdsJson(rawKey: string | undefined): Record<string, string> {
  if (!rawKey) return {};

  let clean = rawKey.trim();

  // Try direct JSON.parse first (in case it is already valid JSON without any modifications)
  try {
    const directParsed = JSON.parse(clean);
    if (directParsed && typeof directParsed === 'object' && !Array.isArray(directParsed)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(directParsed)) {
        if (k && v && typeof v === 'string') {
          result[k.trim()] = v.trim();
        }
      }
      return result;
    }
    if (typeof directParsed === 'string') {
      return parseTeamSpreadsheetIdsJson(directParsed);
    }
  } catch (_e) {
    // Continue with sanitization
  }

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Strip surrounding outer quotes if string was wrapped in quotes
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  // Handle double-escaped newlines, tabs, and quotes
  clean = clean
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  // If after unescaping newlines it has markdown fences inside:
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Remove trailing commas before closing braces/brackets
  clean = clean.replace(/,\s*([}\]])/g, '$1');

  // Attempt standard JSON.parse after cleaning
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (typeof parsed === 'string') {
        return parseTeamSpreadsheetIdsJson(parsed);
      }
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k && v && typeof v === 'string') {
          result[k.trim()] = v.trim();
        }
      }
      return result;
    }
  } catch (_e) {
    // If standard JSON.parse fails, try relaxing single quotes to double quotes
    try {
      const relaxed = clean
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, '$1');
      const parsed = JSON.parse(relaxed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (k && v && typeof v === 'string') {
            result[k.trim()] = v.trim();
          }
        }
        return result;
      }
    } catch (_e2) {
      // Fall through to regex extraction
    }
  }

  // Regex fallback: extract key-value pairs matching "key": "value"
  const regex = /["']?\\*["']?([a-zA-Z0-9_-]+)["']?\\*["']?\s*:\s*["']?\\*["']?([a-zA-Z0-9_-]+)["']?\\*["']?/g;
  const result: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = regex.exec(clean)) !== null) {
    const key = match[1]?.trim();
    const val = match[2]?.trim();
    if (key && val) {
      result[key] = val;
    }
  }

  return result;
}

export const STANDARD_COMMITTEE_METADATA: Record<string, { name: string; department: string; description: string }> = {
  'team-01': {
    name: 'Team 01 - Scientific Committee & Medical Abstracts',
    department: 'Academic & Clinical Affairs',
    description: 'Abstract reviews, clinical tracks, symposia selection, and journal publication coordination',
  },
  'team-02': {
    name: 'Team 02 - Clinical Workshops & CME Accreditation',
    department: 'Continuing Medical Education',
    description: 'Hands-on clinical stations, ultrasound simulations, and medical council credit hours',
  },
  'team-03': {
    name: 'Team 03 - Keynote Speakers & Faculty Coordination',
    department: 'Faculty Relations',
    description: 'International keynote professors, speaker honorarium, and preview green rooms',
  },
  'team-04': {
    name: 'Team 04 - Surgical Wet-Labs & Simulators',
    department: 'Surgical Training',
    description: 'Laparoscopic simulators, robotic surgery console stations, and cadaver tissue handling',
  },
  'team-05': {
    name: 'Team 05 - Medical Exhibition & Pharma Sponsors',
    department: 'Industry Partnerships',
    description: 'Pharmaceutical pavilions, medical technology demo booths, and sponsorship logistics',
  },
  'team-06': {
    name: 'Team 06 - Delegate Registration & Health Badging',
    department: 'Delegate Services',
    description: 'RFID physician delegate badges, on-site check-in kiosks, and welcome kits',
  },
  'team-07': {
    name: 'Team 07 - Audio-Visual, Telemedicine & Live Surgery Broadcast',
    department: 'Medical Broadcast',
    description: '4K surgical video feeds, live telemedicine operating theatre broadcast, and plenary audio sync',
  },
  'team-08': {
    name: 'Team 08 - Hospitality, VIP Doctors & Travel Logistics',
    department: 'Hospitality & VIP Concierge',
    description: 'Airport doctor concierge, presidential suite bookings, and dedicated executive shuttles',
  },
  'team-09': {
    name: 'Team 09 - Emergency Medical Protocol & First Aid Ops',
    department: 'Emergency Medicine & Safety',
    description: 'Onsite emergency triage station, automated defibrillators (AED), and hospital trauma dispatch',
  },
  'team-10': {
    name: 'Team 10 - Medical Press, Media & Journal Publications',
    department: 'Communications & Media',
    description: 'Medical journalism briefings, clinical trial press releases, and symposium media embargoes',
  },
  'team-11': {
    name: 'Team 11 - Venue Facilities, Bio-Hazard & Infection Control',
    department: 'Facility & Biosafety Operations',
    description: 'HEPA filtration monitoring, biomedical waste disposal, and infection control cycles',
  },
  'team-12': {
    name: 'Team 12 - Compliance, Ethics Board & Medical Regulatory',
    department: 'Regulatory & Ethics',
    description: 'Clinical trial registrations, medical malpractice indemnity, and IRB ethics clearances',
  },
};

export function getTeamSpreadsheetMap(): Record<string, string> {
  const envMap = process.env.TEAM_SPREADSHEET_IDS;
  let map: Record<string, string> = {};

  if (envMap) {
    try {
      map = parseTeamSpreadsheetIdsJson(envMap);
    } catch (err) {
      console.warn('Failed to parse TEAM_SPREADSHEET_IDS, attempting fallback...', err);
    }
  }

  // Always merge individual TEAM_XX_SPREADSHEET_ID variables as fallbacks or additions
  for (let i = 1; i <= 12; i++) {
    const pad = String(i).padStart(2, '0');
    const teamKey = `team-${pad}`;
    const envKey = `TEAM_${pad}_SPREADSHEET_ID`;
    if (process.env[envKey] && !map[teamKey]) {
      map[teamKey] = process.env[envKey]!;
    }
  }

  return map;
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

  const runAppend = async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Tasks!A:N',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  };

  try {
    await runAppend();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found') || err?.code === 400) {
      console.warn(`Team spreadsheet ${spreadsheetId} missing Tasks tab, auto-provisioning and retrying append...`);
      await ensureTeamSpreadsheetInitialized(spreadsheetId);
      await runAppend();
      return;
    }
    throw err;
  }
}

export async function batchUpdateTaskRows(teamId: string, tasks: Task[]): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);

  const runUpdate = async () => {
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
  };

  try {
    await runUpdate();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found') || err?.code === 400) {
      console.warn(`Team spreadsheet ${spreadsheetId} missing Tasks tab, auto-provisioning and retrying update...`);
      await ensureTeamSpreadsheetInitialized(spreadsheetId);
      await runUpdate();
      return;
    }
    throw err;
  }
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
// Master Spreadsheet Operations & Schema Auto-Discovery Engine
// -----------------------------------------------------------------------------

export interface UserSheetMetadata {
  tabName: string;
  emailColIndex: number;
  nameColIndex: number;
  roleColIndex: number;
  teamIdColIndex: number;
  activeColIndex: number;
  idColIndex: number;
}

// In-memory cache for resolved metadata (prevents redundant get calls on warm lambda)
let cachedMasterSheetTitles: string[] | null = null;
let cachedUserSheetMeta: UserSheetMetadata | null = null;
let cachedActivityTabName: string | null = null;
let cachedConfigTabName: string | null = null;

export function invalidateMasterSheetCache(): void {
  cachedMasterSheetTitles = null;
  cachedUserSheetMeta = null;
  cachedActivityTabName = null;
  cachedConfigTabName = null;
}

/**
 * Proactively verifies and provisions required tabs and column headers in the
 * Master Spreadsheet if they do not exist (e.g. newly created blank Google Sheet).
 */
export async function ensureMasterSpreadsheetInitialized(spreadsheetId: string, customSheetsClient?: sheets_v4.Sheets): Promise<string[]> {
  const sheets = customSheetsClient || getGoogleSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const sheetTitles = existingSheets.map(s => s.properties?.title).filter(Boolean) as string[];

  const requests: sheets_v4.Schema$Request[] = [];
  const hasUserSheet = sheetTitles.includes('Users') || sheetTitles.includes('Authorized_Users');
  const hasTeamOverview = sheetTitles.includes('Team_Overview');
  const hasActivitySheet = sheetTitles.includes('Global_Activity') || sheetTitles.includes('Global_Activity_Log');
  const hasConfigSheet = sheetTitles.includes('Configuration') || sheetTitles.includes('App_Config');

  if (!hasUserSheet) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Users',
          gridProperties: { rowCount: 100, columnCount: 10 },
        },
      },
    });
  }

  if (!hasTeamOverview) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Team_Overview',
          gridProperties: { rowCount: 100, columnCount: 13 },
        },
      },
    });
  }

  if (!hasActivitySheet) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Global_Activity',
          gridProperties: { rowCount: 100, columnCount: 6 },
        },
      },
    });
  }

  if (!hasConfigSheet) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Configuration',
          gridProperties: { rowCount: 50, columnCount: 5 },
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

  // Populate standard headers and initial admin seed for newly created sheets
  if (!hasUserSheet) {
    const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase().trim();
    const userHeaders = ['User ID', 'Name', 'Email', 'Role', 'Team ID', 'Active', 'Added By', 'Added At', 'Last Login'];
    const initialValues: string[][] = [userHeaders];
    if (initialAdmin) {
      initialValues.push([
        'USR-ADMIN-001',
        'System Administrator',
        initialAdmin,
        'admin',
        'all',
        'TRUE',
        'System',
        new Date().toISOString(),
        '',
      ]);
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Users'!A1:I",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: initialValues },
    });
  }

  if (!hasTeamOverview) {
    const teamHeaders = [
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
      spreadsheetId,
      range: "'Team_Overview'!A1:M1",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [teamHeaders] },
    });
  }

  if (!hasActivitySheet) {
    const activityHeaders = ['Activity ID', 'Team ID', 'Task ID', 'Action', 'User', 'Timestamp'];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Global_Activity'!A1:F1",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [activityHeaders] },
    });
  }

  if (!hasConfigSheet) {
    const configHeaders = ['Key', 'Value (JSON)', 'Description', 'Last Updated', 'Updated By'];
    const now = new Date().toISOString();
    const configRows = [
      configHeaders,
      ['dashboard_widgets', JSON.stringify(DEFAULT_APP_CONFIG.dashboardWidgets), 'Widget toggles', now, 'System'],
      ['visible_team_fields', JSON.stringify(DEFAULT_APP_CONFIG.visibleTeamFields), 'Columns', now, 'System'],
      ['categories', JSON.stringify(DEFAULT_APP_CONFIG.categories), 'Categories', now, 'System'],
      ['app_settings', JSON.stringify(DEFAULT_APP_CONFIG.appSettings), 'Branding', now, 'System'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Configuration'!A1:E5",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: configRows },
    });
  }

  const updatedTitles = [
    ...sheetTitles,
    ...(!hasUserSheet ? ['Users'] : []),
    ...(!hasTeamOverview ? ['Team_Overview'] : []),
    ...(!hasActivitySheet ? ['Global_Activity'] : []),
    ...(!hasConfigSheet ? ['Configuration'] : []),
  ];
  cachedMasterSheetTitles = updatedTitles;
  return updatedTitles;
}

/**
 * Dynamically resolves the user whitelist sheet tab name (Users vs Authorized_Users)
 * and discovers column indices dynamically by inspecting the header row.
 */
export async function resolveUserSheetMetadata(sheets: sheets_v4.Sheets, masterId: string): Promise<UserSheetMetadata> {
  if (cachedUserSheetMeta) {
    return cachedUserSheetMeta;
  }

  let sheetTitles = cachedMasterSheetTitles;
  if (!sheetTitles) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
      sheetTitles = (meta.data.sheets || []).map(s => s.properties?.title).filter(Boolean) as string[];
      cachedMasterSheetTitles = sheetTitles;
    } catch (err: any) {
      console.warn('Could not read master spreadsheet metadata, attempting auto-provisioning:', err.message);
      sheetTitles = await ensureMasterSpreadsheetInitialized(masterId, sheets);
    }
  }

  let tabName: string | null = null;
  if (sheetTitles.includes('Users')) {
    tabName = 'Users';
  } else if (sheetTitles.includes('Authorized_Users')) {
    tabName = 'Authorized_Users';
  }

  if (!tabName) {
    sheetTitles = await ensureMasterSpreadsheetInitialized(masterId, sheets);
    tabName = 'Users';
  }

  let headers: string[] = [];
  try {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${tabName}'!1:1`,
    });
    headers = (headerRes.data.values?.[0] || []).map(h => String(h).trim().toLowerCase());
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      sheetTitles = await ensureMasterSpreadsheetInitialized(masterId, sheets);
      tabName = 'Users';
      const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: masterId,
        range: `'${tabName}'!1:1`,
      });
      headers = (headerRes.data.values?.[0] || []).map(h => String(h).trim().toLowerCase());
    } else {
      throw err;
    }
  }

  const isAuthorizedUsersTab = tabName === 'Authorized_Users';

  // Dynamic header keyword matching
  const findCol = (predicate: (h: string) => boolean, fallback: number): number => {
    const idx = headers.findIndex(predicate);
    return idx >= 0 ? idx : fallback;
  };

  const emailColIndex = findCol(h => h.includes('email'), isAuthorizedUsersTab ? 0 : 2);
  const nameColIndex = findCol(h => h.includes('name'), 1);
  const roleColIndex = findCol(h => h.includes('role'), isAuthorizedUsersTab ? 2 : 3);
  const teamIdColIndex = findCol(h => h.includes('team'), isAuthorizedUsersTab ? 3 : 4);
  const activeColIndex = findCol(h => h.includes('active') || h.includes('status'), isAuthorizedUsersTab ? 4 : 5);
  const idColIndex = headers.findIndex(h => (h.includes('id') || h.includes('user')) && !h.includes('team'));

  cachedUserSheetMeta = {
    tabName,
    emailColIndex,
    nameColIndex,
    roleColIndex,
    teamIdColIndex,
    activeColIndex,
    idColIndex: idColIndex >= 0 ? idColIndex : (isAuthorizedUsersTab ? -1 : 0),
  };

  return cachedUserSheetMeta;
}

export async function resolveGlobalActivityTabName(sheets: sheets_v4.Sheets, masterId: string): Promise<string> {
  if (cachedActivityTabName) return cachedActivityTabName;

  let sheetTitles = cachedMasterSheetTitles;
  if (!sheetTitles) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
    sheetTitles = (meta.data.sheets || []).map(s => s.properties?.title).filter(Boolean) as string[];
    cachedMasterSheetTitles = sheetTitles;
  }

  if (sheetTitles.includes('Global_Activity')) {
    cachedActivityTabName = 'Global_Activity';
  } else if (sheetTitles.includes('Global_Activity_Log')) {
    cachedActivityTabName = 'Global_Activity_Log';
  } else {
    await ensureMasterSpreadsheetInitialized(masterId, sheets);
    cachedActivityTabName = 'Global_Activity';
  }

  return cachedActivityTabName;
}

export async function resolveConfigTabName(sheets: sheets_v4.Sheets, masterId: string): Promise<string> {
  if (cachedConfigTabName) return cachedConfigTabName;

  let sheetTitles = cachedMasterSheetTitles;
  if (!sheetTitles) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
    sheetTitles = (meta.data.sheets || []).map(s => s.properties?.title).filter(Boolean) as string[];
    cachedMasterSheetTitles = sheetTitles;
  }

  if (sheetTitles.includes('Configuration')) {
    cachedConfigTabName = 'Configuration';
  } else if (sheetTitles.includes('App_Config')) {
    cachedConfigTabName = 'App_Config';
  } else {
    await ensureMasterSpreadsheetInitialized(masterId, sheets);
    cachedConfigTabName = 'Configuration';
  }

  return cachedConfigTabName;
}

export async function fetchMasterTeamOverview(): Promise<TeamOverview[]> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const runFetch = async (): Promise<TeamOverview[]> => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: "'Team_Overview'!A2:M",
    });

    const rows = response.data.values || [];
    const existingTeams: TeamOverview[] = rows.map(r => {
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

    // Auto-populate from getTeamSpreadsheetMap if any configured teams are missing from Team_Overview
    const spreadsheetMap = getTeamSpreadsheetMap();
    const existingTeamIds = new Set(existingTeams.map(t => t.id.toLowerCase()));
    const missingTeamEntries = Object.entries(spreadsheetMap).filter(([id]) => !existingTeamIds.has(id.toLowerCase()));

    if (missingTeamEntries.length > 0) {
      const nowIso = new Date().toISOString();
      const rowsToAppend: any[][] = [];
      const newlyAddedTeams: TeamOverview[] = [];

      for (const [teamId, sheetId] of missingTeamEntries) {
        const meta = STANDARD_COMMITTEE_METADATA[teamId] || {
          name: `Team ${teamId.replace('team-', '')} Committee`,
          department: 'Operations',
          description: `Operations and checklist coordination for ${teamId}`,
        };

        const newTeam: TeamOverview = {
          id: teamId,
          name: meta.name,
          spreadsheetId: sheetId,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          completionPercentage: 0,
          latestPendingTask: 'No tasks assigned yet.',
          lastUpdated: nowIso,
          status: 'Active',
          department: meta.department,
          headEmail: undefined,
          description: meta.description,
        };

        newlyAddedTeams.push(newTeam);
        rowsToAppend.push([
          teamId,
          meta.name,
          sheetId,
          '0',
          '0',
          '0',
          '0',
          'No tasks assigned yet.',
          nowIso,
          'Active',
          meta.department,
          '',
          meta.description,
        ]);
      }

      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: masterId,
          range: "'Team_Overview'!A:M",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rowsToAppend },
        });
        existingTeams.push(...newlyAddedTeams);
      } catch (appendErr) {
        console.warn('Could not persist auto-populated teams to Master Sheet Team_Overview:', appendErr);
        existingTeams.push(...newlyAddedTeams);
      }
    }

    return existingTeams;
  };

  try {
    return await runFetch();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      console.warn('Team_Overview sheet not found, auto-provisioning master spreadsheet and retrying...');
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      return await runFetch();
    }
    throw err;
  }
}

export async function updateMasterTeamOverviewRow(teamOverview: SheetRowTeamOverview): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const runUpdate = async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: "'Team_Overview'!A:A",
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
        range: `'Team_Overview'!A${targetRowIndex}:M${targetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterId,
        range: "'Team_Overview'!A:M",
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    }
  };

  try {
    await runUpdate();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      await runUpdate();
    } else {
      throw err;
    }
  }
}

export async function appendGlobalActivityLog(item: GlobalActivityItem): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const tabName = await resolveGlobalActivityTabName(sheets, masterId);

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

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: masterId,
      range: `'${tabName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      const fallbackTab = await resolveGlobalActivityTabName(sheets, masterId);
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterId,
        range: `'${fallbackTab}'!A:F`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    } else {
      throw err;
    }
  }
}

export async function fetchGlobalActivityLog(limit = 50): Promise<GlobalActivityItem[]> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const tabName = await resolveGlobalActivityTabName(sheets, masterId);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${tabName}'!A2:F`,
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
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      console.warn('Global activity sheet not found, returning empty list:', err.message);
      return [];
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------
// User Registry Operations (Email Whitelist)
// -----------------------------------------------------------------------------

export async function fetchUsersList(): Promise<UserProfile[]> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const runFetch = async (): Promise<UserProfile[]> => {
    const meta = await resolveUserSheetMetadata(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A2:Z`,
    });

    const rows = response.data.values || [];
    return rows.map((r, i) => {
      const email = r[meta.emailColIndex] ? String(r[meta.emailColIndex]).trim().toLowerCase() : '';
      const name = r[meta.nameColIndex] ? String(r[meta.nameColIndex]).trim() : '';
      const rawRole = r[meta.roleColIndex] ? String(r[meta.roleColIndex]).trim().toLowerCase() : 'viewer';
      const roleMap: Record<string, UserRole> = {
        admin: 'admin',
        administrator: 'admin',
        superadmin: 'admin',
        team_head: 'team_head',
        head: 'team_head',
        team_lead: 'team_head',
        lead: 'team_head',
        member: 'team_head',
        viewer: 'viewer',
        reader: 'viewer',
      };
      const role: UserRole = roleMap[rawRole] || 'viewer';
      const teamId = r[meta.teamIdColIndex] ? String(r[meta.teamIdColIndex]).trim() : '';
      const rawActive = r[meta.activeColIndex] ? String(r[meta.activeColIndex]).trim().toUpperCase() : 'TRUE';
      const active = rawActive === 'TRUE' || rawActive === '1';
      const id = meta.idColIndex >= 0 && r[meta.idColIndex] ? String(r[meta.idColIndex]).trim() : `USR-${i + 1}`;

      return { id, name, email, role, teamId, active };
    }).filter(u => u.email);
  };

  try {
    return await runFetch();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      console.warn('Users sheet not found, auto-provisioning master spreadsheet and retrying...');
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      return await runFetch();
    }
    throw err;
  }
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const users = await fetchUsersList();
  const normalized = email.trim().toLowerCase();
  return users.find(u => u.email.toLowerCase() === normalized) || null;
}

export async function upsertUser(user: UserProfile): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();

  const runUpsert = async () => {
    const meta = await resolveUserSheetMetadata(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A:Z`,
    });

    const allRows = response.data.values || [];
    let targetRowIndex = -1;

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const rowEmail = row[meta.emailColIndex] ? String(row[meta.emailColIndex]).trim().toLowerCase() : '';
      if (rowEmail === user.email.toLowerCase()) {
        targetRowIndex = i + 1;
        break;
      }
    }

    const existingRow = targetRowIndex > 0 ? (allRows[targetRowIndex - 1] || []) : [];
    const maxCol = Math.max(
      meta.emailColIndex,
      meta.nameColIndex,
      meta.roleColIndex,
      meta.teamIdColIndex,
      meta.activeColIndex,
      meta.idColIndex,
      existingRow.length - 1,
      5
    );

    const rowValues = new Array(maxCol + 1).fill('');
    for (let c = 0; c < existingRow.length; c++) {
      rowValues[c] = existingRow[c] || '';
    }

    if (meta.idColIndex >= 0) rowValues[meta.idColIndex] = user.id;
    rowValues[meta.nameColIndex] = user.name;
    rowValues[meta.emailColIndex] = user.email.toLowerCase();
    rowValues[meta.roleColIndex] = user.role;
    rowValues[meta.teamIdColIndex] = user.teamId;
    rowValues[meta.activeColIndex] = user.active ? 'TRUE' : 'FALSE';

    if (targetRowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'${meta.tabName}'!A${targetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterId,
        range: `'${meta.tabName}'!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowValues] },
      });
    }
  };

  try {
    await runUpsert();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      console.warn('Users sheet not found during upsert, auto-provisioning and retrying...');
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      await runUpsert();
    } else {
      throw err;
    }
  }
}

/**
 * Removes a user from the authorized whitelist in Master Users sheet
 */
export async function deleteUser(email: string): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const normalized = email.trim().toLowerCase();

  const runDelete = async () => {
    const meta = await resolveUserSheetMetadata(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A:Z`,
    });

    const allRows = response.data.values || [];
    if (allRows.length <= 1) return;

    const remainingRows = allRows.slice(1).filter(r => {
      const rowEmail = r[meta.emailColIndex] ? String(r[meta.emailColIndex]).trim().toLowerCase() : '';
      return rowEmail !== normalized;
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A2:Z`,
    });

    if (remainingRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'${meta.tabName}'!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: remainingRows },
      });
    }
  };

  try {
    await runDelete();
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      await runDelete();
    } else {
      throw err;
    }
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
    const tabName = await resolveConfigTabName(sheets, masterId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${tabName}'!A2:E`,
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
  const tabName = await resolveConfigTabName(sheets, masterId);

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
      range: `'${tabName}'!A2:E5`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (err: any) {
    if (err?.message?.includes('Unable to parse range') || err?.message?.includes('not found')) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      const fallbackTab = await resolveConfigTabName(sheets, masterId);

      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'${fallbackTab}'!A1:E5`,
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

