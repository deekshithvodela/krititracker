"use strict";

// server/_lib/auth.ts
import { OAuth2Client } from "google-auth-library";
import * as jose from "jose";

// server/_lib/sheets.ts
import { google } from "googleapis";
var sheetsClient = null;
function sanitizePrivateKey(rawKey) {
  if (!rawKey)
    return "";
  let str = String(rawKey).trim();
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.private_key) {
        return sanitizePrivateKey(parsed.private_key);
      }
    } catch {
    }
  }
  str = str.replace(/\\r\\n/g, "\n").replace(/\\\\r\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\\\n/g, "\n").replace(/\r\n/g, "\n");
  const match = str.match(/(-----BEGIN[ A-Z_-]*PRIVATE KEY-----)([\s\S]*?)(-----END[ A-Z_-]*PRIVATE KEY-----)/);
  if (match) {
    const header = match[1];
    const body = match[2].replace(/[^A-Za-z0-9+/=]/g, "");
    const footer = match[3];
    const chunks = body.match(/.{1,64}/g) || [];
    return `${header}
${chunks.join("\n")}
${footer}
`;
  }
  try {
    const decoded = Buffer.from(str, "base64").toString("utf8");
    if (decoded.includes("PRIVATE KEY") || decoded.startsWith("{")) {
      return sanitizePrivateKey(decoded);
    }
  } catch {
  }
  return str;
}
function resolveServiceAccountCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
    try {
      let b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64.trim();
      if (b64.startsWith('"') && b64.endsWith('"') || b64.startsWith("'") && b64.endsWith("'")) {
        b64 = b64.slice(1, -1).trim();
      }
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email.trim(),
          privateKey: sanitizePrivateKey(parsed.private_key)
        };
      }
    } catch (e) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY_BASE64:", e);
    }
  }
  let rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || "";
  if (rawPrivateKey.startsWith("{") && rawPrivateKey.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawPrivateKey);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email.trim(),
          privateKey: sanitizePrivateKey(parsed.private_key)
        };
      }
    } catch {
    }
  }
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  if (clientEmail.startsWith('"') && clientEmail.endsWith('"') || clientEmail.startsWith("'") && clientEmail.endsWith("'")) {
    clientEmail = clientEmail.slice(1, -1).trim();
  }
  const cleanKey = sanitizePrivateKey(rawPrivateKey);
  if (!clientEmail || !cleanKey) {
    throw new Error("Google Service Account credentials missing or invalid. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) in environment variables.");
  }
  return {
    clientEmail,
    privateKey: cleanKey
  };
}
function getGoogleSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }
  const creds = resolveServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive"
    ]
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}
function getMasterSpreadsheetId() {
  const id = process.env.MASTER_SPREADSHEET_ID;
  if (!id) {
    throw new Error("MASTER_SPREADSHEET_ID environment variable is not defined.");
  }
  return id;
}
function getTeamSpreadsheetMap() {
  const envMap = process.env.TEAM_SPREADSHEET_IDS;
  if (!envMap) {
    const map = {};
    for (let i = 1; i <= 12; i++) {
      const pad = String(i).padStart(2, "0");
      const teamKey = `team-${pad}`;
      const envKey = `TEAM_${pad}_SPREADSHEET_ID`;
      if (process.env[envKey]) {
        map[teamKey] = process.env[envKey];
      }
    }
    return map;
  }
  try {
    return JSON.parse(envMap);
  } catch (err) {
    console.error("Failed to parse TEAM_SPREADSHEET_IDS JSON:", err);
    throw new Error("Invalid TEAM_SPREADSHEET_IDS JSON format.");
  }
}
async function getTeamSpreadsheetId(teamId) {
  const map = getTeamSpreadsheetMap();
  if (map[teamId]) {
    return map[teamId];
  }
  try {
    const teams = await fetchMasterTeamOverview();
    const found = teams.find((t) => t.id === teamId);
    if (found && found.spreadsheetId) {
      return found.spreadsheetId;
    }
  } catch (err) {
    console.warn(`Could not lookup dynamic team ${teamId} from master overview:`, err);
  }
  throw new Error(`Spreadsheet ID not found for team: ${teamId}.`);
}
async function ensureTeamSpreadsheetInitialized(spreadsheetId) {
  if (!spreadsheetId || spreadsheetId.trim() === "")
    return;
  const sheets = getGoogleSheetsClient();
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets || [];
    const sheetTitles = existingSheets.map((s) => s.properties?.title).filter(Boolean);
    const requests = [];
    if (!sheetTitles.includes("Tasks")) {
      requests.push({
        addSheet: {
          properties: {
            title: "Tasks",
            gridProperties: { rowCount: 100, columnCount: 14 }
          }
        }
      });
    }
    if (!sheetTitles.includes("Activity_Log")) {
      requests.push({
        addSheet: {
          properties: {
            title: "Activity_Log",
            gridProperties: { rowCount: 100, columnCount: 7 }
          }
        }
      });
    }
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }
    if (!sheetTitles.includes("Tasks")) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Tasks!A1:N1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            "Task ID",
            "Task Title",
            "Description",
            "Assigned To",
            "Priority",
            "Deadline",
            "Status",
            "Remarks",
            "Display Order",
            "Created At",
            "Updated At",
            "Completed At",
            "Category",
            "Is Mandatory"
          ]]
        }
      });
    }
    if (!sheetTitles.includes("Activity_Log")) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Activity_Log!A1:G1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            "Log ID",
            "Task ID",
            "Action",
            "Previous Value",
            "New Value",
            "Performed By",
            "Timestamp"
          ]]
        }
      });
    }
  } catch (err) {
    console.error(`Failed to auto-provision team spreadsheet ${spreadsheetId}:`, err.message);
    throw err;
  }
}
async function fetchTeamTasks(teamId) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A2:N"
    });
    const rows = response.data.values || [];
    const tasks = rows.map((row, index) => {
      return {
        id: row[0] ? String(row[0]).trim() : `TASK-${teamId}-${index + 1}`,
        title: row[1] ? String(row[1]).trim() : "",
        description: row[2] ? String(row[2]).trim() : "",
        assignedTo: row[3] ? String(row[3]).trim() : void 0,
        priority: row[4] ? String(row[4]).trim() : "Medium",
        deadline: row[5] ? String(row[5]).trim() : "",
        status: row[6] && String(row[6]).trim().toLowerCase() === "completed" ? "Completed" : "Pending",
        remarks: row[7] ? String(row[7]).trim() : "",
        displayOrder: row[8] ? parseInt(String(row[8]), 10) || index + 1 : index + 1,
        createdAt: row[9] ? String(row[9]).trim() : new Date().toISOString(),
        updatedAt: row[10] ? String(row[10]).trim() : new Date().toISOString(),
        completedAt: row[11] ? String(row[11]).trim() : void 0,
        category: row[12] ? String(row[12]).trim() : "General",
        isMandatory: row[13] ? String(row[13]).trim().toUpperCase() !== "FALSE" : true
      };
    }).filter((t) => t.id && t.title);
    return tasks.sort((a, b) => a.displayOrder - b.displayOrder);
  } catch (err) {
    if (err.message?.includes("Unable to parse range") || err.message?.includes("not found") || err.code === 400) {
      console.log(`Auto-provisioning blank spreadsheet for team ${teamId} (${spreadsheetId})...`);
      await ensureTeamSpreadsheetInitialized(spreadsheetId);
      return [];
    }
    throw err;
  }
}
async function findTaskRowIndex(teamId, taskId) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Tasks!A:A"
  });
  const rows = response.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && String(rows[i][0]).trim() === taskId) {
      return i + 1;
    }
  }
  return -1;
}
async function updateTaskRow(teamId, rowIndex, task) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  const values = [
    [
      task.id,
      task.title,
      task.description,
      task.assignedTo || "",
      task.priority,
      task.deadline,
      task.status,
      task.remarks || "",
      task.displayOrder,
      task.createdAt,
      task.updatedAt,
      task.completedAt || "",
      task.category || "General",
      task.isMandatory !== false ? "TRUE" : "FALSE"
    ]
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Tasks!A${rowIndex}:N${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
}
async function appendTaskRow(teamId, task) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  const values = [
    [
      task.id,
      task.title,
      task.description,
      task.assignedTo || "",
      task.priority,
      task.deadline,
      task.status,
      task.remarks || "",
      task.displayOrder,
      task.createdAt,
      task.updatedAt,
      task.completedAt || "",
      task.category || "General",
      task.isMandatory !== false ? "TRUE" : "FALSE"
    ]
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Tasks!A:N",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values }
  });
}
async function batchUpdateTaskRows(teamId, tasks) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Tasks!A2:N"
  });
  if (tasks.length === 0)
    return;
  const values = tasks.map((task) => [
    task.id,
    task.title,
    task.description,
    task.assignedTo || "",
    task.priority,
    task.deadline,
    task.status,
    task.remarks || "",
    task.displayOrder,
    task.createdAt,
    task.updatedAt,
    task.completedAt || "",
    task.category || "General",
    task.isMandatory !== false ? "TRUE" : "FALSE"
  ]);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Tasks!A2:N${tasks.length + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });
}
async function appendTeamActivityLog(teamId, item) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  const values = [
    [
      item.id,
      item.taskId,
      item.action,
      item.previousValue || "",
      item.newValue || "",
      item.performedBy,
      item.timestamp
    ]
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Activity_Log!A:G",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values }
  });
}
async function fetchTeamActivityLog(teamId, limit = 20) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = await getTeamSpreadsheetId(teamId);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Activity_Log!A2:G"
  });
  const rows = response.data.values || [];
  const items = rows.map((r, i) => ({
    id: r[0] || `ACT-${i}`,
    taskId: r[1] || "",
    action: r[2] || "TASK_EDITED",
    previousValue: r[3] || "",
    newValue: r[4] || "",
    performedBy: r[5] || "System",
    timestamp: r[6] || new Date().toISOString()
  }));
  return items.reverse().slice(0, limit);
}
var cachedMasterSheetTitles = null;
var cachedUserSheetMeta = null;
var cachedActivityTabName = null;
var cachedConfigTabName = null;
function invalidateMasterSheetCache() {
  cachedMasterSheetTitles = null;
  cachedUserSheetMeta = null;
  cachedActivityTabName = null;
  cachedConfigTabName = null;
}
async function ensureMasterSpreadsheetInitialized(spreadsheetId, customSheetsClient) {
  const sheets = customSheetsClient || getGoogleSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const sheetTitles = existingSheets.map((s) => s.properties?.title).filter(Boolean);
  const requests = [];
  const hasUserSheet = sheetTitles.includes("Users") || sheetTitles.includes("Authorized_Users");
  const hasTeamOverview = sheetTitles.includes("Team_Overview");
  const hasActivitySheet = sheetTitles.includes("Global_Activity") || sheetTitles.includes("Global_Activity_Log");
  const hasConfigSheet = sheetTitles.includes("Configuration") || sheetTitles.includes("App_Config");
  if (!hasUserSheet) {
    requests.push({
      addSheet: {
        properties: {
          title: "Users",
          gridProperties: { rowCount: 100, columnCount: 10 }
        }
      }
    });
  }
  if (!hasTeamOverview) {
    requests.push({
      addSheet: {
        properties: {
          title: "Team_Overview",
          gridProperties: { rowCount: 100, columnCount: 13 }
        }
      }
    });
  }
  if (!hasActivitySheet) {
    requests.push({
      addSheet: {
        properties: {
          title: "Global_Activity",
          gridProperties: { rowCount: 100, columnCount: 6 }
        }
      }
    });
  }
  if (!hasConfigSheet) {
    requests.push({
      addSheet: {
        properties: {
          title: "Configuration",
          gridProperties: { rowCount: 50, columnCount: 5 }
        }
      }
    });
  }
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }
  if (!hasUserSheet) {
    const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL || "").toLowerCase().trim();
    const userHeaders = ["User ID", "Name", "Email", "Role", "Team ID", "Active", "Added By", "Added At", "Last Login"];
    const initialValues = [userHeaders];
    if (initialAdmin) {
      initialValues.push([
        "USR-ADMIN-001",
        "System Administrator",
        initialAdmin,
        "admin",
        "all",
        "TRUE",
        "System",
        new Date().toISOString(),
        ""
      ]);
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Users'!A1:I",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: initialValues }
    });
  }
  if (!hasTeamOverview) {
    const teamHeaders = [
      "Team ID",
      "Team Name",
      "Spreadsheet ID",
      "Total Tasks",
      "Completed Tasks",
      "Pending Tasks",
      "Completion %",
      "Latest Pending Task",
      "Last Updated",
      "Status",
      "Department",
      "Head Email",
      "Description"
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Team_Overview'!A1:M1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [teamHeaders] }
    });
  }
  if (!hasActivitySheet) {
    const activityHeaders = ["Activity ID", "Team ID", "Task ID", "Action", "User", "Timestamp"];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Global_Activity'!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [activityHeaders] }
    });
  }
  if (!hasConfigSheet) {
    const configHeaders = ["Key", "Value (JSON)", "Description", "Last Updated", "Updated By"];
    const now = new Date().toISOString();
    const configRows = [
      configHeaders,
      ["dashboard_widgets", JSON.stringify(DEFAULT_APP_CONFIG.dashboardWidgets), "Widget toggles", now, "System"],
      ["visible_team_fields", JSON.stringify(DEFAULT_APP_CONFIG.visibleTeamFields), "Columns", now, "System"],
      ["categories", JSON.stringify(DEFAULT_APP_CONFIG.categories), "Categories", now, "System"],
      ["app_settings", JSON.stringify(DEFAULT_APP_CONFIG.appSettings), "Branding", now, "System"]
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Configuration'!A1:E5",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: configRows }
    });
  }
  const updatedTitles = [
    ...sheetTitles,
    ...!hasUserSheet ? ["Users"] : [],
    ...!hasTeamOverview ? ["Team_Overview"] : [],
    ...!hasActivitySheet ? ["Global_Activity"] : [],
    ...!hasConfigSheet ? ["Configuration"] : []
  ];
  cachedMasterSheetTitles = updatedTitles;
  return updatedTitles;
}
async function resolveUserSheetMetadata(sheets, masterId) {
  if (cachedUserSheetMeta) {
    return cachedUserSheetMeta;
  }
  let sheetTitles = cachedMasterSheetTitles;
  if (!sheetTitles) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
      sheetTitles = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
      cachedMasterSheetTitles = sheetTitles;
    } catch (err) {
      console.warn("Could not read master spreadsheet metadata, attempting auto-provisioning:", err.message);
      sheetTitles = await ensureMasterSpreadsheetInitialized(masterId, sheets);
    }
  }
  let tabName = null;
  if (sheetTitles.includes("Users")) {
    tabName = "Users";
  } else if (sheetTitles.includes("Authorized_Users")) {
    tabName = "Authorized_Users";
  }
  if (!tabName) {
    sheetTitles = await ensureMasterSpreadsheetInitialized(masterId, sheets);
    tabName = "Users";
  }
  let headers = [];
  try {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${tabName}'!1:1`
    });
    headers = (headerRes.data.values?.[0] || []).map((h) => String(h).trim().toLowerCase());
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      sheetTitles = await ensureMasterSpreadsheetInitialized(masterId, sheets);
      tabName = "Users";
      const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: masterId,
        range: `'${tabName}'!1:1`
      });
      headers = (headerRes.data.values?.[0] || []).map((h) => String(h).trim().toLowerCase());
    } else {
      throw err;
    }
  }
  const isAuthorizedUsersTab = tabName === "Authorized_Users";
  const findCol = (predicate, fallback) => {
    const idx = headers.findIndex(predicate);
    return idx >= 0 ? idx : fallback;
  };
  const emailColIndex = findCol((h) => h.includes("email"), isAuthorizedUsersTab ? 0 : 2);
  const nameColIndex = findCol((h) => h.includes("name"), 1);
  const roleColIndex = findCol((h) => h.includes("role"), isAuthorizedUsersTab ? 2 : 3);
  const teamIdColIndex = findCol((h) => h.includes("team"), isAuthorizedUsersTab ? 3 : 4);
  const activeColIndex = findCol((h) => h.includes("active") || h.includes("status"), isAuthorizedUsersTab ? 4 : 5);
  const idColIndex = headers.findIndex((h) => (h.includes("id") || h.includes("user")) && !h.includes("team"));
  cachedUserSheetMeta = {
    tabName,
    emailColIndex,
    nameColIndex,
    roleColIndex,
    teamIdColIndex,
    activeColIndex,
    idColIndex: idColIndex >= 0 ? idColIndex : isAuthorizedUsersTab ? -1 : 0
  };
  return cachedUserSheetMeta;
}
async function resolveGlobalActivityTabName(sheets, masterId) {
  if (cachedActivityTabName)
    return cachedActivityTabName;
  let sheetTitles = cachedMasterSheetTitles;
  if (!sheetTitles) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
    sheetTitles = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
    cachedMasterSheetTitles = sheetTitles;
  }
  if (sheetTitles.includes("Global_Activity")) {
    cachedActivityTabName = "Global_Activity";
  } else if (sheetTitles.includes("Global_Activity_Log")) {
    cachedActivityTabName = "Global_Activity_Log";
  } else {
    await ensureMasterSpreadsheetInitialized(masterId, sheets);
    cachedActivityTabName = "Global_Activity";
  }
  return cachedActivityTabName;
}
async function resolveConfigTabName(sheets, masterId) {
  if (cachedConfigTabName)
    return cachedConfigTabName;
  let sheetTitles = cachedMasterSheetTitles;
  if (!sheetTitles) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
    sheetTitles = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
    cachedMasterSheetTitles = sheetTitles;
  }
  if (sheetTitles.includes("Configuration")) {
    cachedConfigTabName = "Configuration";
  } else if (sheetTitles.includes("App_Config")) {
    cachedConfigTabName = "App_Config";
  } else {
    await ensureMasterSpreadsheetInitialized(masterId, sheets);
    cachedConfigTabName = "Configuration";
  }
  return cachedConfigTabName;
}
async function fetchMasterTeamOverview() {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const runFetch = async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: "'Team_Overview'!A2:M"
    });
    const rows = response.data.values || [];
    return rows.map((r) => {
      const rawStatus = r[9] ? String(r[9]).trim() : "Active";
      const status = ["Active", "Deactivated", "Archived"].includes(rawStatus) ? rawStatus : "Active";
      return {
        id: r[0] ? String(r[0]).trim() : "",
        name: r[1] ? String(r[1]).trim() : "",
        spreadsheetId: r[2] ? String(r[2]).trim() : "",
        totalTasks: parseInt(String(r[3] || "0"), 10),
        completedTasks: parseInt(String(r[4] || "0"), 10),
        pendingTasks: parseInt(String(r[5] || "0"), 10),
        completionPercentage: parseInt(String(r[6] || "0"), 10),
        latestPendingTask: r[7] ? String(r[7]).trim() : "No tasks assigned yet.",
        lastUpdated: r[8] ? String(r[8]).trim() : new Date().toISOString(),
        status,
        department: r[10] ? String(r[10]).trim() : void 0,
        headEmail: r[11] ? String(r[11]).trim() : void 0,
        description: r[12] ? String(r[12]).trim() : void 0
      };
    }).filter((t) => t.id);
  };
  try {
    return await runFetch();
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      console.warn("Team_Overview sheet not found, auto-provisioning master spreadsheet and retrying...");
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      return await runFetch();
    }
    throw err;
  }
}
async function updateMasterTeamOverviewRow(teamOverview) {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const runUpdate = async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: "'Team_Overview'!A:A"
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
        teamOverview.status || "Active",
        teamOverview.department || "",
        teamOverview.headEmail || "",
        teamOverview.description || ""
      ]
    ];
    if (targetRowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'Team_Overview'!A${targetRowIndex}:M${targetRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterId,
        range: "'Team_Overview'!A:M",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values }
      });
    }
  };
  try {
    await runUpdate();
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      await runUpdate();
    } else {
      throw err;
    }
  }
}
async function appendGlobalActivityLog(item) {
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
      item.timestamp
    ]
  ];
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: masterId,
      range: `'${tabName}'!A:F`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values }
    });
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      const fallbackTab = await resolveGlobalActivityTabName(sheets, masterId);
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterId,
        range: `'${fallbackTab}'!A:F`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values }
      });
    } else {
      throw err;
    }
  }
}
async function fetchGlobalActivityLog(limit = 50) {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const tabName = await resolveGlobalActivityTabName(sheets, masterId);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${tabName}'!A2:F`
    });
    const rows = response.data.values || [];
    const items = rows.map((r, i) => ({
      id: r[0] || `GACT-${i}`,
      teamId: r[1] || "",
      taskId: r[2] || "",
      action: r[3] || "",
      user: r[4] || "System",
      timestamp: r[5] || new Date().toISOString()
    }));
    return items.reverse().slice(0, limit);
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      console.warn("Global activity sheet not found, returning empty list:", err.message);
      return [];
    }
    throw err;
  }
}
async function fetchUsersList() {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const runFetch = async () => {
    const meta = await resolveUserSheetMetadata(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A2:Z`
    });
    const rows = response.data.values || [];
    return rows.map((r, i) => {
      const email = r[meta.emailColIndex] ? String(r[meta.emailColIndex]).trim().toLowerCase() : "";
      const name = r[meta.nameColIndex] ? String(r[meta.nameColIndex]).trim() : "";
      const rawRole = r[meta.roleColIndex] ? String(r[meta.roleColIndex]).trim().toLowerCase() : "viewer";
      const roleMap = {
        admin: "admin",
        administrator: "admin",
        superadmin: "admin",
        team_head: "team_head",
        head: "team_head",
        team_lead: "team_head",
        lead: "team_head",
        member: "team_head",
        viewer: "viewer",
        reader: "viewer"
      };
      const role = roleMap[rawRole] || "viewer";
      const teamId = r[meta.teamIdColIndex] ? String(r[meta.teamIdColIndex]).trim() : "";
      const rawActive = r[meta.activeColIndex] ? String(r[meta.activeColIndex]).trim().toUpperCase() : "TRUE";
      const active = rawActive === "TRUE" || rawActive === "1";
      const id = meta.idColIndex >= 0 && r[meta.idColIndex] ? String(r[meta.idColIndex]).trim() : `USR-${i + 1}`;
      return { id, name, email, role, teamId, active };
    }).filter((u) => u.email);
  };
  try {
    return await runFetch();
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      console.warn("Users sheet not found, auto-provisioning master spreadsheet and retrying...");
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      return await runFetch();
    }
    throw err;
  }
}
async function findUserByEmail(email) {
  const users = await fetchUsersList();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}
async function upsertUser(user) {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const runUpsert = async () => {
    const meta = await resolveUserSheetMetadata(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A:Z`
    });
    const allRows = response.data.values || [];
    let targetRowIndex = -1;
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const rowEmail = row[meta.emailColIndex] ? String(row[meta.emailColIndex]).trim().toLowerCase() : "";
      if (rowEmail === user.email.toLowerCase()) {
        targetRowIndex = i + 1;
        break;
      }
    }
    const existingRow = targetRowIndex > 0 ? allRows[targetRowIndex - 1] || [] : [];
    const maxCol = Math.max(meta.emailColIndex, meta.nameColIndex, meta.roleColIndex, meta.teamIdColIndex, meta.activeColIndex, meta.idColIndex, existingRow.length - 1, 5);
    const rowValues = new Array(maxCol + 1).fill("");
    for (let c = 0; c < existingRow.length; c++) {
      rowValues[c] = existingRow[c] || "";
    }
    if (meta.idColIndex >= 0)
      rowValues[meta.idColIndex] = user.id;
    rowValues[meta.nameColIndex] = user.name;
    rowValues[meta.emailColIndex] = user.email.toLowerCase();
    rowValues[meta.roleColIndex] = user.role;
    rowValues[meta.teamIdColIndex] = user.teamId;
    rowValues[meta.activeColIndex] = user.active ? "TRUE" : "FALSE";
    if (targetRowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'${meta.tabName}'!A${targetRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowValues] }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterId,
        range: `'${meta.tabName}'!A:A`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowValues] }
      });
    }
  };
  try {
    await runUpsert();
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      console.warn("Users sheet not found during upsert, auto-provisioning and retrying...");
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      await runUpsert();
    } else {
      throw err;
    }
  }
}
async function deleteUser(email) {
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const normalized = email.trim().toLowerCase();
  const runDelete = async () => {
    const meta = await resolveUserSheetMetadata(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A:Z`
    });
    const allRows = response.data.values || [];
    if (allRows.length <= 1)
      return;
    const remainingRows = allRows.slice(1).filter((r) => {
      const rowEmail = r[meta.emailColIndex] ? String(r[meta.emailColIndex]).trim().toLowerCase() : "";
      return rowEmail !== normalized;
    });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: masterId,
      range: `'${meta.tabName}'!A2:Z`
    });
    if (remainingRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'${meta.tabName}'!A2`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: remainingRows }
      });
    }
  };
  try {
    await runDelete();
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      await runDelete();
    } else {
      throw err;
    }
  }
}
var DEFAULT_APP_CONFIG = {
  dashboardWidgets: {
    showKpiMetrics: true,
    showTeamOverviewTable: true,
    showGlobalActivityFeed: true,
    showOverdueAlerts: true,
    showSyncHealthStatus: true
  },
  visibleTeamFields: ["teamName", "progress", "tasksCount", "latestPending", "lastUpdated", "status"],
  categories: ["Core Deliverables", "Quality Assurance", "Deployment & Operations", "Documentation", "General"],
  appSettings: {
    companyName: "Company Team Progress System",
    announcementBanner: "",
    allowTeamHeadReopen: true,
    requireRemarksOnCompletion: false
  }
};
async function fetchAppConfig() {
  try {
    const sheets = getGoogleSheetsClient();
    const masterId = getMasterSpreadsheetId();
    const tabName = await resolveConfigTabName(sheets, masterId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterId,
      range: `'${tabName}'!A2:E`
    });
    const rows = response.data.values || [];
    if (rows.length === 0) {
      return DEFAULT_APP_CONFIG;
    }
    const config = { ...DEFAULT_APP_CONFIG };
    let latestTimestamp = "";
    let lastUser = "";
    for (const row of rows) {
      const key = row[0] ? String(row[0]).trim() : "";
      const valStr = row[1] ? String(row[1]).trim() : "";
      const updated = row[3] ? String(row[3]).trim() : "";
      const user = row[4] ? String(row[4]).trim() : "";
      if (updated && updated > latestTimestamp) {
        latestTimestamp = updated;
        lastUser = user;
      }
      if (!key || !valStr)
        continue;
      try {
        const parsed = JSON.parse(valStr);
        if (key === "dashboard_widgets") {
          config.dashboardWidgets = { ...config.dashboardWidgets, ...parsed };
        } else if (key === "visible_team_fields") {
          config.visibleTeamFields = Array.isArray(parsed) ? parsed : config.visibleTeamFields;
        } else if (key === "categories") {
          config.categories = Array.isArray(parsed) ? parsed : config.categories;
        } else if (key === "app_settings") {
          config.appSettings = { ...config.appSettings, ...parsed };
        }
      } catch (err) {
        console.warn(`Failed to parse config key ${key}:`, err);
      }
    }
    config.lastUpdated = latestTimestamp || new Date().toISOString();
    config.updatedBy = lastUser || "System";
    return config;
  } catch (err) {
    console.warn("Configuration sheet not found or error reading, using defaults:", err);
    return DEFAULT_APP_CONFIG;
  }
}
async function saveAppConfig(updatedConfig, userEmail) {
  const current = await fetchAppConfig();
  const merged = {
    ...current,
    ...updatedConfig,
    dashboardWidgets: {
      ...current.dashboardWidgets,
      ...updatedConfig.dashboardWidgets || {}
    },
    appSettings: {
      ...current.appSettings,
      ...updatedConfig.appSettings || {}
    },
    lastUpdated: new Date().toISOString(),
    updatedBy: userEmail
  };
  const sheets = getGoogleSheetsClient();
  const masterId = getMasterSpreadsheetId();
  const tabName = await resolveConfigTabName(sheets, masterId);
  const entries = [
    {
      key: "dashboard_widgets",
      value: JSON.stringify(merged.dashboardWidgets),
      description: "Visibility toggles for dashboard KPI, table, feed, alerts, and sync widgets"
    },
    {
      key: "visible_team_fields",
      value: JSON.stringify(merged.visibleTeamFields),
      description: "Columns displayed on the team overview table"
    },
    {
      key: "categories",
      value: JSON.stringify(merged.categories),
      description: "Standard checklist categories and sections"
    },
    {
      key: "app_settings",
      value: JSON.stringify(merged.appSettings),
      description: "Application branding, reopen rules, and company announcements"
    }
  ];
  const values = entries.map((e) => [
    e.key,
    e.value,
    e.description,
    merged.lastUpdated,
    userEmail
  ]);
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterId,
      range: `'${tabName}'!A2:E5`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });
  } catch (err) {
    if (err?.message?.includes("Unable to parse range") || err?.message?.includes("not found")) {
      invalidateMasterSheetCache();
      await ensureMasterSpreadsheetInitialized(masterId);
      const fallbackTab = await resolveConfigTabName(sheets, masterId);
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterId,
        range: `'${fallbackTab}'!A1:E5`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            ["Key", "Value (JSON)", "Description", "Last Updated", "Updated By"],
            ...values
          ]
        }
      });
    } else {
      throw err;
    }
  }
  return merged;
}

// server/_lib/csrf.ts
import crypto from "crypto";
var CSRF_HEADER_NAME = "x-csrf-token";
var CSRF_COOKIE_NAME = "kriti_csrf_token";
function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}
function validateCsrfToken(req) {
  const method = (req.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toLowerCase()];
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  if (!headerToken || !cookieToken) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader)
    return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("=").trim());
    }
  });
  return list;
}

// server/_lib/auth.ts
var SESSION_COOKIE_NAME = "kriti_session";
var SESSION_EXPIRY = "7d";
var oauthClient = null;
function getOAuthClient() {
  if (!oauthClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID environment variable is missing.");
    }
    oauthClient = new OAuth2Client(clientId);
  }
  return oauthClient;
}
function getJwtSecret() {
  const secret = process.env.SESSION_SECRET || "kriti-tracker-super-secure-default-secret-32-chars-long";
  return new TextEncoder().encode(secret);
}
async function verifyGoogleToken(idToken) {
  const client = getOAuthClient();
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google credential: email not found in token payload.");
  }
  if (!payload.email_verified) {
    throw new Error("Access Denied: Google email address is not verified by Google.");
  }
  const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new Error(`Access Denied: Untrusted token issuer: ${payload.iss}`);
  }
  return {
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split("@")[0]
  };
}
async function resolveAuthorizedUser(email, name) {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await findUserByEmail(normalizedEmail);
  if (!user) {
    const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL || "").toLowerCase().trim();
    if (initialAdmin && normalizedEmail === initialAdmin) {
      const allUsers = await fetchUsersList();
      if (allUsers.length === 0 || !allUsers.some((u) => u.email.toLowerCase() === initialAdmin)) {
        user = {
          id: `USR-ADMIN-${Date.now().toString().slice(-4)}`,
          name: name || "System Administrator",
          email: normalizedEmail,
          role: "admin",
          teamId: "all",
          active: true
        };
        await upsertUser(user);
      }
    }
  }
  if (!user) {
    throw new Error(`Access Denied: Your email (${normalizedEmail}) has not been authorised. Please contact your system administrator to be added to the whitelist.`);
  }
  if (!user.active) {
    throw new Error(`Access Denied: Your account (${normalizedEmail}) has been deactivated. Please contact your administrator.`);
  }
  return user;
}
async function createSessionToken(user) {
  const secret = getJwtSecret();
  const token = await new jose.SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(SESSION_EXPIRY).sign(secret);
  return token;
}
async function verifySessionToken(token) {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return {
    id: String(payload.id),
    name: String(payload.name),
    email: String(payload.email).toLowerCase().trim(),
    role: payload.role,
    teamId: String(payload.teamId)
  };
}
async function authenticateSession(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    throw new Error("Unauthorized: No active session found.");
  }
  let sessionContext;
  try {
    sessionContext = await verifySessionToken(token);
  } catch (err) {
    throw new Error("Unauthorized: Session expired or invalid.");
  }
  const liveUser = await findUserByEmail(sessionContext.email);
  if (!liveUser) {
    throw new Error("Access Revoked: Your email is no longer on the authorised user whitelist.");
  }
  if (!liveUser.active) {
    throw new Error("Access Revoked: Your account has been deactivated by an administrator.");
  }
  return {
    id: liveUser.id,
    name: liveUser.name,
    email: liveUser.email,
    role: liveUser.role,
    teamId: liveUser.teamId
  };
}
function enforceAdmin(user) {
  if (user.role !== "admin") {
    throw new Error("Forbidden: Super Administrator access required.");
  }
}
function enforceTeamAccess(user, targetTeamId) {
  if (user.role === "admin") {
    return;
  }
  if (user.teamId !== targetTeamId) {
    throw new Error(`Forbidden: You are not authorized to access ${targetTeamId}.`);
  }
}
function enforceWriteAccess(user, targetTeamId) {
  if (user.role === "viewer") {
    throw new Error("Forbidden: Read-only accounts cannot modify checklist data.");
  }
  enforceTeamAccess(user, targetTeamId);
}
function createAuthCookies(sessionToken, csrfToken) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60;
  const sessionCookie = `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`;
  const csrfCookie = `kriti_csrf_token=${csrfToken}; Path=/; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`;
  return [sessionCookie, csrfCookie];
}
function createLogoutCookies() {
  const isProd = process.env.NODE_ENV === "production";
  return [
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`,
    `kriti_csrf_token=; Path=/; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`
  ];
}

// server/_handlers/auth/google.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }
  try {
    const { credential } = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!credential) {
      return res.status(400).json({ success: false, error: "Missing Google ID credential." });
    }
    const tokenPayload = await verifyGoogleToken(credential);
    const user = await resolveAuthorizedUser(tokenPayload.email, tokenPayload.name);
    const sessionToken = await createSessionToken(user);
    const csrfToken = generateCsrfToken();
    const cookies = createAuthCookies(sessionToken, csrfToken);
    res.setHeader("Set-Cookie", cookies);
    return res.status(200).json({
      success: true,
      data: {
        user,
        csrfToken
      }
    });
  } catch (err) {
    console.error("Authentication error:", err.message);
    let errorMsg = err.message || "Authentication failed.";
    if (errorMsg.includes("DECODER routines::unsupported")) {
      errorMsg = "Google Service Account Private Key format error: Ensure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is set in Vercel without surrounding quotes.";
    }
    const status = err.message?.includes("Access Denied") ? 403 : 401;
    return res.status(status).json({
      success: false,
      error: errorMsg
    });
  }
}

// server/_handlers/auth/dev-login.ts
var DEV_PERSONAS = {
  admin: {
    id: "USR-DEV-ADMIN-001",
    name: "Dr. Robert Hayes (Congress Director)",
    email: "admin.qa@company.com",
    role: "admin",
    teamId: "all",
    active: true
  },
  team_head_eng: {
    id: "USR-DEV-ENG-002",
    name: "Dr. Alex Rivera (Scientific Head)",
    email: "lead.eng@company.com",
    role: "team_head",
    teamId: "team-scientific",
    active: true
  },
  team_head_ops: {
    id: "USR-DEV-OPS-003",
    name: "Dr. Jordan Lee (CME Director)",
    email: "lead.ops@company.com",
    role: "team_head",
    teamId: "team-cme-workshops",
    active: true
  },
  viewer: {
    id: "USR-DEV-VIEWER-004",
    name: "Dr. Sam Morgan (Ethics Officer)",
    email: "auditor.qa@company.com",
    role: "viewer",
    teamId: "all",
    active: true
  }
};
async function handler2(req, res) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return res.status(404).json({ success: false, error: "Endpoint not found." });
  }
  const isDevAllowed = process.env.ENABLE_DEV_LOGIN === "true" || process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!isDevAllowed) {
    return res.status(403).json({ success: false, error: "Dev login bypass is disabled." });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const personaKey = body.persona || "admin";
    const persona = DEV_PERSONAS[personaKey];
    const user = persona || {
      id: body.id || `USR-DEV-${Date.now().toString().slice(-4)}`,
      name: body.name || "Custom Dev User",
      email: (body.email || "dev.user@company.com").toLowerCase().trim(),
      role: body.role || "admin",
      teamId: body.teamId || "all",
      active: true
    };
    const sessionToken = await createSessionToken(user);
    const csrfToken = generateCsrfToken();
    const cookies = createAuthCookies(sessionToken, csrfToken);
    res.setHeader("Set-Cookie", cookies);
    return res.status(200).json({
      success: true,
      data: {
        user,
        csrfToken
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Dev login bypass failed."
    });
  }
}

// server/_handlers/auth/session.ts
async function handler3(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    const cookies = parseCookies(req.headers.cookie || "");
    let csrfToken = cookies[CSRF_COOKIE_NAME];
    if (!csrfToken) {
      csrfToken = generateCsrfToken();
      const isProd = process.env.NODE_ENV === "production";
      res.setHeader("Set-Cookie", `kriti_csrf_token=${csrfToken}; Path=/; SameSite=Lax; Max-Age=604800${isProd ? "; Secure" : ""}`);
    }
    return res.status(200).json({
      success: true,
      data: {
        user,
        csrfToken
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message || "Session not found or expired."
    });
  }
}

// server/_handlers/auth/logout.ts
async function handler4(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }
  res.setHeader("Set-Cookie", createLogoutCookies());
  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
}

// server/_handlers/admin/dashboard.ts
async function handler5(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    const teams = await fetchMasterTeamOverview();
    const recentActivity = await fetchGlobalActivityLog(20);
    const activeTeams = teams.filter((t) => t.status !== "Archived");
    const totalTeams = activeTeams.length;
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let teamsWithPendingTasks = 0;
    let teamsWithAllTasksCompleted = 0;
    activeTeams.forEach((team) => {
      totalTasks += team.totalTasks;
      completedTasks += team.completedTasks;
      pendingTasks += team.pendingTasks;
      if (team.totalTasks > 0 && team.pendingTasks === 0) {
        teamsWithAllTasksCompleted++;
      }
      if (team.pendingTasks > 0) {
        teamsWithPendingTasks++;
      }
    });
    const overallCompletionPercentage = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
    const metrics = {
      totalTeams,
      teamsWithPendingTasks,
      teamsWithAllTasksCompleted,
      totalTasks,
      completedTasks,
      pendingTasks,
      overallCompletionPercentage,
      teamsWithOverdueTasks: 0
    };
    return res.status(200).json({
      success: true,
      data: {
        metrics,
        teams,
        recentActivity
      }
    });
  } catch (err) {
    console.error("Error loading admin dashboard:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to load dashboard data."
    });
  }
}

// server/_handlers/admin/sync-status.ts
async function handler6(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    const startTime = Date.now();
    const sheets = getGoogleSheetsClient();
    const masterId = getMasterSpreadsheetId();
    await sheets.spreadsheets.get({ spreadsheetId: masterId, fields: "spreadsheetId,properties.title" });
    const latencyMs = Date.now() - startTime;
    const teamMap = getTeamSpreadsheetMap();
    const teams = await fetchMasterTeamOverview();
    return res.status(200).json({
      success: true,
      data: {
        status: "CONNECTED",
        latencyMs,
        masterSpreadsheetId: masterId,
        configuredTeamSheets: Object.keys(teamMap).length,
        trackedTeamsInMaster: teams.length,
        lastChecked: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Error checking sync status:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Sync status check failed."
    });
  }
}

// server/_lib/validation.ts
function parseJsonBody(req) {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        throw new Error("Invalid JSON payload in request body.");
      }
    }
    return req.body;
  }
  return {};
}
function validateTaskInput(body) {
  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    throw new Error("Task title is required.");
  }
  const validPriorities = ["Low", "Medium", "High", "Critical"];
  const priority = validPriorities.includes(body.priority) ? body.priority : "Medium";
  return {
    title: body.title.trim(),
    description: typeof body.description === "string" ? body.description.trim() : "",
    priority,
    deadline: typeof body.deadline === "string" ? body.deadline.trim() : "",
    assignedTo: typeof body.assignedTo === "string" ? body.assignedTo.trim() : void 0,
    category: typeof body.category === "string" && body.category.trim() ? body.category.trim() : "General",
    isMandatory: body.isMandatory !== false,
    remarks: typeof body.remarks === "string" ? body.remarks.trim() : "",
    status: body.status === "Completed" ? "Completed" : "Pending"
  };
}
function validateStatusUpdate(body) {
  if (!body.status || !["Pending", "Completed"].includes(body.status)) {
    throw new Error('Invalid status. Must be "Pending" or "Completed".');
  }
  return {
    status: body.status,
    remarks: typeof body.remarks === "string" ? body.remarks.trim() : void 0
  };
}
function validateUserInput(body) {
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    throw new Error("A valid email address is required.");
  }
  const validRoles = ["admin", "team_head", "viewer"];
  const role = validRoles.includes(body.role) ? body.role : "team_head";
  return {
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : body.email.split("@")[0],
    email: body.email.trim().toLowerCase(),
    role,
    teamId: typeof body.teamId === "string" && body.teamId.trim() ? body.teamId.trim() : "team-01",
    active: body.active !== false
  };
}
function validateTeamInput(body) {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    throw new Error("Team name is required.");
  }
  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") : `team-${Date.now().toString().slice(-4)}`;
  const validStatuses = ["Active", "Deactivated", "Archived"];
  const status = validStatuses.includes(body.status) ? body.status : "Active";
  return {
    id,
    name: body.name.trim(),
    spreadsheetId: typeof body.spreadsheetId === "string" ? body.spreadsheetId.trim() : "",
    department: typeof body.department === "string" ? body.department.trim() : "General",
    headEmail: typeof body.headEmail === "string" ? body.headEmail.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    status
  };
}

// server/_lib/drive.ts
import { google as google2 } from "googleapis";
var driveClient = null;
function getGoogleDriveClient() {
  if (driveClient) {
    return driveClient;
  }
  const creds = resolveServiceAccountCredentials();
  const auth = new google2.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  });
  driveClient = google2.drive({ version: "v3", auth });
  return driveClient;
}
function getDriveFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  return folderId ? folderId.trim() : null;
}
async function shareDriveFolderWithUser(folderId, email, role = "writer") {
  try {
    const drive = getGoogleDriveClient();
    const cleanEmail = email.toLowerCase().trim();
    const listRes = await drive.permissions.list({
      fileId: folderId,
      fields: "permissions(id, role, emailAddress)"
    });
    const existing = (listRes.data.permissions || []).find((p) => p.emailAddress?.toLowerCase() === cleanEmail);
    if (existing && existing.id) {
      if (existing.role !== role) {
        await drive.permissions.update({
          fileId: folderId,
          permissionId: existing.id,
          requestBody: { role }
        });
        return { id: existing.id, role };
      }
      return { id: existing.id, role: existing.role || role };
    }
    const createRes = await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: false,
      requestBody: {
        type: "user",
        role,
        emailAddress: cleanEmail
      },
      fields: "id, role"
    });
    return {
      id: createRes.data.id,
      role: createRes.data.role || role
    };
  } catch (err) {
    console.error(`Failed to share Google Drive folder ${folderId} with ${email}:`, err.message);
    throw err;
  }
}
async function removeDriveFolderUser(folderId, email) {
  try {
    const drive = getGoogleDriveClient();
    const cleanEmail = email.toLowerCase().trim();
    const listRes = await drive.permissions.list({
      fileId: folderId,
      fields: "permissions(id, emailAddress)"
    });
    const matching = (listRes.data.permissions || []).find((p) => p.emailAddress?.toLowerCase() === cleanEmail);
    if (matching && matching.id) {
      await drive.permissions.delete({
        fileId: folderId,
        permissionId: matching.id
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to revoke Drive folder permission for ${email}:`, err.message);
    throw err;
  }
}

// server/_handlers/admin/users.ts
async function handler7(req, res) {
  const method = req.method?.toUpperCase();
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method || "")) {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    if (method === "GET") {
      const users = await fetchUsersList();
      return res.status(200).json({
        success: true,
        data: users
      });
    }
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const body = parseJsonBody(req);
    if (method === "DELETE") {
      const targetEmail = String(body.email || req.query.email || "").toLowerCase().trim();
      if (!targetEmail) {
        return res.status(400).json({ success: false, error: "Email parameter is required to revoke user." });
      }
      if (user.email.toLowerCase() === targetEmail) {
        return res.status(400).json({ success: false, error: "You cannot revoke or delete your own administrator account." });
      }
      await deleteUser(targetEmail);
      const driveFolderId2 = getDriveFolderId();
      if (driveFolderId2) {
        try {
          await removeDriveFolderUser(driveFolderId2, targetEmail);
        } catch (driveErr) {
          console.warn(`Drive folder revocation warning for ${targetEmail}:`, driveErr.message);
        }
      }
      await appendGlobalActivityLog({
        id: `act-usr-del-${Date.now()}`,
        teamId: "MASTER",
        taskId: "USER_REVOKED",
        action: `Revoked whitelist authorization for ${targetEmail}`,
        user: user.email,
        timestamp: new Date().toISOString()
      });
      return res.status(200).json({
        success: true,
        message: `User ${targetEmail} authorization has been revoked.`
      });
    }
    const validated = validateUserInput(body);
    if (user.email.toLowerCase() === validated.email) {
      if (validated.role !== "admin" || !validated.active) {
        return res.status(400).json({
          success: false,
          error: "You cannot remove your own administrator privileges or deactivate your own account."
        });
      }
    }
    const existingUsers = await fetchUsersList();
    const existing = existingUsers.find((u) => u.email.toLowerCase() === validated.email);
    const userProfile = {
      id: existing ? existing.id : `USR-${Date.now().toString().slice(-4)}`,
      name: validated.name,
      email: validated.email,
      role: validated.role,
      teamId: validated.teamId,
      active: validated.active
    };
    await upsertUser(userProfile);
    const driveFolderId = getDriveFolderId();
    if (driveFolderId) {
      try {
        if (userProfile.active) {
          const driveRole = userProfile.role === "admin" || userProfile.role === "team_head" ? "writer" : "reader";
          await shareDriveFolderWithUser(driveFolderId, userProfile.email, driveRole);
        } else {
          await removeDriveFolderUser(driveFolderId, userProfile.email);
        }
      } catch (driveErr) {
        console.warn(`Drive folder permission sync warning for ${userProfile.email}:`, driveErr.message);
      }
    }
    await appendGlobalActivityLog({
      id: `act-usr-${Date.now()}`,
      teamId: userProfile.teamId,
      taskId: "USER_MGMT",
      action: existing ? `Updated user ${userProfile.email} (Role: ${userProfile.role}, Active: ${userProfile.active})` : `Whitelisted new user ${userProfile.email} (${userProfile.role}, Team: ${userProfile.teamId})`,
      user: user.email,
      timestamp: new Date().toISOString()
    });
    return res.status(200).json({
      success: true,
      data: userProfile
    });
  } catch (err) {
    console.error("Error in user management:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "User operation failed."
    });
  }
}

// server/_handlers/admin/teams.ts
async function handler8(req, res) {
  const method = req.method?.toUpperCase();
  if (!["POST", "PATCH"].includes(method || "")) {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST or PATCH." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const body = parseJsonBody(req);
    const validated = validateTeamInput(body);
    const existingTeams = await fetchMasterTeamOverview();
    const existing = existingTeams.find((t) => t.id === validated.id);
    if (method === "POST" && existing) {
      return res.status(409).json({ success: false, error: `Team ID "${validated.id}" already exists.` });
    }
    const now = new Date().toISOString();
    const rowData = {
      teamId: validated.id,
      teamName: validated.name,
      spreadsheetId: validated.spreadsheetId || (existing?.spreadsheetId || ""),
      totalTasks: existing ? existing.totalTasks : 0,
      completedTasks: existing ? existing.completedTasks : 0,
      pendingTasks: existing ? existing.pendingTasks : 0,
      completionPercentage: existing ? existing.completionPercentage : 0,
      latestPendingTask: existing ? existing.latestPendingTask : "No tasks assigned yet.",
      lastUpdated: now,
      status: validated.status,
      department: validated.department || "",
      headEmail: validated.headEmail || "",
      description: validated.description || ""
    };
    await updateMasterTeamOverviewRow(rowData);
    if (rowData.spreadsheetId) {
      try {
        await ensureTeamSpreadsheetInitialized(rowData.spreadsheetId);
      } catch (sheetErr) {
        console.warn(`Proactive sheet initialization warning for ${rowData.spreadsheetId}:`, sheetErr.message);
      }
    }
    await appendGlobalActivityLog({
      id: `act-tm-${Date.now()}`,
      teamId: rowData.teamId,
      taskId: "TEAM_MGMT",
      action: existing ? `Updated team "${rowData.teamName}" (Status: ${rowData.status})` : `Created new team "${rowData.teamName}" (${rowData.teamId})`,
      user: user.email,
      timestamp: now
    });
    return res.status(200).json({
      success: true,
      data: rowData,
      message: existing ? "Team updated successfully." : "Team created successfully."
    });
  } catch (err) {
    console.error("Error in team management endpoint:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Team management operation failed."
    });
  }
}

// server/_handlers/admin/config.ts
async function handler9(req, res) {
  const method = req.method?.toUpperCase();
  if (!["GET", "PATCH"].includes(method || "")) {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }
  try {
    const user = await authenticateSession(req);
    if (method === "GET") {
      const config = await fetchAppConfig();
      return res.status(200).json({
        success: true,
        data: config
      });
    }
    enforceAdmin(user);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const body = parseJsonBody(req);
    const updated = await saveAppConfig(body, user.email);
    await appendGlobalActivityLog({
      id: `act-cfg-${Date.now()}`,
      teamId: "MASTER",
      taskId: "CONFIG_UPDATE",
      action: "Updated dashboard and application configuration settings",
      user: user.email,
      timestamp: new Date().toISOString()
    });
    return res.status(200).json({
      success: true,
      data: updated,
      message: "Configuration saved successfully."
    });
  } catch (err) {
    console.error("Error in config endpoint:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Configuration request failed."
    });
  }
}

// server/_handlers/admin/activity.ts
async function handler10(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    const limit = parseInt(String(req.query.limit || "50"), 10);
    const activity = await fetchGlobalActivityLog(limit);
    return res.status(200).json({
      success: true,
      data: activity
    });
  } catch (err) {
    console.error("Error fetching global activity:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to fetch activity log."
    });
  }
}

// server/_lib/sync.ts
function calculateTeamMetrics(tasks) {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      completionPercentage: 0,
      latestPendingTask: "No tasks assigned yet."
    };
  }
  const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);
  const completedTasks = sortedTasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage = Math.round(completedTasks / totalTasks * 100);
  let latestPendingTask = "All tasks completed.";
  const firstIncomplete = sortedTasks.find((t) => t.status !== "Completed");
  if (firstIncomplete) {
    latestPendingTask = firstIncomplete.title;
  }
  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    completionPercentage,
    latestPendingTask
  };
}
async function syncTeamProgress(teamId, teamName) {
  try {
    const tasks = await fetchTeamTasks(teamId);
    const metrics = calculateTeamMetrics(tasks);
    const spreadsheetId = await getTeamSpreadsheetId(teamId);
    let existingMeta = null;
    try {
      const overviews = await fetchMasterTeamOverview();
      existingMeta = overviews.find((o) => o.id === teamId);
    } catch {
    }
    const name = teamName || existingMeta?.name || `Team ${teamId.replace("team-", "")}`;
    const rowOverview = {
      teamId,
      teamName: name,
      spreadsheetId,
      totalTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      pendingTasks: metrics.pendingTasks,
      completionPercentage: metrics.completionPercentage,
      latestPendingTask: metrics.latestPendingTask,
      lastUpdated: new Date().toISOString(),
      status: existingMeta?.status || "Active",
      department: existingMeta?.department || "General",
      headEmail: existingMeta?.headEmail || "",
      description: existingMeta?.description || ""
    };
    let masterSynced = false;
    let syncError;
    try {
      await updateMasterTeamOverviewRow(rowOverview);
      masterSynced = true;
    } catch (err) {
      console.error(`Master overview sync failed for team ${teamId}:`, err);
      syncError = err?.message || "Failed to update Master spreadsheet";
    }
    return {
      teamId,
      totalTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      pendingTasks: metrics.pendingTasks,
      completionPercentage: metrics.completionPercentage,
      latestPendingTask: metrics.latestPendingTask,
      masterSynced,
      error: syncError
    };
  } catch (err) {
    console.error(`Error calculating/syncing team progress for ${teamId}:`, err);
    throw err;
  }
}
async function logActivity(teamId, taskId, action, performedBy, previousValue, newValue) {
  const timestamp = new Date().toISOString();
  const activityId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  try {
    await appendTeamActivityLog(teamId, {
      id: activityId,
      taskId,
      action,
      previousValue,
      newValue,
      performedBy,
      timestamp
    });
  } catch (err) {
    console.warn(`Failed to write to team activity log (${teamId}):`, err);
  }
  try {
    await appendGlobalActivityLog({
      id: activityId,
      teamId,
      taskId,
      action: `${action}: ${newValue || previousValue || taskId}`,
      user: performedBy,
      timestamp
    });
  } catch (err) {
    console.warn(`Failed to write to global activity log:`, err);
  }
}
async function reconcileAllTeams(teamMap) {
  const results = [];
  const teamIds = Object.keys(teamMap);
  for (const teamId of teamIds) {
    try {
      const res = await syncTeamProgress(teamId);
      results.push(res);
    } catch (err) {
      results.push({
        teamId,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionPercentage: 0,
        latestPendingTask: "Error reading tasks",
        masterSynced: false,
        error: err?.message || "Reconciliation failed"
      });
    }
  }
  return results;
}

// server/_handlers/admin/reconcile.ts
async function handler11(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const teamMap = getTeamSpreadsheetMap();
    const results = await reconcileAllTeams(teamMap);
    await appendGlobalActivityLog({
      id: `act-rec-${Date.now()}`,
      teamId: "ALL",
      taskId: "RECONCILIATION",
      action: `Triggered full synchronization across ${results.length} teams`,
      user: user.email,
      timestamp: new Date().toISOString()
    });
    return res.status(200).json({
      success: true,
      message: `Reconciled ${results.length} teams successfully.`,
      data: results
    });
  } catch (err) {
    console.error("Error during reconciliation:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Reconciliation failed."
    });
  }
}

// server/_handlers/teams/index.ts
async function handler12(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    const allTeams = await fetchMasterTeamOverview();
    if (user.role === "admin") {
      return res.status(200).json({
        success: true,
        data: allTeams
      });
    }
    const userTeams = allTeams.filter((t) => t.id === user.teamId);
    return res.status(200).json({
      success: true,
      data: userTeams
    });
  } catch (err) {
    console.error("Error fetching teams:", err.message);
    const status = err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to fetch teams."
    });
  }
}

// server/_handlers/teams/detail.ts
async function handler13(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    const teamId = String(req.query.teamId || "").trim();
    if (!teamId) {
      return res.status(400).json({ success: false, error: "Missing teamId parameter." });
    }
    enforceTeamAccess(user, teamId);
    const allTeams = await fetchMasterTeamOverview();
    const team = allTeams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: `Team ${teamId} not found.` });
    }
    return res.status(200).json({
      success: true,
      data: team
    });
  } catch (err) {
    console.error("Error fetching team overview:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to fetch team details."
    });
  }
}

// server/_handlers/teams/tasks.ts
async function handler14(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }
  try {
    const user = await authenticateSession(req);
    const teamId = String(req.query.teamId || "").trim();
    if (!teamId) {
      return res.status(400).json({ success: false, error: "Missing teamId parameter." });
    }
    enforceTeamAccess(user, teamId);
    const tasks = await fetchTeamTasks(teamId);
    const metrics = calculateTeamMetrics(tasks);
    const activity = await fetchTeamActivityLog(teamId, 25);
    return res.status(200).json({
      success: true,
      data: {
        teamId,
        tasks,
        metrics,
        activity
      }
    });
  } catch (err) {
    console.error("Error fetching team tasks:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to fetch team tasks."
    });
  }
}

// server/_handlers/tasks/index.ts
async function handler15(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const body = parseJsonBody(req);
    const teamId = String(body.teamId || "").trim();
    if (!teamId) {
      return res.status(400).json({ success: false, error: "teamId is required to create a task." });
    }
    const taskData = validateTaskInput(body);
    const existingTasks = await fetchTeamTasks(teamId);
    const now = new Date().toISOString();
    const cleanTeamNum = teamId.replace("team-", "");
    const taskId = `TASK-${cleanTeamNum}-${Date.now().toString().slice(-4)}`;
    const newTask = {
      id: taskId,
      title: taskData.title,
      description: taskData.description,
      assignedTo: taskData.assignedTo,
      priority: taskData.priority,
      deadline: taskData.deadline,
      status: taskData.status || "Pending",
      remarks: taskData.remarks || "",
      displayOrder: existingTasks.length + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: taskData.status === "Completed" ? now : void 0,
      category: taskData.category,
      isMandatory: taskData.isMandatory
    };
    await appendTaskRow(teamId, newTask);
    const syncResult = await syncTeamProgress(teamId);
    await logActivity(teamId, newTask.id, "TASK_CREATED", user.email, void 0, `Created task "${newTask.title}" (${newTask.priority})`);
    return res.status(201).json({
      success: true,
      data: {
        task: newTask,
        sync: syncResult
      }
    });
  } catch (err) {
    console.error("Error creating task:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to create task."
    });
  }
}

// server/_handlers/tasks/reorder.ts
async function handler16(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use PATCH." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const body = parseJsonBody(req);
    const teamId = String(body.teamId || "").trim();
    const orderedTaskIds = Array.isArray(body.orderedTaskIds) ? body.orderedTaskIds : [];
    if (!teamId || orderedTaskIds.length === 0) {
      return res.status(400).json({ success: false, error: "teamId and orderedTaskIds array are required." });
    }
    const existingTasks = await fetchTeamTasks(teamId);
    const taskMap = /* @__PURE__ */ new Map();
    existingTasks.forEach((t) => taskMap.set(t.id, t));
    const reordered = [];
    const now = new Date().toISOString();
    orderedTaskIds.forEach((id, index) => {
      const task = taskMap.get(id);
      if (task) {
        reordered.push({
          ...task,
          displayOrder: index + 1,
          updatedAt: now
        });
        taskMap.delete(id);
      }
    });
    taskMap.forEach((task) => {
      reordered.push({
        ...task,
        displayOrder: reordered.length + 1,
        updatedAt: now
      });
    });
    await batchUpdateTaskRows(teamId, reordered);
    const syncResult = await syncTeamProgress(teamId);
    await logActivity(teamId, "ALL", "TASKS_REORDERED", user.email, void 0, `Reordered ${reordered.length} tasks`);
    return res.status(200).json({
      success: true,
      data: {
        tasks: reordered,
        sync: syncResult
      }
    });
  } catch (err) {
    console.error("Error reordering tasks:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to reorder tasks."
    });
  }
}

// server/_handlers/tasks/item.ts
async function handler17(req, res) {
  const method = req.method?.toUpperCase();
  if (!["PATCH", "DELETE"].includes(method || "")) {
    return res.status(405).json({ success: false, error: "Method not allowed. Use PATCH or DELETE." });
  }
  try {
    const user = await authenticateSession(req);
    enforceAdmin(user);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const taskId = String(req.query.taskId || "").trim();
    const body = parseJsonBody(req);
    const teamId = String(body.teamId || req.query.teamId || "").trim();
    if (!taskId || !teamId) {
      return res.status(400).json({ success: false, error: "taskId and teamId parameters are required." });
    }
    const tasks = await fetchTeamTasks(teamId);
    const existingIndex = tasks.findIndex((t) => t.id === taskId);
    if (existingIndex === -1) {
      return res.status(404).json({ success: false, error: `Task ${taskId} not found in team ${teamId}.` });
    }
    const existingTask = tasks[existingIndex];
    if (method === "DELETE") {
      const remainingTasks = tasks.filter((t) => t.id !== taskId);
      const reindexed = remainingTasks.map((t, idx) => ({
        ...t,
        displayOrder: idx + 1
      }));
      await batchUpdateTaskRows(teamId, reindexed);
      const syncResult2 = await syncTeamProgress(teamId);
      await logActivity(teamId, taskId, "TASK_DELETED", user.email, existingTask.title, "Deleted");
      return res.status(200).json({
        success: true,
        message: `Task ${taskId} deleted successfully.`,
        data: { sync: syncResult2 }
      });
    }
    const taskData = validateTaskInput({ ...existingTask, ...body });
    const rowIndex = await findTaskRowIndex(teamId, taskId);
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: `Task row not found in sheet for ${taskId}.` });
    }
    const now = new Date().toISOString();
    const updatedTask = {
      ...existingTask,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      deadline: taskData.deadline,
      assignedTo: taskData.assignedTo,
      category: taskData.category,
      isMandatory: taskData.isMandatory,
      remarks: typeof body.remarks === "string" ? body.remarks.trim() : existingTask.remarks,
      updatedAt: now
    };
    await updateTaskRow(teamId, rowIndex, updatedTask);
    const syncResult = await syncTeamProgress(teamId);
    await logActivity(teamId, taskId, "TASK_EDITED", user.email, existingTask.title, updatedTask.title);
    return res.status(200).json({
      success: true,
      data: {
        task: updatedTask,
        sync: syncResult
      }
    });
  } catch (err) {
    console.error("Error modifying task:", err.message);
    const status = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to update/delete task."
    });
  }
}

// server/_handlers/tasks/status.ts
async function handler18(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use PATCH." });
  }
  try {
    const user = await authenticateSession(req);
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ success: false, error: "Invalid or missing CSRF token." });
    }
    const taskId = String(req.query.taskId || "").trim();
    const body = parseJsonBody(req);
    const teamId = String(body.teamId || "").trim();
    if (!taskId || !teamId) {
      return res.status(400).json({ success: false, error: "taskId and teamId are required." });
    }
    enforceWriteAccess(user, teamId);
    const { status, remarks } = validateStatusUpdate(body);
    const tasks = await fetchTeamTasks(teamId);
    const existingTask = tasks.find((t) => t.id === taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: `Task ${taskId} not found in team ${teamId}.` });
    }
    if (existingTask.status === "Completed" && status === "Pending") {
      const config = await fetchAppConfig();
      if (!config.appSettings.allowTeamHeadReopen && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Reopening completed tasks requires Super Administrator permission."
        });
      }
    }
    const rowIndex = await findTaskRowIndex(teamId, taskId);
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: `Task row not found in sheet for ${taskId}.` });
    }
    const now = new Date().toISOString();
    const isCompleted = status === "Completed";
    const updatedTask = {
      ...existingTask,
      status,
      remarks: remarks !== void 0 ? remarks : existingTask.remarks,
      updatedAt: now,
      completedAt: isCompleted ? existingTask.completedAt || now : void 0
    };
    await updateTaskRow(teamId, rowIndex, updatedTask);
    const syncResult = await syncTeamProgress(teamId);
    const actionDesc = isCompleted ? "Completed" : "Reopened";
    await logActivity(teamId, taskId, "STATUS_CHANGED", user.email, existingTask.status, status);
    if (remarks && remarks !== existingTask.remarks) {
      await logActivity(teamId, taskId, "REMARKS_UPDATED", user.email, existingTask.remarks, remarks);
    }
    return res.status(200).json({
      success: true,
      data: {
        task: updatedTask,
        metrics: {
          totalTasks: syncResult.totalTasks,
          completedTasks: syncResult.completedTasks,
          pendingTasks: syncResult.pendingTasks,
          completionPercentage: syncResult.completionPercentage,
          latestPendingTask: syncResult.latestPendingTask
        },
        sync: syncResult
      }
    });
  } catch (err) {
    console.error("Error updating task status:", err.message);
    const statusCode = err.message?.includes("Forbidden") ? 403 : err.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message || "Failed to update task status."
    });
  }
}

// server/index.ts
function extractRoutePath(req) {
  const query = req.query || {};
  let rawPath = "";
  if (typeof query.path === "string") {
    rawPath = query.path;
  } else if (Array.isArray(query.path)) {
    rawPath = query.path.join("/");
  }
  if (rawPath) {
    return rawPath.split("?")[0].replace(/^\/+|\/+$/g, "");
  }
  if (req.url) {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const qPath = parsed.searchParams.get("path");
      if (qPath) {
        return qPath.split("?")[0].replace(/^\/+|\/+$/g, "");
      }
      return parsed.pathname.replace(/^\/api\/?/, "").replace(/^\/+|\/+$/g, "");
    } catch {
      return req.url.replace(/^\/api\/?/, "").split("?")[0].replace(/^\/+|\/+$/g, "");
    }
  }
  return "";
}
async function handler19(req, res) {
  try {
    req.query = req.query || {};
    const path = extractRoutePath(req);
    if (!path || path === "health") {
      return res.status(200).json({
        success: true,
        service: "KRITI Tracker Unified Serverless API",
        status: "healthy",
        version: "1.0.0",
        plan: "Vercel Hobby Optimized (1 Function)",
        timestamp: new Date().toISOString()
      });
    }
    if (path === "auth/google") {
      return await handler(req, res);
    }
    if (path === "auth/dev-login") {
      return await handler2(req, res);
    }
    if (path === "auth/session") {
      return await handler3(req, res);
    }
    if (path === "auth/logout") {
      return await handler4(req, res);
    }
    if (path === "admin/dashboard") {
      return await handler5(req, res);
    }
    if (path === "admin/sync-status") {
      return await handler6(req, res);
    }
    if (path === "admin/users") {
      return await handler7(req, res);
    }
    if (path === "admin/teams") {
      return await handler8(req, res);
    }
    if (path === "admin/config") {
      return await handler9(req, res);
    }
    if (path === "admin/activity") {
      return await handler10(req, res);
    }
    if (path === "admin/reconcile") {
      return await handler11(req, res);
    }
    if (path === "teams") {
      return await handler12(req, res);
    }
    const teamTasksMatch = path.match(/^teams\/([^/]+)\/tasks$/);
    if (teamTasksMatch) {
      req.query.teamId = teamTasksMatch[1];
      return await handler14(req, res);
    }
    const teamDetailMatch = path.match(/^teams\/([^/]+)$/);
    if (teamDetailMatch) {
      req.query.teamId = teamDetailMatch[1];
      return await handler13(req, res);
    }
    if (path === "tasks") {
      return await handler15(req, res);
    }
    if (path === "tasks/reorder") {
      return await handler16(req, res);
    }
    const taskStatusMatch = path.match(/^tasks\/([^/]+)\/status$/);
    if (taskStatusMatch) {
      req.query.taskId = taskStatusMatch[1];
      return await handler18(req, res);
    }
    const taskItemMatch = path.match(/^tasks\/([^/]+)$/);
    if (taskItemMatch) {
      req.query.taskId = taskItemMatch[1];
      return await handler17(req, res);
    }
    return res.status(404).json({
      success: false,
      error: `Endpoint not found: /api/${path}`
    });
  } catch (err) {
    console.error("Unhandled Serverless Router Exception:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal Server Error"
    });
  }
}
export {
  handler19 as default
};
