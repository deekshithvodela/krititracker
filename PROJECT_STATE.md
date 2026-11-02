# Project State: Centralised Medical Congress & Healthcare Event Management System (KRITI MedEvent Tracker)

## Project Identity
- **Project Name:** KRITI MedEvent Tracker (Centralised Medical Congress & Healthcare Event Management System)
- **Purpose:** Production-ready full-stack web application tracking progress across 12 medical congress committees and clinical teams (dynamically extensible to any number of committees and sheets), with isolated committee checklists, prominent latest-pending-task workflow, administrative monitoring dashboard, dynamic Admin Control Centre, mandatory email whitelisting, interactive MIT License Modal, PWA offline support, and Google Sheets as the primary database.
- **Current Phase:** Phase 24 - GitHub Pages Static Hosting & Interactive Dev-Mail Demo Access Standard (Completed & Verified)
- **Repository Location:** `/home/drover/Projects/KRITI tracker copy`
- **Remote Repository:** [https://github.com/deekshithvodela/krititracker.git](https://github.com/deekshithvodela/krititracker.git)
- **Technology Stack:**
  - **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, React Router 6, PWA Service Worker & Manifest
  - **Backend:** Vercel Serverless Functions (`api/` directory), TypeScript, `googleapis`, `google-auth-library`, `jose` (secure JWT session cookies)
  - **Database:** 13+ Google Sheets (1 Master Spreadsheet + Arbitrary Number of Individual Committee Spreadsheets) with Automated Blank Sheet Auto-Provisioning Engine
  - **Authentication & RBAC:** Google OAuth 2.0 with strict server-side Email Whitelist verification against Master `Users` sheet on every request
  - **Testing Auth Bypass:** Zero-leak environment-gated test persona bypass with mock store for local QA & public interactive demo
  - **License & Legal:** MIT License (Copyright © 2026 Deekshith Vodela), Privacy Policy & Healthcare Compliance Modal, `/privacy` standalone route
  - **Brand & Assets:** Modern Squircle 'K' Monogram SVG, PWA Icon Suite (192, 512, maskable), Multi-Platform OpenGraph Suite (1200x630, 16:9, 4:3, 1:1) < 100 KB tier
  - **Deployment Targets:** GitHub Pages (`https://deekshithvodela.github.io/krititracker/`) & Vercel (SPA + Serverless APIs)

## Project Goal
Provide a reliable, responsive, and secure system where:
1. **PWA Support:** Installable as a Progressive Web App on mobile and desktop, with service worker offline shell caching, manifest, and compliance with PWA specifications.
2. **Open Source Licensing:** MIT License governing project distribution with author attribution to Deekshith Vodela.
3. **Mandatory Email Whitelisting:** Only explicitly whitelisted corporate emails can access the app.
4. **Dynamic Control Centre:** Super Admin management of teams, categories, widgets, and settings without modifying source code.
5. **Universal Task Creation:** Obvious "+ Add Task" buttons across Admin Dashboard, Team Dashboard, and table quick-actions.
6. **Dynamic Scaling to Any Number of Sheets & Teams:** Super Admins can add new teams and link them to independent Google Spreadsheets (`spreadsheetId`) directly from the UI.
7. **Automated Blank Sheet Auto-Provisioning:** Linking any blank Google Spreadsheet automatically provisions `Tasks` and `Activity_Log` tabs with standard column headers.
8. **Zero-Leak Test Bypass:** Effortless local testing and QA of all roles (Super Admin, Team Head, Viewer) without leaking bypass code or test credentials into production.
9. **Local Port Execution:** Live local running instance verified for testing.

## Current State
- Core full-stack application built and verified (`npm run build` PASS, 0 errors).
- 7-Vector Privacy & Personal Data Leak check executed: 0 leaks in `src/`, `api/`, or `dist/`.
- OWASP ASVS security baseline verified (cryptographic Google ID token verification, double-submit CSRF, HTTP-only cookies, RBAC).
- `DEPLOYMENT_GUIDE.md` created answering blank sheet auto-provisioning and detailing all environment variable sources.
- Brand logo SVG redesigned to match the UI's 'K' monogram; PWA icon suite regenerated.
- Multi-Platform OpenGraph suite generated within the strictly < 100 KB tier (43 KB – 65 KB).
- Privacy Policy modal and `/privacy` standalone page deployed.
- Preview server live on port 4173 serving updated assets with HTTP 200 OK.

## Core Decisions
| Decision | Reason | Status | Affected Area |
|---|---|---|---|
| Zero-Leak Auth Bypass | Enable QA & testing without live Google OAuth or sheets API while guaranteeing zero leak in production | Active | Auth / Testing |
| Dead-Code Elimination Guard | `import.meta.env.DEV \|\| import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'` ensures bypass code is completely pruned from production builds | Active | Build / Frontend |
| Backend Serverless Hard Tripwire | `/api/auth/dev-login` immediately returns 404 in production environment (`process.env.NODE_ENV === 'production'`) | Active | Security / API |
| Blank Sheet Auto-Provisioning | Allows administrators to create a blank Google Sheet in Drive, paste its ID, and let KRITI auto-create schema tabs | Active | Backend / Sheets |
| Base64 Service Account Key | Supports `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` to prevent multiline private key newline breakage on Vercel | Active | DevOps / Auth |
| Multi-Platform OpenGraph Tier | Enforce strictly < 100 KB (50–95 KB) across 1.91:1, 16:9, 4:3, and 1:1 aspect ratios | Active | Social / SEO |
| Standalone Service Worker & Manifest | Enable installability, home screen icon, and offline fallback | Active | PWA / Frontend |
| PWA Specification Compliance | Compliance with Google Search Central & PWA 192/512 maskable standard | Active | PWA / Assets |
| MIT License | Permissive open-source licensing requested by user | Active | Licensing / Legal |
| Local Server on Dedicated Port | Allow immediate interactive testing and DOM verification | Active | DevOps / Testing |
| Mandatory Email Whitelisting | Prevent unauthorized Google accounts from gaining access | Active | Auth Layer |
| Request-time Authorization Revalidation | Ensures deactivated or role-changed users lose access immediately | Active | Security / API |
| Master `Configuration` Sheet | Allows Super Admin to configure widgets, categories, and settings without code changes | Active | Data / Config |

## Constraints
- Zero leak of test bypass code, developer paths, or credentials to production.
- PWA icons must adhere to safe-zone maskable padding and standard 192x192 / 512x512 resolutions.
- OpenGraph images must strictly adhere to the < 100 KB tier.
- Must run cleanly on local port for user testing.
- Stay inside workspace `/home/drover/Projects/KRITI tracker`.
- Do not run mutating git commands without explicit per-prompt user instruction.

## Completed Milestones
- [x] Initial project requirements review and architecture definition.
- [x] Dependencies installed and build tooling configured.
- [x] Data models, server types, and validation schemas implemented.
- [x] Google Sheets API integration, sync engine, and CSRF protection implemented.
- [x] Serverless endpoints for Auth, Teams, Tasks, Admin, Dynamic Config, and Teams created.
- [x] Frontend design system, Navbar, AppShell, Checklist, and Dashboard components created.
- [x] Mandatory Email Whitelisting implemented with request-time revalidation.
- [x] Dynamic Admin Control Centre implemented.
- [x] Automated setup & connectivity scripts implemented.
- [x] Production build and verification audit passed (`npm run build`, `report.md`).
- [x] MIT License added (`LICENSE` file and `README.md`).
- [x] PWA Manifest, Service Worker (`sw.js`), 192/512 maskable icons, and Apple touch icons implemented.
- [x] Local server launched on port 4173 and verified responding HTTP 200 OK.
- [x] Phase 8: Zero-Leak Testing Auth Bypass & Local Test Sandbox implemented, verified with 5/5 passing tests, and documented.
- [x] Phase 9: Universal "Add Task" Accessibility & Dynamic Scaling for Any Number of Teams/Sheets implemented, tested, and verified.
- [x] Phase 10: "Team not found" Resolution, UI Glitch Fixes & Mobile Experience Optimization implemented, tested, and verified.
- [x] Phase 11: Universal Task Expand Button & Rich Deliverable Details Drawer implemented, tested, and verified.
- [x] Phase 12: Whitelist Login Access Notice, Deekshith Vodela Copyright & LinkedIn Link, Interactive MIT License Modal & Medical Event Transformation implemented, tested, and verified.
- [x] Phase 14: Comprehensive Production Quality Audit, 7-Vector Privacy Leak Check, OWASP Security Baseline, Brand Logo SVG Redesign, Multi-Platform OpenGraph Suite & Deployment Guide Verification implemented, tested, and verified.
- [x] Phase 15: Footer Isolation to Login Page, Zero-CLS Two-Tier Navigation (Canonify Arrangement), Mobile Viewport UI/UX Polish, ServiceWorker Syntax Fix & Git Repository Documentation Overhaul implemented, tested, and verified.
- [x] Phase 16: Mobile UI/UX Industry Standard Overhaul — Zero Layout Shift, Natural Word-Wrapping, and Decluttered Arrangement implemented, tested, and verified.
- [x] Phase 17: Branding Refinement & Mobile Hamburger Menu Decluttering (Removed MedEvent, updated to Kakatiya Research Initiative for Transformative Innovation, removed legal modals from mobile drawer) implemented, tested, and verified.

- [x] Phase 20: Vercel Serverless Function Crash Fix (`FUNCTION_INVOCATION_FAILED`), Standalone Single Production Bundle via `esbuild` (`api/index.js`), Hardened Router Exception Trapping, and Client Non-JSON Error Surfacing.
- [x] Phase 21: Bulletproof Private Key Sanitizer (`sanitizePrivateKey`) with Regex PEM Extraction and Unified Multi-Format Credentials Resolver (`resolveServiceAccountCredentials`).
- [x] Phase 22: Resilient Master Spreadsheet Tab Auto-Discovery, Multi-Schema Reconciliation (`Users` vs `Authorized_Users`), and Automated Master Spreadsheet Provisioning Engine.
- [x] Phase 23: Direct Role-Based Workspace Routing, Resilient TEAM_SPREADSHEET_IDS JSON Parser, Committee Task Management Permissions & Auto-Populated Teams Dashboard.
- [x] Phase 24: GitHub Pages Static Hosting & Interactive Dev-Mail Demo Access Standard (Remote reset, Vite base, SPA 404, Dev-Mail showcase, mock task CRUD, PWA scope, and GitHub Actions deploy pipeline).

## In Progress
- Completed Phase 24. Verified across all test suites, ready for user review and approval to commit and push.

## Verification Status
- Phase 24 Verification Suite: `PASS (6/6 tests)` (`npm run test:phase24`)
- Remote Target Origin: `PASS` (`https://github.com/deekshithvodela/krititracker.git`)
- Dev-Mail Authentication: `PASS` (Admin, Scientific Head, CME Workshops, Auditor, and dynamic custom viewer email)
- Mock Task CRUD: `PASS` (`createTask`, `editTask`, `deleteTask` with metrics recalculation)
- GitHub Pages Static Build: `PASS` (`npm run build:pages` in 2.72s, valid asset prefix `/krititracker/`)
- TypeScript Compilation: `PASS (0 errors)` (`npm run lint`)
- Zero-Leak Dev Persona Tests: `PASS (5/5 tests)` (`npm run test:dev-login`)
- Phase 20 Serverless Tests: `PASS (7/7 tests)` (`npm run test:phase20`)
- Audit Trail: `PASS` (`report.md` Section 20)

## Completed
- **Phase 24:** GitHub Pages Static Hosting & Interactive Dev-Mail Demo Access Standard.

## Open Issues
- None. Ready for user explicit authorization to commit and push to remote.

## Next Direction
- Await user explicit authorization before executing `git commit` and `git push`.





