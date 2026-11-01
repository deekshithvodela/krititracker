import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// Simple .env reader
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

async function verify() {
  console.log('🔍 Checking KRITI Tracker Google Sheets Connection...\n');

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const masterId = process.env.MASTER_SPREADSHEET_ID;

  if (!email || !key) {
    console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.');
    console.error('   Please check your .env or .env.local file.');
    process.exit(1);
  }

  key = key.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log(`✅ Authenticated as Service Account: ${email}`);

    if (!masterId) {
      console.warn('⚠️  MASTER_SPREADSHEET_ID is not set in environment.');
      return;
    }

    console.log(`🔄 Testing read access to Master Spreadsheet: ${masterId}...`);
    const masterRes = await sheets.spreadsheets.get({ spreadsheetId: masterId });
    console.log(`✅ Successfully connected to Master Spreadsheet: "${masterRes.data.properties?.title}"`);
    console.log(`   Sheets found: ${masterRes.data.sheets?.map(s => s.properties?.title).join(', ')}`);

    const teamEnv = process.env.TEAM_SPREADSHEET_IDS;
    if (teamEnv) {
      const teamMap = JSON.parse(teamEnv);
      const teamKeys = Object.keys(teamMap);
      console.log(`\n🔄 Found ${teamKeys.length} configured Team Spreadsheets. Testing connectivity...`);
      for (const tId of teamKeys.slice(0, 3)) { // test first 3
        const sId = teamMap[tId];
        try {
          const tRes = await sheets.spreadsheets.get({ spreadsheetId: sId });
          console.log(`   ✅ ${tId} -> "${tRes.data.properties?.title}" (${sId})`);
        } catch (err: any) {
          console.error(`   ❌ Failed to access ${tId} (${sId}):`, err.message);
        }
      }
      if (teamKeys.length > 3) {
        console.log(`   ... and ${teamKeys.length - 3} more team sheets configured.`);
      }
    }

    console.log('\n🎉 Verification completed successfully!');
  } catch (err: any) {
    console.error('❌ Connection verification failed:', err.message);
    process.exit(1);
  }
}

verify();
