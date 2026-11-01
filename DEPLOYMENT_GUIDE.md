# KRITI MedEvent Tracker — Production Deployment & Cloud Setup Guide

> **Author & Architect:** [Deekshith Vodela](https://www.linkedin.com/in/deekshithvodela/)  
> **Applicable Stack:** React 18, TypeScript, TailwindCSS, Vercel Serverless Functions, Google Sheets API v4, Google OAuth 2.0  
> **Target Audience:** System Administrators, DevOps Engineers, Congress Directors

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [The "Blank Sheet" Auto-Provisioning Engine (FAQ Answer)](#3-the-blank-sheet-auto-provisioning-engine)
4. [Google Cloud Platform (GCP) Configuration](#4-google-cloud-platform-gcp-configuration)
   - [Step 4.1: Create GCP Project](#step-41-create-gcp-project)
   - [Step 4.2: Enable Required APIs](#step-42-enable-required-apis)
   - [Step 4.3: Create Service Account & JSON Key](#step-43-create-service-account--json-key)
   - [Step 4.4: Configure OAuth 2.0 Client Credentials](#step-44-configure-oauth-20-client-credentials)
5. [Master Spreadsheet Database Initialization](#5-master-spreadsheet-database-initialization)
6. [Comprehensive Environment Variables Reference Table](#6-comprehensive-environment-variables-reference-table)
7. [Vercel Serverless Production Deployment](#7-vercel-serverless-production-deployment)
8. [Post-Deployment Smoke Test & Verification Checklist](#8-post-deployment-smoke-test--verification-checklist)
9. [Troubleshooting & Common Edge Cases](#9-troubleshooting--common-edge-cases)

---

## 1. Architecture Overview

KRITI MedEvent Tracker utilizes a **Serverless-to-Sheets** enterprise architecture:
- **Client (PWA):** Single Page Application hosted at the Vercel Edge with client-side RBAC guards and offline support.
- **Backend (API):** Vercel Serverless Functions (`/api/*`) executing Node.js 20 runtime, validating Google OAuth ID tokens, enforcing strict email whitelisting, and issuing HTTP-only `SameSite=Lax` session cookies.
- **Database (Google Sheets API v4):** 
  - **1 Master Spreadsheet:** Contains `Authorized_Users` (whitelist registry), `Team_Overview` (committee registry), `Global_Activity_Log` (immutable audit trail), and `App_Config` (event metadata).
  - **Committee Spreadsheets:** Independent spreadsheets per medical committee (e.g. Scientific, CME, Wet-Labs), auto-provisioned on demand.

```
+-------------------------------------------------------------------------+
|                              End User                                   |
+------------------------------------+------------------------------------+
                                     | (HTTPS / Browser)
                                     v
+------------------------------------+------------------------------------+
|                         Vercel Edge Platform                            |
|  +---------------------------+     +---------------------------------+  |
|  | Frontend Bundle (Vite)   |     | Serverless Functions (/api/*)   |  |
|  | - React 18, TailwindCSS   | <-> | - Google ID Token Validator     |  |
|  | - PWA Manifest & Icons    |     | - Email Whitelist Guard         |  |
|  | - CSRF Double-Submit      |     | - RBAC Committee Isolator       |  |
|  +---------------------------+     +---------------------------------+  |
+------------------------------------+------------------------------------+
                                     | (Service Account JWT Auth)
                                     v
+------------------------------------+------------------------------------+
|                       Google Cloud Platform                             |
|  +--------------------------------+  +-------------------------------+  |
|  | Google Sheets API v4 (Master)  |  | Google Sheets API v4 (Teams)  |  |
|  | - Authorized_Users (Whitelist) |  | - Tasks (14 Columns)          |  |
|  | - Team_Overview (Committees)   |  | - Activity_Log (Audit Trail)  |  |
|  | - Global_Activity_Log          |  | (Auto-Provisioned on demand)  |  |
|  +--------------------------------+  +-------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Prerequisites

Before starting deployment, ensure you possess:
1. **Google Account** with access to the [Google Cloud Console](https://console.cloud.google.com/).
2. **Google Drive** folder where your spreadsheets will reside.
3. **Vercel Account** ([vercel.com](https://vercel.com/)) with GitHub / GitLab repository linking.
4. **Node.js 20+** installed locally for running configuration and validation scripts.
5. **OpenSSL CLI** (or any cryptographic random bytes generator) for generating session secrets.

---

## 3. The "Blank Sheet" Auto-Provisioning Engine

### Question: *"Can I just add a blank sheet ID to the new sheet while creating and the app will take care of the rest?"*

### **Answer: YES! 100% Absolutely.**

KRITI MedEvent Tracker includes an **Automated Blank Sheet Auto-Provisioning Engine** built into the backend (`api/_lib/sheets.ts`). 

You do **NOT** need to manually build schema tabs, format columns, or copy-paste headers. The system automatically creates everything.

#### How It Works in 4 Steps:
1. **Create Blank Spreadsheet:** Go to [Google Drive](https://drive.google.com/) &rarr; click **+ New** &rarr; **Google Sheets** &rarr; **Blank spreadsheet**. Give it any title (e.g., `KRITI 2026 - Scientific Committee`).
2. **Share with Service Account:** Click **Share** (top right) &rarr; paste your Google Service Account email (e.g., `kriti-sheets-sa@your-project.iam.gserviceaccount.com`) &rarr; grant **Editor** permissions &rarr; click **Send / Share**.
3. **Copy Spreadsheet ID:** Copy the ID string from your browser address bar:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                      SPREADSHEET ID
   ```
4. **Paste into KRITI:** In the KRITI Super Admin Control Centre, click **+ Add Committee**, enter committee name, paste the Spreadsheet ID, and save.

#### What KRITI Automatically Provisions Behind the Scenes:
- Detects that the sheet is blank (lacks `Tasks` and `Activity_Log`).
- Sends a `batchUpdate` adding a **`Tasks`** tab with 14 standard columns:
  `Task ID`, `Task Title`, `Description`, `Assigned To`, `Priority`, `Deadline`, `Status`, `Remarks`, `Display Order`, `Created At`, `Updated At`, `Completed At`, `Category`, `Is Mandatory`.
- Adds an **`Activity_Log`** tab with 7 audit columns:
  `Log ID`, `Task ID`, `Action`, `Previous Value`, `New Value`, `Performed By`, `Timestamp`.
- If an administrator pastes a blank sheet ID and immediately accesses the committee dashboard, KRITI's resilient `fetchTeamTasks` catches the uninitialized state, auto-provisions both tabs instantly, and returns an empty task board ready for use.

---

## 4. Google Cloud Platform (GCP) Configuration

### Step 4.1: Create GCP Project
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top header &rarr; click **New Project**.
3. Name your project (e.g., `KRITI-MedEvent-Production`).
4. Click **Create** and ensure the new project is selected in the top bar.

### Step 4.2: Enable Required APIs
1. Open the left navigation menu &rarr; **APIs & Services** &rarr; **Library**.
2. In the search box, type `Google Sheets API` &rarr; click on it &rarr; click **Enable**.
3. Return to the Library &rarr; search for `Google Drive API` &rarr; click on it &rarr; click **Enable**.

### Step 4.3: Create Service Account & JSON Key
The Service Account allows the Vercel backend to read and write to your Google Spreadsheets autonomously without user prompts.

1. In GCP Console, navigate to **APIs & Services** &rarr; **Credentials**.
2. Click **+ Create Credentials** &rarr; select **Service account**.
3. Provide details:
   - **Service account name:** `kriti-sheets-service`
   - **Service account ID:** `kriti-sheets-service` (auto-filled)
   - **Description:** `Backend serverless access for KRITI MedEvent Tracker spreadsheets`
4. Click **Create and Continue**.
5. Role selection: Select **Project &rarr; Editor** (or leave unassigned since permissions are granted by sharing individual sheets).
6. Click **Done**.
7. Locate your newly created service account in the list &rarr; click on its email address.
8. Go to the **Keys** tab &rarr; click **Add Key** &rarr; **Create new key**.
9. Select **JSON** &rarr; click **Create**.
10. A `.json` private key file will download to your machine. **Store this file securely.**

> [!TIP]
> **Base64 Encoding Trick for Vercel (Avoids Broken Newlines):**  
> Google private keys contain multiline newline characters (`\n`). In Vercel, multiline variables often fail when pasted. Convert your entire downloaded JSON key file to a single Base64 string:
> ```bash
> base64 -w 0 <path-to-downloaded-key>.json
> ```
> Use this base64 string for the `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` environment variable.

### Step 4.4: Configure OAuth 2.0 Client Credentials
This enables the "Sign in with Google" button on the login screen.

1. In GCP Console, go to **APIs & Services** &rarr; **OAuth consent screen**.
2. Choose User Type:
   - **Internal:** Recommended if all congress staff belong to the same Google Workspace organization.
   - **External:** Required if staff use `@gmail.com` or different organizational domains.
3. Click **Create**.
4. Fill in basic app information:
   - **App name:** `KRITI MedEvent Tracker`
   - **User support email:** Your email address
   - **Developer contact information:** Your email address
5. Click **Save and Continue**.
6. **Scopes:** Click **Add or Remove Scopes** &rarr; select `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `openid` &rarr; click **Update** &rarr; click **Save and Continue**.
7. (If External) **Test Users:** Add test user emails while your app is in testing mode.
8. Navigate to **APIs & Services** &rarr; **Credentials**.
9. Click **+ Create Credentials** &rarr; select **OAuth client ID**.
10. Choose Application type: **Web application**.
11. Name: `KRITI Web Client`.
12. **Authorized JavaScript origins:**
    - `http://localhost:5173` (Local dev)
    - `http://localhost:4173` (Local preview)
    - `https://your-app-name.vercel.app` (Your production Vercel URL)
13. Click **Create**.
14. Note your **Client ID** (e.g., `123456789-abcdef.apps.googleusercontent.com`) and **Client Secret**.

---

## 5. Master Spreadsheet Database Initialization

The Master Spreadsheet holds global state, user access, and team registries.

### Automated Setup via CLI (Recommended):
Run the automated initialization script from the workspace root:
```bash
# 1. Ensure service account credentials are in .env
# 2. Run the automated sheet setup script
npm run setup-sheets
```
The script creates all required tabs (`Authorized_Users`, `Team_Overview`, `Global_Activity_Log`, `App_Config`), sets standard column headers, and seeds the initial admin user.

### Manual Setup (Alternative):
If creating the Master Spreadsheet manually:
1. Create a blank Google Sheet titled `KRITI - Master Database`.
2. Share with your Service Account email as **Editor**.
3. Create the following 4 tabs with exact header rows:
   - **`Authorized_Users` (Row 1):**
     `Email | Name | Role | Team_ID | Active | Added_By | Added_At | Last_Login`
   - **`Team_Overview` (Row 1):**
     `Team_ID | Team_Name | Spreadsheet_ID | Total_Tasks | Completed_Tasks | Pending_Tasks | Completion_Percentage | Latest_Pending_Task | Last_Updated | Status | Department | Head_Email | Description`
   - **`Global_Activity_Log` (Row 1):**
     `Log_ID | Team_ID | Task_ID | Action | User | Timestamp`
   - **`App_Config` (Row 1):**
     `Key | Value | Description | Updated_At`
4. In `Authorized_Users`, add your own email in Row 2 with Role: `admin`, Active: `TRUE`.

---

## 6. Comprehensive Environment Variables Reference Table

Configure these environment variables in your local `.env` and Vercel Project Settings:

| Variable Name | Environment | Where to Obtain / Value | Sensitive? | Purpose |
|---|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Client & Build | GCP Console &rarr; Credentials &rarr; OAuth 2.0 Client IDs | No | Enables Google Sign-In button in browser. |
| `GOOGLE_CLIENT_ID` | Serverless API | Same as `VITE_GOOGLE_CLIENT_ID` | No | Used on backend to verify ID token audience. |
| `GOOGLE_CLIENT_SECRET` | Serverless API | GCP Console &rarr; Credentials &rarr; OAuth 2.0 Client IDs | **YES** | OAuth client secret. |
| `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | Serverless API | Base64 string of downloaded service account JSON key: `base64 -w 0 key.json` | **YES** | **Recommended.** Authenticates backend to Google Sheets API without multiline newline issues. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Serverless API | Inside downloaded Service Account JSON (`client_email`) | No | Used as fallback if Base64 key not used. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Serverless API | Inside downloaded Service Account JSON (`private_key`) | **YES** | Used as fallback if Base64 key not used. |
| `MASTER_SPREADSHEET_ID` | Serverless API | Master Google Sheet URL ID (`/d/<ID>/edit`) | No | Primary registry for users, teams, and audits. |
| `SESSION_SECRET` | Serverless API | Generate with: `openssl rand -hex 32` | **YES** | 256-bit key used to sign encrypted HTTP-only session cookies. |
| `CSRF_SECRET` | Serverless API | Generate with: `openssl rand -hex 32` | **YES** | Secret key for double-submit CSRF tokens. |
| `INITIAL_ADMIN_EMAIL` | Serverless API | Your personal Google email address | No | Auto-whitelists you as Super Admin on first launch. |
| `NODE_ENV` | Serverless API | `production` | No | Enforces secure cookies (`Secure; SameSite=Lax`). |

---

## 7. Vercel Serverless Production Deployment

### Step 7.1: Connect Git Repository
1. Push your repository to GitHub or GitLab.
2. Log in to [Vercel](https://vercel.com/) &rarr; click **Add New...** &rarr; **Project**.
3. Import your `KRITI-tracker` repository.

### Step 7.2: Configure Build & Output Settings
- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Node.js Version:** `20.x`

### Step 7.3: Add Environment Variables in Vercel
Under **Environment Variables**, add each variable from Section 6.
- For `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`: Paste the raw base64 string directly.
- Check all environments (**Production**, **Preview**, **Development**).

### Step 7.4: Deploy & Domain Setup
1. Click **Deploy**. Vercel will build the frontend bundle and package the `/api` directory into Serverless Functions.
2. Once complete, copy your production domain (e.g. `https://kriti-tracker.vercel.app`).
3. Return to **GCP Console &rarr; Credentials &rarr; Your OAuth 2.0 Web Client**.
4. Add `https://kriti-tracker.vercel.app` to **Authorized JavaScript origins**.
5. Click **Save**.

---

## 8. Post-Deployment Smoke Test & Verification Checklist

Complete this checklist upon deployment:

- [ ] **Public Health Check:** Visit `https://your-domain.vercel.app/`. Page loads with branding, medical context, and "Sign in with Google".
- [ ] **Whitelist Notice:** Login page clearly displays: *"Only whitelisted emails are allowed access."*
- [ ] **Author Attribution:** Footer displays `© 2026 Deekshith Vodela` linking to LinkedIn profile.
- [ ] **MIT License Modal:** Clicking "MIT License" opens modal with full license terms.
- [ ] **Privacy Policy Modal:** Clicking "Privacy Policy" opens data disclosure modal; `/privacy` route renders standalone view.
- [ ] **Sign In Test (Admin):** Sign in with your `INITIAL_ADMIN_EMAIL`. Directed immediately to `/admin` dashboard.
- [ ] **Sign In Test (Unregistered):** Sign in with an unwhitelisted Google account. Directed to `/access-denied`.
- [ ] **Blank Sheet Auto-Provisioning Test:**
  - Create a new blank Google Sheet.
  - Share with Service Account as Editor.
  - In Admin Control Centre, add a test committee with the blank Sheet ID.
  - Verify `Tasks` and `Activity_Log` tabs are created automatically with headers.
- [ ] **PWA Audit:** Check Chrome DevTools &rarr; Application &rarr; Manifest & Icons load cleanly.
- [ ] **Social Share Card:** Share URL on LinkedIn or WhatsApp; verify rich preview card with glowing K logo appears.

---

## 9. Troubleshooting & Common Edge Cases

### Problem 1: "The caller does not have permission" (Google Sheets API 403)
- **Root Cause:** The Google Spreadsheet has not been shared with the Service Account email.
- **Fix:** Open the spreadsheet in Google Drive &rarr; click **Share** &rarr; paste the Service Account email (`...iam.gserviceaccount.com`) &rarr; assign **Editor** role &rarr; save.

### Problem 2: "Invalid credentials / error:0909006C:PEM routines:get_name:no start line"
- **Root Cause:** Multiline private key characters (`\n`) were corrupted when pasted into Vercel environment variables.
- **Fix:** Use `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` instead. Base64 encode the JSON key file using `base64 -w 0 key.json` and paste the clean single-line string into Vercel.

### Problem 3: "Access Denied: Email not whitelisted" for Congress Director
- **Root Cause:** The admin email was not added to `Authorized_Users` tab or `INITIAL_ADMIN_EMAIL` does not match the Google Account.
- **Fix:** Open the Master Spreadsheet &rarr; tab `Authorized_Users` &rarr; add a row with your email, Role: `admin`, Active: `TRUE`.

### Problem 4: "Google Sign-In Error: popup_closed_by_user or origin_mismatch"
- **Root Cause:** The production Vercel URL has not been added to Google OAuth Authorized JavaScript Origins.
- **Fix:** In GCP Console &rarr; Credentials &rarr; OAuth 2.0 Client &rarr; add `https://your-domain.vercel.app` to Authorized JavaScript Origins &rarr; wait 2 minutes for Google propagation.

---

## 10. Security & Compliance Disclosures
- **Scope Isolation:** Google OAuth scopes are strictly limited to `openid`, `email`, and `profile`.
- **Zero PHI:** KRITI MedEvent Tracker must never be used to store identifiable patient health records.
- **Cookie Security:** Session cookies use `HttpOnly; SameSite=Lax; Secure` flags.
- **Audit Logging:** Every administrative action and task status change is immutably appended to Google Sheets audit logs.

*For support, inquiries, or custom medical congress deployments, connect with [Deekshith Vodela on LinkedIn](https://www.linkedin.com/in/deekshithvodela/).*
