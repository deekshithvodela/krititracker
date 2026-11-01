import { google, drive_v3 } from 'googleapis';
import { resolveServiceAccountCredentials } from './sheets';

let driveClient: drive_v3.Drive | null = null;

/**
 * Returns authenticated Google Drive v3 client instance utilizing Service Account credentials.
 */
export function getGoogleDriveClient(): drive_v3.Drive {
  if (driveClient) {
    return driveClient;
  }

  const creds = resolveServiceAccountCredentials();

  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}


/**
 * Retrieves configured Google Drive folder ID, if defined.
 */
export function getDriveFolderId(): string | null {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  return folderId ? folderId.trim() : null;
}

/**
 * Automatically shares Google Drive folder with an authorized user email.
 * - 'writer' (Editor): For Super Admins and Team Heads
 * - 'reader' (Viewer): For Compliance Auditors / Viewers
 */
export async function shareDriveFolderWithUser(
  folderId: string,
  email: string,
  role: 'writer' | 'reader' = 'writer'
): Promise<{ id?: string | null; role: string }> {
  try {
    const drive = getGoogleDriveClient();
    const cleanEmail = email.toLowerCase().trim();

    // Check if user already has an existing permission on this folder
    const listRes = await drive.permissions.list({
      fileId: folderId,
      fields: 'permissions(id, role, emailAddress)',
    });

    const existing = (listRes.data.permissions || []).find(
      p => p.emailAddress?.toLowerCase() === cleanEmail
    );

    if (existing && existing.id) {
      if (existing.role !== role) {
        // Update existing permission
        await drive.permissions.update({
          fileId: folderId,
          permissionId: existing.id,
          requestBody: { role },
        });
        return { id: existing.id, role };
      }
      return { id: existing.id, role: existing.role || role };
    }

    // Create new permission
    const createRes = await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: false,
      requestBody: {
        type: 'user',
        role,
        emailAddress: cleanEmail,
      },
      fields: 'id, role',
    });

    return {
      id: createRes.data.id,
      role: createRes.data.role || role,
    };
  } catch (err: any) {
    console.error(`Failed to share Google Drive folder ${folderId} with ${email}:`, err.message);
    throw err;
  }
}

/**
 * Revokes Google Drive folder access for a specified user email.
 */
export async function removeDriveFolderUser(
  folderId: string,
  email: string
): Promise<boolean> {
  try {
    const drive = getGoogleDriveClient();
    const cleanEmail = email.toLowerCase().trim();

    const listRes = await drive.permissions.list({
      fileId: folderId,
      fields: 'permissions(id, emailAddress)',
    });

    const matching = (listRes.data.permissions || []).find(
      p => p.emailAddress?.toLowerCase() === cleanEmail
    );

    if (matching && matching.id) {
      await drive.permissions.delete({
        fileId: folderId,
        permissionId: matching.id,
      });
      return true;
    }

    return false;
  } catch (err: any) {
    console.error(`Failed to revoke Drive folder permission for ${email}:`, err.message);
    throw err;
  }
}

/**
 * Lists all active Google Spreadsheets located within the given Drive folder.
 */
export async function listSpreadsheetsInFolder(
  folderId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const drive = getGoogleDriveClient();
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 50,
    });

    return (res.data.files || []).map(f => ({
      id: f.id || '',
      name: f.name || 'Untitled Spreadsheet',
    }));
  } catch (err: any) {
    console.error(`Failed to list spreadsheets in folder ${folderId}:`, err.message);
    throw err;
  }
}
