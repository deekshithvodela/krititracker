# KRITI MedEvent Tracker: Centralised Medical Congress & Healthcare Event Management System

A production-ready, full-stack responsive web application tracking progress across 12 clinical congress committees and teams (dynamically extensible beyond 12), with isolated medical committee checklists, prominent latest-pending-task workflow, executive administrative monitoring dashboard, Dynamic Admin Control Centre, mandatory email whitelisting, interactive MIT License Modal, and Google Sheets as the primary database.

> [!IMPORTANT]
> **Production Deployment Guide:** For an end-to-end cloud setup guide (Google Cloud Console, Service Account JSON key, OAuth Client ID, Vercel deployment, and automated blank sheet auto-provisioning), see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## 🌟 Key Highlights & Features

1. **13+ Independent Google Sheets Database:**
   - **1 Master Spreadsheet:** Contains `Team_Overview`, `Users` (Authorised User Whitelist), `Global_Activity`, and `Configuration` (Dynamic Settings).
   - **12+ Individual Committee Spreadsheets:** Each contains a dedicated `Tasks` sheet (with clinical priority, deadline, status, category, and mandatory flag) and an `Activity_Log` audit sheet.
   - Zero reliance on `IMPORTRANGE` — synchronisation is performed atomically by the backend via Google Sheets API v4.
2. **Mandatory Email Whitelisting:**
   - Google Sign-In is required, but successful Google authentication alone **never** grants access.
   - Tokens are validated server-side (signature, audience, issuer, expiration, and `email_verified === true`).
   - Only pre-authorized emails in the Master `Users` spreadsheet can obtain an authenticated session.
   - Revalidated on **every authenticated backend request** — deactivated or revoked accounts lose access immediately.
   - Dedicated Access Denied screen for unwhitelisted accounts with zero public self-registration.
3. **Executive Admin Dashboard:**
   - Centralised visibility across all 12 medical event committees.
   - Real-time progress bars, completed vs. pending tasks, latest pending item, and overdue indicators.
   - Quick filters (All, In Progress, Completed, Not Started, Overdue) and instant search.
   - Global Activity audit trail and Google Sheets connection health check with 1-click **Force Reconcile**.
4. **Individual Medical Committee Dashboards:**
   - High-impact **Latest Pending Task Hero Card** prioritising what to execute next with 1-click completion.
   - Interactive checklist ordered by display order with touch-friendly controls (>= 44px).
   - Priority badges (Critical, High, Medium, Low), category tags, overdue warnings, and remarks popover.
   - Optimistic UI updates with rollback on network failure.
5. **Dynamic Admin Control Centre:**
   - **Team Management:** Create, rename, activate, deactivate, archive, and assign team heads beyond the initial 12 teams without modifying source code.
   - **Checklist Categories:** Manage task categories and sections.
   - **Dashboard Customisation:** Toggle visibility of KPI metrics, team overview table, activity stream, and sync health widgets.
   - **Application Governance:** Configure company branding, announcement broadcasts, and task reopen policies.
6. **Strict Role-Based Access Control (RBAC):**
   - **Super Admin:** Access to all teams, task creation/editing/deletion, drag-and-drop reordering, user whitelist management, control centre, and reconciliation.
   - **Team Head:** Strictly restricted to their assigned team. Cross-team requests are blocked with 403 Forbidden.
   - **Viewer:** Read-only access to their assigned team.
   - Secure HTTP-only, SameSite=Lax, Secure signed JWT session cookies and CSRF double-submit protection.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["Client Browser (React SPA + Vite + Tailwind + shadcn/ui)"]
    subgraph VercelServerless["Vercel Serverless Functions (/api)"]
        AuthMiddleware["Auth & Whitelist Revalidation Middleware"]
        AuthRoutes["/api/auth (Google Sign-In, Session, Logout)"]
        TeamRoutes["/api/teams (Get Teams, Overview, Tasks)"]
        TaskRoutes["/api/tasks (Status Toggle, CRUD, Drag-and-Drop Reorder)"]
        AdminRoutes["/api/admin (Dashboard, Users, Activity, Sync/Reconcile)"]
        ControlCentreRoutes["/api/admin/config & /api/admin/teams"]
        SyncEngine["Synchronisation Engine (Batch & Progress Compute)"]
    end
    subgraph GoogleSheets["Google Sheets Database (13+ Spreadsheets)"]
        MasterSheet["Master Spreadsheet\n• Team_Overview\n• Users (Authorised Whitelist)\n• Global_Activity\n• Configuration (Dynamic Settings)"]
        TeamSheet1["Team 01 Spreadsheet\n• Tasks\n• Activity_Log"]
        TeamSheetN["Team 02..N Spreadsheets\n• Tasks\n• Activity_Log"]
    end

    Client -->|HTTPS + Cookies + CSRF| AuthMiddleware
    AuthMiddleware -->|Revalidate Email Whitelist on Every Request| MasterSheet
    AuthMiddleware --> AuthRoutes
    AuthMiddleware --> TeamRoutes
    AuthMiddleware --> TaskRoutes
    AuthMiddleware --> AdminRoutes
    AuthMiddleware --> ControlCentreRoutes
    TaskRoutes --> SyncEngine
    AdminRoutes --> SyncEngine
    ControlCentreRoutes --> SyncEngine
    SyncEngine -->|Google Sheets API v4| MasterSheet
    SyncEngine -->|Google Sheets API v4| TeamSheet1
    SyncEngine -->|Google Sheets API v4| TeamSheetN
```

---

## 📁 Repository Structure

```
KRITI tracker/
├── api/                          # Vercel Serverless API Functions
│   ├── _lib/                     # Server-side shared utilities & services
│   │   ├── auth.ts               # Google auth, Whitelist revalidation, JWT cookie session & RBAC
│   │   ├── csrf.ts               # CSRF protection (double-submit constant-time check)
│   │   ├── sheets.ts             # Google Sheets API client, batch helpers, & data models
│   │   ├── sync.ts               # Synchronisation engine: recalculate progress, next task & logs
│   │   ├── validation.ts         # Server-side request schema validation
│   │   └── types.ts              # Server-side TypeScript interfaces
│   ├── auth/
│   │   ├── google.ts             # POST /api/auth/google
│   │   ├── session.ts            # GET /api/auth/session
│   │   └── logout.ts             # POST /api/auth/logout
│   ├── teams/
│   │   ├── index.ts              # GET /api/teams
│   │   └── [teamId]/
│   │       ├── index.ts          # GET /api/teams/[teamId]
│   │       └── tasks.ts          # GET /api/teams/[teamId]/tasks
│   ├── tasks/
│   │   ├── index.ts              # POST /api/tasks (Admin create task)
│   │   ├── [taskId]/
│   │   │   ├── index.ts          # PATCH, DELETE /api/tasks/[taskId]
│   │   │   └── status.ts         # PATCH /api/tasks/[taskId]/status (Toggle status/remarks)
│   │   └── reorder.ts            # PATCH /api/tasks/reorder (Drag-and-drop task reordering)
│   └── admin/
│       ├── dashboard.ts          # GET /api/admin/dashboard
│       ├── activity.ts           # GET /api/admin/activity
│       ├── users.ts              # GET, POST, PATCH, DELETE /api/admin/users (Whitelist management)
│       ├── sync-status.ts        # GET /api/admin/sync-status
│       ├── reconcile.ts          # POST /api/admin/reconcile
│       ├── config.ts             # GET, PATCH /api/admin/config (Dynamic dashboard & settings)
│       └── teams.ts              # POST, PATCH /api/admin/teams (Create, rename, archive teams)
├── scripts/                      # Setup & administration CLI utilities
│   ├── setup-sheets.ts           # Automated 13+ sheet bootstrapper & schema validator
│   └── verify-connection.ts      # Verifies service account credentials & sheet access
├── src/                          # React SPA Client
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Button, Card, Modal, Badge, Tabs, Input, Select, Skeleton
│   │   ├── layout/               # Navbar, AppShell
│   │   ├── checklist/            # ChecklistItem, LatestPendingHero, TaskFormModal, RemarksModal
│   │   ├── dashboard/            # MetricCard, TeamOverviewTable, ActivityFeed, SyncHealthCard
│   │   ├── control-centre/       # TeamManager, CategoryManager, WidgetCustomiser, AppSettingsForm
│   │   └── common/               # ProtectedRoute
│   ├── pages/                    # Application Views
│   │   ├── Login.tsx             # Google Sign-In with whitelist error feedback
│   │   ├── AdminDashboard.tsx    # Centralised Admin Dashboard
│   │   ├── AdminControlCentre.tsx# Dynamic Admin Control Centre
│   │   ├── TeamDashboard.tsx     # Team Head / Assigned Team Checklist view
│   │   ├── UserManagement.tsx    # Authorised Email Registry & Whitelist Manager
│   │   ├── AccessDenied.tsx      # Dedicated 403 Access Denied screen for unwhitelisted emails
│   │   └── NotFound.tsx          # 404 Not Found page
│   ├── hooks/                    # Custom React hooks (useAuth, useConfig)
│   ├── services/                 # Strongly typed HTTP client with credentials & CSRF
│   ├── types/                    # Shared TypeScript types
│   ├── utils/                    # Client-side calculations, formatting & badge helpers
│   ├── styles/                   # Tailwind CSS tokens & custom styling
│   ├── App.tsx                   # Main Router & Role Guards
│   └── main.tsx                  # React Entry point
├── public/                       # Static public assets (logos, icons)
├── .env.example                  # Documented environment variables template
├── package.json                  # Scripts & dependencies
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite build & local API proxy configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── vercel.json                   # Vercel deployment routes & serverless function config
└── PROJECT_STATE.md              # Semantic project state & continuity
```

---

## 🚀 Setup & Installation Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- A **Google Cloud Platform (GCP)** account
- A **Google Drive** folder or workspace to host the 13 Google Spreadsheets

---

### 2. Google Cloud Setup

#### Step A: Create a Google Cloud Project & Enable APIs
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `KRITI-Tracker` (or your preferred name).
3. Navigate to **APIs & Services > Library**.
4. Search for **Google Sheets API** and click **Enable**.

#### Step B: Create a Service Account for Google Sheets
1. Navigate to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**.
   - Name: `kriti-sheets-sa`
   - Description: `Service account for KRITI Tracker Google Sheets backend`
3. Click **Create and Continue**, then click **Done**.
4. Click on the created service account, go to the **Keys** tab, and click **Add Key > Create new key**.
5. Select **JSON** and download the key file.
6. Note the `client_email` (e.g. `kriti-sheets-sa@your-gcp-project.iam.gserviceaccount.com`) and `private_key`.

#### Step C: Create Google OAuth 2.0 Client ID (for Google Sign-In)
1. In Google Cloud Console, navigate to **APIs & Services > Credentials**.
2. If prompted, configure the **OAuth consent screen** (User Type: Internal or External, App name: `KRITI Tracker`, User support email).
3. Click **Create Credentials > OAuth client ID**.
4. Application type: **Web application**.
5. Authorized JavaScript origins:
   - For local development: `http://localhost:5173`
   - For production: `https://your-app.vercel.app`
6. Copy the generated **Client ID** and **Client Secret**.

---

### 3. Google Sheets Setup

You need **13 independent spreadsheets**:
1. **1 Master Spreadsheet**
2. **12 Individual Team Spreadsheets** (for Team 01 through Team 12)

#### Step A: Create the Spreadsheets
1. In Google Drive, create a folder named `KRITI Tracker Database`.
2. Create 1 spreadsheet named `KRITI - Master Spreadsheet`.
3. Create 12 spreadsheets named `KRITI - Team 01 (Engineering)`, `KRITI - Team 02 (Product)`, ..., `KRITI - Team 12 (Operations)`.
4. Copy the Spreadsheet ID from the URL of each sheet:
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

#### Step B: Share All 13 Spreadsheets with the Service Account
1. Open each of the 13 spreadsheets.
2. Click the **Share** button in the top right.
3. Paste the Service Account email address (`kriti-sheets-sa@...iam.gserviceaccount.com`).
4. Set permissions to **Editor** and uncheck "Notify people", then click **Share**.

---

### 4. Local Environment Configuration

1. Clone or copy the project into your local workspace.
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Populate the variables in `.env.local`:
   ```env
   # Google OAuth Client
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

   # Service Account Credentials
   GOOGLE_SERVICE_ACCOUNT_EMAIL="kriti-sheets-sa@your-project.iam.gserviceaccount.com"
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"

   # Master Spreadsheet ID
   MASTER_SPREADSHEET_ID="your_master_spreadsheet_id_here"

   # JSON Mapping of 12 Team IDs to their respective Spreadsheet IDs
   TEAM_SPREADSHEET_IDS='{
     "team-01": "id_for_team_01",
     "team-02": "id_for_team_02",
     "team-03": "id_for_team_03",
     "team-04": "id_for_team_04",
     "team-05": "id_for_team_05",
     "team-06": "id_for_team_06",
     "team-07": "id_for_team_07",
     "team-08": "id_for_team_08",
     "team-09": "id_for_team_09",
     "team-10": "id_for_team_10",
     "team-11": "id_for_team_11",
     "team-12": "id_for_team_12"
   }'

   # Security & Session
   SESSION_SECRET="generate-a-strong-32-byte-hex-random-session-secret"
   INITIAL_ADMIN_EMAIL="admin@yourcompany.com"
   ```

---

### 5. Automated Setup & Verification Scripts

We provide two automated Node/TypeScript scripts:

#### Verify Service Account & Sheet Accessibility
```bash
npm run verify-connection
```
This tests authentication with Google Cloud and confirms read access to the Master Spreadsheet and Team Spreadsheets.

#### Bootstrap & Format All 13 Spreadsheets
```bash
npm run setup-sheets
```
This automatically:
- Creates required sheets in Master (`Team_Overview`, `Users`, `Global_Activity`, `Configuration`).
- Sets up bold headers, frozen rows, and default settings.
- Formats `Tasks` and `Activity_Log` sheets across all 12 team sheets.
- Seeds realistic initial tasks with categories, priorities, deadlines, and mandatory flags.
- Whitelists the `INITIAL_ADMIN_EMAIL` in the `Users` sheet as Super Admin.
- Performs initial synchronization of `Team_Overview` in the Master Spreadsheet.

---

### 6. Running Locally

```bash
# Start frontend Vite development server
npm run dev
```

For testing Serverless API functions locally, install and run Vercel CLI:
```bash
npm install -g vercel
vercel dev
```

---

### 7. Deploying to Vercel

1. Push the code to your GitHub repository.
2. Open the [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
3. Import your GitHub repository.
4. Framework Preset: **Vite**.
5. Build and Output Settings: default (`npm run build`, output: `dist`).
6. In **Environment Variables**, add all keys from `.env.example`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `VITE_GOOGLE_CLIENT_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (ensure newlines are preserved, or use `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`)
   - `MASTER_SPREADSHEET_ID`
   - `TEAM_SPREADSHEET_IDS`
   - `SESSION_SECRET`
   - `INITIAL_ADMIN_EMAIL`
7. Click **Deploy**.
8. After deployment, update your Google Cloud Console OAuth Client ID to include your production Vercel URL (e.g. `https://kriti-tracker.vercel.app`) under **Authorized JavaScript Origins**.

For the detailed, step-by-step walkthrough with screenshots, blank sheet auto-provisioning instructions, and troubleshooting edge cases, refer to the full [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## 🔒 Security & Access Control

| Requirement | Implementation Details |
|---|---|
| **Google Sign-In** | Google OAuth 2.0 with ID token verification via `google-auth-library`. |
| **Mandatory Whitelist** | Checked against `Users` sheet in Master Spreadsheet. Unlisted accounts are rejected with 403 Forbidden. |
| **Request-time Revalidation** | Every authenticated request verifies that the user is STILL in the whitelist and active. |
| **Strict Team Isolation** | Team heads can only query or mutate their assigned `teamId`. Server returns 403 Forbidden on foreign team access. |
| **PWA & Offline Shell** | Web App Manifest (`manifest.webmanifest`), Service Worker (`sw.js`), 192/512 maskable icons, and offline caching. |

---

## 📱 Progressive Web App (PWA)

KRITI Tracker is a fully compliant Progressive Web App:
- **Mobile & Desktop Installation:** Can be installed directly to home screens and desktops with standalone window display.
- **Service Worker (`sw.js`):** Employs network-first strategy for navigation and stale-while-revalidate for static assets, with secure bypass for live Google Sheets API calls.
- **Specification Compliance:** Adheres to multi-platform icon guidelines with safe-zone maskable 512x512 icons, Apple touch icons, and Google Search Central 48x48 favicons.

---

## 🧪 Local Testing & Zero-Leak Auth Bypass

KRITI Tracker includes a local development and QA testing sandbox that enables full end-to-end testing across all roles without requiring live Google Cloud OAuth credentials or Google Sheets API keys.

### Zero-Leak Guarantee
1. **Dead-Code Elimination:** All testing bypass UI and mock handlers are strictly compiled out in production builds unless `VITE_ENABLE_DEV_LOGIN="true"` is explicitly set during build.
2. **Serverless Tripwire:** `/api/auth/dev-login` immediately throws `404 Not Found` in production (`NODE_ENV === 'production'` or `VERCEL_ENV === 'production'`).
3. **Automated Verification:** Run `npm run test:dev-login` to execute the 5-point production tripwire test suite.

### Available Test Personas
- 👑 **Congress Director (`admin.qa@company.com`)**: Full access to all 12 medical committees, Admin Dashboard, Admin Control Centre, and User Management.
- 🩺 **Scientific Committee Head (`lead.eng@company.com`)**: Assigned to Team 01 (Scientific Committee & Medical Abstracts); can complete tasks and update clinical remarks.
- 💉 **Clinical CME Director (`lead.ops@company.com`)**: Assigned to Team 02 (Clinical Workshops & CME Accreditation); tests cross-committee RBAC isolation.
- 👁️ **Medical Ethics Auditor (`auditor.qa@company.com`)**: Read-only viewer across committees; tests mutation prevention guards.

### Testing Locally
1. Run local preview server:
   ```bash
   npm run preview -- --port 4173 --host 0.0.0.0
   ```
2. Open `http://localhost:4173` in your browser.
3. On the login screen, click any persona in the **🧪 QA Testing Auth Bypass** panel to enter the app.
4. Use the **🧪 Persona Switcher** in the top navigation bar to test role switching and RBAC boundaries in real time.

---

## 📄 License & Attribution

This project is open-source and licensed under the [MIT License](LICENSE).

Copyright © 2026 [Deekshith Vodela](https://www.linkedin.com/in/deekshithvodela/) and KRITI Tracker Contributors.

